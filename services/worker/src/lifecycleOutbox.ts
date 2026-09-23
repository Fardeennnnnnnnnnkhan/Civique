import { Pool } from 'pg';

type Outbox = { id: string; topic: string; payload: Record<string, unknown>; attempts: number };

export async function processOneOutboxEvent(pool: Pool): Promise<boolean> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const selected = await client.query<Outbox>(`SELECT id, topic, payload, attempts FROM outbox_events WHERE published_at IS NULL AND topic='lifecycle.notification' ORDER BY created_at FOR UPDATE SKIP LOCKED LIMIT 1`);
    const event = selected.rows[0];
    if (!event) { await client.query('COMMIT'); return false; }
    const incidentId = String(event.payload.incidentId || '');
    const eventType = String(event.payload.eventType || '');
    const incidentResult = await client.query<{ public_tracking_id: string; category: string; triage_owner_id: string | null; department_id: string | null; city_id: string | null }>(`SELECT public_tracking_id,category,triage_owner_id,department_id,city_id FROM incidents WHERE id=$1::uuid`, [incidentId]);
    if (!incidentResult.rowCount) throw new Error('OUTBOX_INCIDENT_NOT_FOUND');
    const incident = incidentResult.rows[0];
    const citizens = await client.query<{ id: string }>(`SELECT DISTINCT submitter_ref AS id FROM reports WHERE incident_id=$1::uuid AND submitter_ref IS NOT NULL`, [incidentId]);
    const heads = incident.department_id ? await client.query<{ id: string }>(`SELECT id FROM users WHERE role='DEPARTMENT_HEAD' AND active=true AND department_id=$1::uuid`, [incident.department_id]) : { rows: [] as { id: string }[] };
    const workers = await client.query<{ id: string }>(`SELECT assigned_to AS id FROM incidents WHERE id=$1::uuid AND assigned_to IS NOT NULL`, [incidentId]);
    const oversight = await client.query<{ id: string }>(`SELECT id FROM users WHERE role='SUPER_ADMIN' AND active=true AND oversight_notifications=true`);
    const recipientIds = new Set<string>();
    const add = (rows: Array<{ id: string }>) => rows.forEach((row) => recipientIds.add(row.id));
    const citizenEvents = new Set(['REPORT_RECEIVED','WARD_OWNER_ASSIGNED','CLASSIFICATION_ACCEPTED','WORKER_ASSIGNED','WORK_STARTED','RESOLUTION_SUBMITTED','AWAITING_CITIZEN_CONFIRMATION','CITIZEN_DISPUTED','INCIDENT_REOPENED']);
    // The triage owner must see every newly received report, including reports
    // linked to an existing Incident. Previously only WARD_OWNER_ASSIGNED was
    // routed to the owner, so duplicate/corroborating reports notified the
    // citizen but silently skipped the responsible Ward Officer.
    const ownerEvents = new Set(['REPORT_RECEIVED','WARD_OWNER_ASSIGNED','AI_REVIEW_REQUIRED','CLASSIFICATION_ACCEPTED','DEPARTMENT_ROUTED','WORKER_ASSIGNED','WORK_STARTED','RESOLUTION_SUBMITTED','VERIFICATION_REVIEW_REQUIRED','CITIZEN_CONFIRMED','CITIZEN_DISPUTED','INCIDENT_REOPENED','SLA_WARNING','SLA_ESCALATED']);
    const headEvents = new Set(['DEPARTMENT_ROUTED','WORKER_ASSIGNED','RESOLUTION_SUBMITTED','CITIZEN_CONFIRMED','CITIZEN_DISPUTED','INCIDENT_REOPENED']);
    const workerEvents = new Set(['WORKER_ASSIGNED','CITIZEN_CONFIRMED','CITIZEN_DISPUTED','INCIDENT_REOPENED']);
    if (citizenEvents.has(eventType)) add(citizens.rows);
    if (ownerEvents.has(eventType) && incident.triage_owner_id) recipientIds.add(incident.triage_owner_id);
    if (headEvents.has(eventType)) add(heads.rows);
    if (workerEvents.has(eventType)) add(workers.rows);
    if (['WARD_OWNER_ASSIGNED','CITIZEN_DISPUTED','INCIDENT_REOPENED'].includes(eventType)) add(oversight.rows);
    if (eventType === 'WARD_OWNER_UNASSIGNED') {
      const admins = incident.city_id ? await client.query<{ id: string }>(`SELECT id FROM users WHERE active=true AND role='CITY_ADMIN' AND city_id=$1::uuid`, [incident.city_id]) : { rows: [] as { id: string }[] };
      add(admins.rows); add(oversight.rows);
    }
    const title = titleFor(eventType, incident.public_tracking_id);
    const message = messageFor(eventType, incident.public_tracking_id, incident.category);
    for (const userId of recipientIds) {
      const key = `lifecycle:${event.id}:${userId}`;
      const inserted = await client.query<{ id: string }>(`INSERT INTO notifications (user_id,title,message,type,incident_id,idempotency_key) VALUES ($1::uuid,$2,$3,$4,$5::uuid,$6) ON CONFLICT (idempotency_key) DO UPDATE SET idempotency_key=EXCLUDED.idempotency_key RETURNING id`, [userId, title, message, eventType, incidentId, key]);
      const notificationId = inserted.rows[0].id;
      await client.query(`INSERT INTO delivery_attempts (notification_id,channel,status,attempt_count,sent_at) VALUES ($1::uuid,'IN_APP','SENT',1,NOW()) ON CONFLICT (notification_id,channel) DO NOTHING`, [notificationId]);
      await client.query(`INSERT INTO realtime_events (event_type,entity_id,payload,audience_user_id,is_public) VALUES ('notification:received',$1::uuid,$2::jsonb,$3::uuid,false)`, [incidentId, JSON.stringify({ notificationId, title, message, type: eventType, incidentId }), userId]);
      await client.query(`SELECT pg_notify('civique_realtime',$1)`, [JSON.stringify({ room: `user:${userId}`, event: 'notification:received', payload: { notificationId, title, message, type: eventType, incidentId } })]);
    }
    await client.query(`UPDATE outbox_events SET published_at=NOW(), attempts=attempts+1, last_error=NULL WHERE id=$1::uuid`, [event.id]);
    await client.query('COMMIT');
    return true;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally { client.release(); }
}

function titleFor(type: string, trackingId: string) {
  const names: Record<string, string> = { REPORT_RECEIVED: 'Report received', WARD_OWNER_ASSIGNED: 'Ward owner assigned', AI_REVIEW_REQUIRED: 'AI review required', CLASSIFICATION_ACCEPTED: 'Classification accepted', DEPARTMENT_ROUTED: 'Department routed', WORKER_ASSIGNED: 'Worker assigned', WORK_STARTED: 'Work started', RESOLUTION_SUBMITTED: 'Resolution submitted', VERIFICATION_REVIEW_REQUIRED: 'Verification review required', AWAITING_CITIZEN_CONFIRMATION: 'Please review the resolution', CITIZEN_CONFIRMED: 'Resolution confirmed', CITIZEN_DISPUTED: 'Resolution disputed', INCIDENT_REOPENED: 'Incident reopened' };
  return `${names[type] || 'Incident updated'} · ${trackingId}`;
}
function messageFor(type: string, trackingId: string, category: string) { return `${trackingId} (${category}) has a new lifecycle event: ${type.replaceAll('_', ' ').toLowerCase()}.`; }
