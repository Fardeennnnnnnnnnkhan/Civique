import { Pool, PoolClient } from 'pg';
export type Job = { id: string; type: string; payload: unknown; attempts: number; max_attempts: number };
export function createPool(): Pool { return new Pool({ connectionString: process.env.DATABASE_URL, max: 5 }); }
export async function claimJob(pool: Pool, workerId: string, leaseMs = 60000): Promise<Job | null> {
  const client: PoolClient = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await client.query<Job>(`SELECT id, type, payload, attempts, max_attempts FROM jobs WHERE (status IN ('QUEUED','RETRY_WAIT') AND available_at <= NOW()) OR (status='RUNNING' AND locked_at < NOW() - ($1::int * INTERVAL '1 millisecond')) ORDER BY created_at FOR UPDATE SKIP LOCKED LIMIT 1`, [leaseMs]);
    if (!result.rowCount) { await client.query('COMMIT'); return null; }
    const job = result.rows[0];
    await client.query(`UPDATE jobs SET status='RUNNING', locked_at=NOW(), locked_by=$2, attempts=attempts+1, updated_at=NOW() WHERE id=$1`, [job.id, workerId]);
    await client.query('COMMIT');
    return { ...job, attempts: job.attempts + 1 };
  } catch (error) { await client.query('ROLLBACK'); throw error; } finally { client.release(); }
}
export async function completeJob(pool: Pool, id: string): Promise<void> { await pool.query(`UPDATE jobs SET status='SUCCEEDED', completed_at=NOW(), locked_at=NULL, locked_by=NULL, updated_at=NOW() WHERE id=$1 AND status='RUNNING'`, [id]); }
export async function failJob(pool: Pool, job: Job, error: Error): Promise<void> {
  const terminal = job.attempts >= job.max_attempts;
  const delay = Math.min(300, 2 ** Math.max(0, job.attempts - 1));
  await pool.query(`UPDATE jobs SET status=$2, available_at=NOW() + ($3::int * INTERVAL '1 second'), last_error=$4, locked_at=NULL, locked_by=NULL, updated_at=NOW() WHERE id=$1`, [job.id, terminal ? 'DEAD_LETTER' : 'RETRY_WAIT', terminal ? 0 : delay, error.message.slice(0, 1000)]);
}
