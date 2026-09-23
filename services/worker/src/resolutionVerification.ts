import { Pool } from 'pg';
import { Job } from './queue';

function objectUrl(path: string) { const base = process.env.SUPABASE_URL?.replace(/\/$/, ''); if (!base) throw new Error('SUPABASE_URL_NOT_CONFIGURED'); return `${base}/storage/v1/object/authenticated/report-images/${path.split('/').map(encodeURIComponent).join('/')}`; }
async function download(path: string): Promise<Buffer> { const key = process.env.SUPABASE_SERVICE_ROLE_KEY; if (!key) throw new Error('SUPABASE_SERVICE_ROLE_KEY_NOT_CONFIGURED'); const response = await fetch(objectUrl(path), { headers: { apikey: key, Authorization: `Bearer ${key}` } }); if (!response.ok) throw new Error(`STORAGE_DOWNLOAD_${response.status}`); return Buffer.from(await response.arrayBuffer()); }

export async function processResolutionVerification(pool: Pool, job: Job): Promise<void> {
  const payload = job.payload as { submissionId?: string };
  if (!payload?.submissionId) throw new Error('INVALID_RESOLUTION_VERIFICATION_PAYLOAD');
  const rowResult = await pool.query<{ id: string; incident_id: string; category: string; before_path: string; after_path: string; notes: string; latitude: number | null; longitude: number | null; incident_lat: number; incident_lng: number; capture_at: Date; assigned_to: string; worker_id: string }>(`
    SELECT rs.id,rs.incident_id,i.category,r.photo_url before_path,rs.evidence_path after_path,rs.notes,rs.latitude,rs.longitude,i.latitude incident_lat,i.longitude incident_lng,rs.capture_at,i.assigned_to,rs.worker_id
    FROM resolution_submissions rs JOIN incidents i ON i.id=rs.incident_id JOIN reports r ON r.incident_id=i.id
    WHERE rs.id=$1::uuid AND rs.verification_status='PENDING' ORDER BY r.created_at LIMIT 1`, [payload.submissionId]);
  const row = rowResult.rows[0]; if (!row) return;
  const [before, after] = await Promise.all([download(row.before_path), download(row.after_path)]);
  const url = `${process.env.ML_SERVICE_URL?.replace(/\/$/, '')}/api/v1/verify/resolution`; if (!process.env.ML_SERVICE_URL) throw new Error('ML_SERVICE_URL_NOT_CONFIGURED');
  const form = new FormData(); form.append('before', new Blob([before]), 'before.webp'); form.append('after', new Blob([after]), 'after.webp'); form.append('category', row.category); form.append('notes', row.notes);
  const response = await fetch(url, { method: 'POST', body: form, signal: AbortSignal.timeout(Number(process.env.ML_TIMEOUT_MS || 60_000)) });
  const ai = await response.json() as any; if (!response.ok || ai.success !== true) throw new Error(`ML_VERIFICATION_${ai.error || response.status}`);
  const gpsOk = row.latitude == null || row.longitude == null || (Math.abs(row.latitude - row.incident_lat) <= 0.05 && Math.abs(row.longitude - row.incident_lng) <= 0.05);
  const provenanceOk = row.assigned_to === row.worker_id;
  let outcome = String(ai.outcome); if (!gpsOk || !provenanceOk) outcome = 'REJECTED'; if (ai.authenticity?.verdict === 'SUSPICIOUS') outcome = 'REVIEW_REQUIRED';
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(`UPDATE resolution_submissions SET verification_status=$2,verification_result=$3::jsonb,verified_at=NOW() WHERE id=$1::uuid`, [row.id, outcome, JSON.stringify({ ai, rules: { gpsOk, provenanceOk } })]);
    const status = outcome === 'VERIFIED' ? 'CITIZEN_CONFIRMATION' : outcome === 'REJECTED' ? 'REOPENED' : 'AI_VERIFICATION';
    await client.query(`UPDATE incidents SET status=$2::"IncidentStatus",citizen_confirmation_deadline=CASE WHEN $2='CITIZEN_CONFIRMATION' THEN NOW()+INTERVAL '48 hours' ELSE NULL END WHERE id=$1::uuid AND status='AI_VERIFICATION'`, [row.incident_id, status]);
    const eventType = outcome === 'VERIFIED' ? 'AWAITING_CITIZEN_CONFIRMATION' : outcome === 'REJECTED' ? 'INCIDENT_REOPENED' : 'VERIFICATION_REVIEW_REQUIRED';
    const correlation = `resolution-verification:${row.id}:${outcome}`;
    await client.query(`INSERT INTO incident_timeline_events (incident_id,event_type,lifecycle_state,actor_label,metadata,correlation_id) VALUES ($1::uuid,$2,$3::"IncidentStatus",'Civique verification',$4::jsonb,$5) ON CONFLICT (correlation_id) DO NOTHING`, [row.incident_id,eventType,status,JSON.stringify({ outcome, confidence: ai.confidence, rationale: ai.rationale }),correlation]);
    await client.query(`INSERT INTO outbox_events (topic,payload,idempotency_key) VALUES ('lifecycle.notification',$1::jsonb,$2) ON CONFLICT (idempotency_key) DO NOTHING`, [JSON.stringify({ incidentId: row.incident_id,eventType,state:status,correlationId:correlation }),`notify:${correlation}`]);
    await client.query('COMMIT');
  } catch (error) { await client.query('ROLLBACK'); throw error; } finally { client.release(); }
}
