import { Pool, PoolClient, QueryResult } from 'pg';

export type Job = {
  id: string;
  type: string;
  payload: unknown;
  attempts: number;
  max_attempts: number;
  locked_by?: string;
};

type Queryable = Pick<Pool, 'query'>;

export class JobLeaseLostError extends Error {
  constructor(jobId: string) {
    super(`JOB_LEASE_LOST:${jobId}`);
    this.name = 'JobLeaseLostError';
  }
}

export function retryDelaySeconds(attempts: number, maximumSeconds = 300): number {
  if (!Number.isInteger(attempts) || attempts < 1) throw new Error('attempts must be a positive integer');
  if (!Number.isFinite(maximumSeconds) || maximumSeconds < 1) throw new Error('maximumSeconds must be positive');
  return Math.min(maximumSeconds, 2 ** Math.max(0, attempts - 1));
}

export function createPool(): Pool {
  return new Pool({
    connectionString: process.env.DATABASE_URL,
    max: Number(process.env.WORKER_DATABASE_POOL_SIZE || 5),
    application_name: 'civique-worker',
  });
}

export async function claimJob(pool: Pool, workerId: string, leaseMs = 60_000): Promise<Job | null> {
  if (!workerId.trim()) throw new Error('workerId is required');
  if (!Number.isInteger(leaseMs) || leaseMs < 1_000) throw new Error('leaseMs must be an integer of at least 1000');

  const client: PoolClient = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await client.query<Omit<Job, 'locked_by'>>(
      `SELECT id, type, payload, attempts, max_attempts
       FROM jobs
       WHERE attempts < max_attempts
         AND (
           (status IN ('QUEUED','RETRY_WAIT') AND available_at <= NOW())
           OR (status='RUNNING' AND locked_at < NOW() - ($1::int * INTERVAL '1 millisecond'))
         )
       ORDER BY available_at, created_at, id
       FOR UPDATE SKIP LOCKED
       LIMIT 1`,
      [leaseMs],
    );
    if (!result.rowCount) {
      await client.query('COMMIT');
      return null;
    }

    const job = result.rows[0];
    await client.query(
      `UPDATE jobs
       SET status='RUNNING', locked_at=NOW(), locked_by=$2, attempts=attempts+1,
           completed_at=NULL, updated_at=NOW()
       WHERE id=$1`,
      [job.id, workerId],
    );
    await client.query('COMMIT');
    return { ...job, attempts: job.attempts + 1, locked_by: workerId };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function extendJobLease(pool: Queryable, id: string, workerId: string): Promise<void> {
  const result = await pool.query(
    `UPDATE jobs SET locked_at=NOW(), updated_at=NOW()
     WHERE id=$1 AND status='RUNNING' AND locked_by=$2`,
    [id, workerId],
  );
  assertLeaseOwned(result, id);
}

export async function completeJob(pool: Queryable, id: string, workerId: string): Promise<void> {
  const result = await pool.query(
    `UPDATE jobs
     SET status='SUCCEEDED', completed_at=NOW(), locked_at=NULL, locked_by=NULL,
         last_error=NULL, updated_at=NOW()
     WHERE id=$1 AND status='RUNNING' AND locked_by=$2`,
    [id, workerId],
  );
  assertLeaseOwned(result, id);
}

export async function failJob(pool: Queryable, job: Job, error: Error, workerId: string): Promise<void> {
  const terminal = job.attempts >= job.max_attempts;
  const delay = terminal ? 0 : retryDelaySeconds(job.attempts);
  const result = await pool.query(
    `UPDATE jobs
     SET status=$3, available_at=NOW() + ($4::int * INTERVAL '1 second'),
         last_error=$5, locked_at=NULL, locked_by=NULL, updated_at=NOW()
     WHERE id=$1 AND status='RUNNING' AND locked_by=$2`,
    [job.id, workerId, terminal ? 'DEAD_LETTER' : 'RETRY_WAIT', delay, safeErrorMessage(error)],
  );
  assertLeaseOwned(result, job.id);
}

export async function markExhaustedJobsDead(pool: Queryable, leaseMs: number): Promise<number> {
  if (!Number.isInteger(leaseMs) || leaseMs < 1_000) throw new Error('leaseMs must be an integer of at least 1000');
  const result = await pool.query(
    `UPDATE jobs
     SET status='DEAD_LETTER', locked_at=NULL, locked_by=NULL,
         last_error=COALESCE(last_error, 'MAX_ATTEMPTS_EXHAUSTED'), updated_at=NOW()
     WHERE status IN ('QUEUED','RETRY_WAIT','RUNNING')
       AND attempts >= max_attempts
       AND (
         status <> 'RUNNING'
         OR locked_at IS NULL
         OR locked_at < NOW() - ($1::int * INTERVAL '1 millisecond')
       )`,
    [leaseMs],
  );
  return result.rowCount || 0;
}

function assertLeaseOwned(result: Pick<QueryResult, 'rowCount'>, jobId: string): void {
  if (result.rowCount !== 1) throw new JobLeaseLostError(jobId);
}

function safeErrorMessage(error: Error): string {
  return `${error.name}: ${error.message}`.replace(/[\r\n\t]+/g, ' ').slice(0, 1000);
}
