export const REQUIRED_COLUMNS = [
  'media_assets.kind',
  'media_assets.source_asset_id',
  'reports.title',
  'incidents.triage_owner_id',
  'resolution_submissions.verification_result',
  'notifications.idempotency_key',
  'audit_logs.chain_sequence',
  'audit_logs.hash_version',
] as const;

export const REQUIRED_TABLES = [
  'incident_timeline_events',
  'triage_assignments',
  'resolution_decisions',
  'service_heartbeats',
  'jobs',
  'outbox_events',
  'audit_chain_heads',
] as const;

export type ReadinessSnapshot = {
  database: 'CONNECTED' | 'ERROR';
  dbLatencyMs: number;
  missingSchema: string[];
  storage: 'CONFIGURED' | 'NOT_CONFIGURED';
  ai: 'AVAILABLE' | 'UNREACHABLE' | 'NOT_CONFIGURED' | `HTTP_${number}`;
  worker: 'AVAILABLE' | 'STALE_OR_NOT_RUNNING' | 'UNKNOWN';
  queue: 'AVAILABLE' | 'UNAVAILABLE';
  queuePending: number | null;
  queueDeadLetter: number | null;
};

export function evaluateReadiness(snapshot: ReadinessSnapshot, requireStorage: boolean) {
  const blockingReasons: string[] = [];
  const degradedReasons: string[] = [];

  if (snapshot.database !== 'CONNECTED') blockingReasons.push('DATABASE_UNAVAILABLE');
  if (snapshot.missingSchema.length > 0) blockingReasons.push('SCHEMA_INCOMPATIBLE');
  if (requireStorage && snapshot.storage !== 'CONFIGURED') blockingReasons.push('STORAGE_NOT_CONFIGURED');
  if (snapshot.queue !== 'AVAILABLE') blockingReasons.push('QUEUE_SCHEMA_UNAVAILABLE');

  if (snapshot.worker !== 'AVAILABLE') degradedReasons.push('WORKER_UNAVAILABLE');
  if (snapshot.ai !== 'AVAILABLE' && snapshot.ai !== 'NOT_CONFIGURED') degradedReasons.push('AI_UNAVAILABLE');
  if ((snapshot.queueDeadLetter || 0) > 0) degradedReasons.push('DEAD_LETTER_JOBS_PRESENT');

  return {
    ready: blockingReasons.length === 0,
    status: blockingReasons.length > 0 ? 'NOT_READY' : degradedReasons.length > 0 ? 'DEGRADED' : 'READY',
    blockingReasons,
    degradedReasons,
  } as const;
}
