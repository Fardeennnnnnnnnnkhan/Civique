import 'dotenv/config';
import { randomUUID } from 'crypto';
import { strict as assert } from 'assert';
import { Pool } from 'pg';
import { JobLeaseLostError, claimJob, completeJob, failJob, markExhaustedJobsDead } from './queue';

function assertSafeDatabase(rawUrl: string | undefined): string {
  if (!rawUrl) throw new Error('DATABASE_URL is required');
  const url = new URL(rawUrl);
  const database = url.pathname.replace(/^\//, '');
  const localHost = ['localhost', '127.0.0.1', '::1'].includes(url.hostname);
  if (!localHost || !database.endsWith('_test')) {
    throw new Error('Queue integration tests require a local database whose name ends with _test');
  }
  return rawUrl;
}

async function insertJob(pool: Pool, maxAttempts: number): Promise<string> {
  const id = randomUUID();
  await pool.query(
    `INSERT INTO jobs (id,type,payload,status,attempts,max_attempts,available_at,created_at,updated_at)
     VALUES ($1::uuid,'M1_QUEUE_TEST','{}'::jsonb,'QUEUED',0,$2,NOW(),NOW(),NOW())`,
    [id, maxAttempts],
  );
  return id;
}

async function run() {
  const pool = new Pool({ connectionString: assertSafeDatabase(process.env.DATABASE_URL), max: 3, application_name: 'civique-m1-queue-test' });
  const ids: string[] = [];
  try {
    const leaseJobId = await insertJob(pool, 3);
    ids.push(leaseJobId);
    const firstClaim = await claimJob(pool, 'worker-old', 1_000);
    assert.equal(firstClaim?.id, leaseJobId);
    await assert.rejects(() => completeJob(pool, leaseJobId, 'worker-other'), JobLeaseLostError);

    await pool.query(`UPDATE jobs SET locked_at=NOW() - INTERVAL '2 seconds' WHERE id=$1::uuid`, [leaseJobId]);
    const recovered = await claimJob(pool, 'worker-new', 1_000);
    assert.equal(recovered?.id, leaseJobId);
    assert.equal(recovered?.attempts, 2);
    await assert.rejects(() => completeJob(pool, leaseJobId, 'worker-old'), JobLeaseLostError);
    await completeJob(pool, leaseJobId, 'worker-new');
    const completed = await pool.query<{ status: string; attempts: number }>(`SELECT status,attempts FROM jobs WHERE id=$1::uuid`, [leaseJobId]);
    assert.deepEqual(completed.rows[0], { status: 'SUCCEEDED', attempts: 2 });

    const retryJobId = await insertJob(pool, 2);
    ids.push(retryJobId);
    const retryOne = await claimJob(pool, 'worker-retry', 1_000);
    assert.equal(retryOne?.id, retryJobId);
    await failJob(pool, retryOne!, new Error('retryable'), 'worker-retry');
    await pool.query(`UPDATE jobs SET available_at=NOW() WHERE id=$1::uuid`, [retryJobId]);
    const retryTwo = await claimJob(pool, 'worker-retry', 1_000);
    assert.equal(retryTwo?.attempts, 2);
    await failJob(pool, retryTwo!, new Error('terminal'), 'worker-retry');
    const dead = await pool.query<{ status: string; attempts: number }>(`SELECT status,attempts FROM jobs WHERE id=$1::uuid`, [retryJobId]);
    assert.deepEqual(dead.rows[0], { status: 'DEAD_LETTER', attempts: 2 });

    const activeFinalAttemptId = await insertJob(pool, 1);
    ids.push(activeFinalAttemptId);
    const activeFinalAttempt = await claimJob(pool, 'worker-final-attempt', 1_000);
    assert.equal(activeFinalAttempt?.id, activeFinalAttemptId);
    assert.equal(await markExhaustedJobsDead(pool, 1_000), 0);
    await pool.query(`UPDATE jobs SET locked_at=NOW() - INTERVAL '2 seconds' WHERE id=$1::uuid`, [activeFinalAttemptId]);
    assert.equal(await markExhaustedJobsDead(pool, 1_000), 1);
    const expiredFinalAttempt = await pool.query<{ status: string }>(`SELECT status FROM jobs WHERE id=$1::uuid`, [activeFinalAttemptId]);
    assert.equal(expiredFinalAttempt.rows[0]?.status, 'DEAD_LETTER');

    const restartJobId = await insertJob(pool, 2);
    ids.push(restartJobId);
    await pool.end();
    const restartedPool = new Pool({ connectionString: assertSafeDatabase(process.env.DATABASE_URL), max: 1, application_name: 'civique-m1-restart-test' });
    try {
      const afterRestart = await claimJob(restartedPool, 'worker-restarted', 1_000);
      assert.equal(afterRestart?.id, restartJobId);
      await completeJob(restartedPool, restartJobId, 'worker-restarted');
    } finally {
      await restartedPool.query(`DELETE FROM jobs WHERE id = ANY($1::uuid[])`, [ids]);
      await restartedPool.end();
    }

    console.log('worker queue integration tests passed');
  } catch (error) {
    if (!pool.ended) {
      await pool.query(`DELETE FROM jobs WHERE id = ANY($1::uuid[])`, [ids]).catch(() => undefined);
      await pool.end();
    }
    throw error;
  }
}

void run();
