import { IncidentStatus, Prisma, UserRole } from '@prisma/client';
import { enqueueOutbox } from '../jobs/queue';

type Db = Prisma.TransactionClient;

export async function appendTimeline(db: Db, input: {
  incidentId: string; reportId?: string | null; eventType: string; lifecycleState?: IncidentStatus | null;
  actorRole?: UserRole | null; actorLabel?: string | null; metadata?: Prisma.InputJsonValue;
  visibility?: 'CITIZEN' | 'OFFICIAL' | 'INTERNAL'; correlationId: string;
}) {
  return db.$executeRaw`
    INSERT INTO incident_timeline_events (incident_id,report_id,event_type,lifecycle_state,actor_role,actor_label,metadata,visibility,correlation_id)
    VALUES (${input.incidentId}::uuid,${input.reportId || null}::uuid,${input.eventType},${input.lifecycleState || null}::"IncidentStatus",${input.actorRole || null}::"UserRole",${input.actorLabel || null},${input.metadata ? JSON.stringify(input.metadata) : null}::jsonb,${input.visibility || 'CITIZEN'}::"TimelineVisibility",${input.correlationId})
    ON CONFLICT (correlation_id) DO NOTHING`;
}

export async function emitLifecycle(db: Db, input: {
  incidentId: string; reportId?: string | null; eventType: string; state?: IncidentStatus;
  actorRole?: UserRole; actorLabel?: string; metadata?: Prisma.InputJsonValue; correlationId: string;
}) {
  await appendTimeline(db, { ...input, lifecycleState: input.state });
  await enqueueOutbox(db, {
    topic: 'lifecycle.notification',
    payload: { incidentId: input.incidentId, reportId: input.reportId || null, eventType: input.eventType, state: input.state || null, correlationId: input.correlationId },
    idempotencyKey: `notify:${input.correlationId}`,
  });
}
