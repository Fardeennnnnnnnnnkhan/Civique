import dotenv from 'dotenv';
import path from 'path';
import os from 'os';
import { createPool, claimJob, completeJob, failJob, Job } from './queue';
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
const pool = createPool();
const workerId = `${os.hostname()}:${process.pid}`;
const pollMs = Number(process.env.WORKER_POLL_INTERVAL_MS || 2000);
let stopping = false;
async function processJob(job: Job): Promise<void> {
  console.log(JSON.stringify({ module: 'worker', operation: 'job.process', jobId: job.id, type: job.type, status: 'NO_HANDLER' }));
}
async function poll(): Promise<void> {
  if (stopping) return;
  try {
    const job = await claimJob(pool, workerId);
    if (job) { try { await processJob(job); await completeJob(pool, job.id); } catch (error) { await failJob(pool, job, error instanceof Error ? error : new Error(String(error))); } }
  } catch (error) { console.error(JSON.stringify({ module: 'worker', operation: 'poll', status: 'ERROR', errorType: error instanceof Error ? error.name : 'UnknownError' })); }
  setTimeout(poll, pollMs);
}
async function shutdown(signal: string) { stopping = true; console.log(`Worker shutting down (${signal})`); await pool.end(); process.exit(0); }
process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT', () => void shutdown('SIGINT'));
void poll();
