export type WorkerConfig = {
  pollMs: number;
  leaseMs: number;
  leaseHeartbeatMs: number;
  shutdownGraceMs: number;
};

export function loadWorkerConfig(env: NodeJS.ProcessEnv = process.env): WorkerConfig {
  if (!isConfigured(env.DATABASE_URL)) throw new Error('Missing required environment variable: DATABASE_URL');

  const pollMs = positiveInteger(env.WORKER_POLL_INTERVAL_MS, 2_000, 'WORKER_POLL_INTERVAL_MS', 100);
  const leaseMs = positiveInteger(env.WORKER_LEASE_MS, 60_000, 'WORKER_LEASE_MS', 3_000);
  const leaseHeartbeatMs = positiveInteger(
    env.WORKER_LEASE_HEARTBEAT_MS,
    Math.max(1_000, Math.floor(leaseMs / 3)),
    'WORKER_LEASE_HEARTBEAT_MS',
    500,
  );
  const shutdownGraceMs = positiveInteger(env.WORKER_SHUTDOWN_GRACE_MS, 30_000, 'WORKER_SHUTDOWN_GRACE_MS', 1_000);

  if (leaseHeartbeatMs >= leaseMs) throw new Error('WORKER_LEASE_HEARTBEAT_MS must be less than WORKER_LEASE_MS');
  return { pollMs, leaseMs, leaseHeartbeatMs, shutdownGraceMs };
}

function positiveInteger(value: string | undefined, fallback: number, name: string, minimum: number): number {
  const parsed = value === undefined || value === '' ? fallback : Number(value);
  if (!Number.isInteger(parsed) || parsed < minimum) throw new Error(`${name} must be an integer greater than or equal to ${minimum}`);
  return parsed;
}

function isConfigured(value: string | undefined): boolean {
  return Boolean(value && !value.includes('change_me') && !value.startsWith('your_'));
}
