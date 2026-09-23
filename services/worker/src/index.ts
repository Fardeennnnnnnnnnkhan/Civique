import dotenv from 'dotenv';
import os from 'os';
import path from 'path';
import { loadWorkerConfig } from './env';
import { logEvent, safeErrorType } from './log';
import { processOneOutboxEvent } from './lifecycleOutbox';
import { Job, JobLeaseLostError, claimJob, completeJob, createPool, extendJobLease, failJob, markExhaustedJobsDead } from './queue';
import { processNotificationDelivery } from './notificationDelivery';
import { processReportClassification } from './reportClassification';
import { processResolutionVerification } from './resolutionVerification';

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const config = loadWorkerConfig();
const pool = createPool();
const workerId = `${os.hostname()}:${process.pid}`;
let stopping = false;
let pollTimer: NodeJS.Timeout | undefined;
let activeJob: Promise<void> | undefined;

async function processJob(job: Job): Promise<void> {
  logEvent({ module: 'jobs', operation: 'process', jobId: job.id, jobType: job.type, attempt: job.attempts, status: 'STARTED' });
  switch (job.type) {
    case 'REPORT_CLASSIFICATION':
      await processReportClassification(pool, job);
      return;
    case 'NOTIFICATION_DELIVERY':
      await processNotificationDelivery(pool, job);
      return;
    case 'RESOLUTION_VERIFICATION':
      await processResolutionVerification(pool, job);
      return;
    default:
      throw new Error(`UNSUPPORTED_JOB_TYPE:${job.type}`);
  }
}

async function runClaimedJob(job: Job): Promise<void> {
  let leaseFailure: Error | undefined;
  const heartbeat = setInterval(() => {
    void extendJobLease(pool, job.id, workerId).catch((error) => {
      leaseFailure = error instanceof Error ? error : new Error(String(error));
      logEvent({ module: 'jobs', operation: 'lease.extend', jobId: job.id, status: 'ERROR', errorType: safeErrorType(error) });
    });
  }, config.leaseHeartbeatMs);
  heartbeat.unref();

  try {
    await processJob(job);
    if (leaseFailure) throw leaseFailure;
    await completeJob(pool, job.id, workerId);
    logEvent({ module: 'jobs', operation: 'process', jobId: job.id, jobType: job.type, attempt: job.attempts, status: 'SUCCEEDED' });
  } catch (error) {
    const failure = error instanceof Error ? error : new Error(String(error));
    if (job.type === 'REPORT_CLASSIFICATION') {
      const reportId = reportIdFrom(job.payload);
      if (reportId) {
        await pool.query(
          `UPDATE ai_analyses SET status=$2,failure_code=$3
           WHERE report_id=$1::uuid AND status IN ('PENDING','RETRY_WAIT')`,
          [reportId, job.attempts >= job.max_attempts ? 'FAILED' : 'RETRY_WAIT', failure.message.slice(0, 120)],
        ).catch(() => undefined);
      }
    }

    if (failure instanceof JobLeaseLostError || leaseFailure instanceof JobLeaseLostError) {
      logEvent({ module: 'jobs', operation: 'process', jobId: job.id, jobType: job.type, status: 'LEASE_LOST' });
      return;
    }

    try {
      await failJob(pool, job, failure, workerId);
      logEvent({
        module: 'jobs',
        operation: 'process',
        jobId: job.id,
        jobType: job.type,
        attempt: job.attempts,
        status: job.attempts >= job.max_attempts ? 'DEAD_LETTER' : 'RETRY_WAIT',
        errorType: failure.name,
      });
    } catch (failError) {
      logEvent({ module: 'jobs', operation: 'fail', jobId: job.id, status: 'ERROR', errorType: safeErrorType(failError) });
    }
  } finally {
    clearInterval(heartbeat);
  }
}

async function poll(): Promise<void> {
  if (stopping) return;
  try {
    await pool.query(
      `INSERT INTO service_heartbeats (service,instance,metadata,updated_at)
       VALUES ('worker',$1,$2::jsonb,NOW())
       ON CONFLICT (service) DO UPDATE
       SET instance=EXCLUDED.instance,metadata=EXCLUDED.metadata,updated_at=NOW()`,
      [workerId, JSON.stringify({ pollMs: config.pollMs, leaseMs: config.leaseMs })],
    );
    await markExhaustedJobsDead(pool, config.leaseMs);
    await pool.query(
      `INSERT INTO review_tasks (incident_id,type,assigned_to_id,due_at)
       SELECT id,'CITIZEN_CONFIRMATION_TIMEOUT',triage_owner_id,citizen_confirmation_deadline
       FROM incidents
       WHERE status='CITIZEN_CONFIRMATION' AND citizen_confirmation_deadline <= NOW()
       ON CONFLICT (incident_id,type) DO NOTHING`,
    );
    await processOneOutboxEvent(pool);
    const job = await claimJob(pool, workerId, config.leaseMs);
    if (job) {
      activeJob = runClaimedJob(job);
      await activeJob;
      activeJob = undefined;
    }
  } catch (error) {
    logEvent({ module: 'worker', operation: 'poll', status: 'ERROR', errorType: safeErrorType(error) });
  } finally {
    if (!stopping) pollTimer = setTimeout(() => void poll(), config.pollMs);
  }
}

async function shutdown(signal: string): Promise<void> {
  if (stopping) return;
  stopping = true;
  if (pollTimer) clearTimeout(pollTimer);
  logEvent({ module: 'worker', operation: 'shutdown', signal, status: 'DRAINING' });

  if (activeJob) {
    await Promise.race([
      activeJob,
      new Promise<void>((resolve) => setTimeout(resolve, config.shutdownGraceMs)),
    ]);
  }

  await pool.end();
  logEvent({ module: 'worker', operation: 'shutdown', signal, status: 'STOPPED' });
}

function reportIdFrom(payload: unknown): string | undefined {
  if (!payload || typeof payload !== 'object' || !('reportId' in payload)) return undefined;
  const reportId = (payload as { reportId?: unknown }).reportId;
  return typeof reportId === 'string' ? reportId : undefined;
}

process.once('SIGTERM', () => void shutdown('SIGTERM'));
process.once('SIGINT', () => void shutdown('SIGINT'));

logEvent({ module: 'worker', operation: 'startup', workerId, status: 'STARTED', pollMs: config.pollMs, leaseMs: config.leaseMs });
void poll();
