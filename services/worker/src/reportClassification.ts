import crypto from 'crypto';
import { Pool, PoolClient } from 'pg';
import { Job } from './queue';

type ReportClassificationPayload = { reportId: string };
type PendingReport = {
  id: string;
  incident_id: string | null;
  description: string | null;
  citizen_category: string | null;
  storage_path: string;
  mime_type: string;
};
type Classification = {
  category: string;
  confidence: number;
  engine: string;
  modelVersion: string;
  raw: Record<string, unknown>;
  summary?: string;
  issue?: Record<string, unknown>;
  authenticity?: { verdict?: string; confidence?: number; signals?: string[]; limitations?: string[] };
  review?: string;
  decision?: 'ACCEPT' | 'REJECT' | 'REVIEW_REQUIRED';
  civicRelevance?: Record<string, unknown>;
  followUpQuestions?: unknown[];
};

const reportIdPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function parseReportClassificationPayload(payload: unknown): ReportClassificationPayload {
  if (!payload || typeof payload !== 'object' || !('reportId' in payload) || typeof payload.reportId !== 'string' || !reportIdPattern.test(payload.reportId)) {
    throw new Error('INVALID_REPORT_CLASSIFICATION_PAYLOAD');
  }
  return { reportId: payload.reportId };
}

function storageObjectUrl(path: string) {
  const base = process.env.SUPABASE_URL?.replace(/\/$/, '');
  if (!base) throw new Error('SUPABASE_URL_NOT_CONFIGURED');
  const encodedPath = path.split('/').map(encodeURIComponent).join('/');
  return `${base}/storage/v1/object/authenticated/report-images/${encodedPath}`;
}

async function downloadPrivateEvidence(report: PendingReport): Promise<Buffer> {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) throw new Error('SUPABASE_SERVICE_ROLE_KEY_NOT_CONFIGURED');
  const response = await fetch(storageObjectUrl(report.storage_path), { headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` } });
  if (!response.ok) throw new Error(`STORAGE_DOWNLOAD_${response.status}`);
  const contentType = response.headers.get('content-type')?.split(';', 1)[0];
  if (contentType && contentType !== report.mime_type) throw new Error('STORAGE_MIME_MISMATCH');
  return Buffer.from(await response.arrayBuffer());
}

async function classify(report: PendingReport, image: Buffer): Promise<Classification> {
  const serviceUrl = process.env.ML_SERVICE_URL?.replace(/\/$/, '');
  if (!serviceUrl) throw new Error('ML_SERVICE_URL_NOT_CONFIGURED');
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), Math.max(30_000, Number(process.env.ML_TIMEOUT_MS || 60_000)));
  try {
    const form = new FormData();
    form.append('image', new Blob([image], { type: report.mime_type }), `report-${report.id}`);
    form.append('description', report.description || '');
    const response = await fetch(`${serviceUrl}/api/v1/classify/category`, { method: 'POST', body: form, signal: controller.signal });
    if (!response.ok) throw new Error(`ML_SERVICE_${response.status}`);
    const raw = await response.json() as Record<string, unknown>;
    if (raw.success !== true || typeof raw.category !== 'string' || typeof raw.confidence !== 'number' || !Number.isFinite(raw.confidence)) throw new Error('ML_RESPONSE_INVALID');
    return {
      category: raw.category.toUpperCase(),
      confidence: Math.min(1, Math.max(0, raw.confidence)),
      engine: typeof raw.engine === 'string' ? raw.engine : 'unknown',
      modelVersion: typeof raw.model_version === 'string' ? raw.model_version : process.env.GROQ_MODEL || 'unknown',
      raw,
      summary: typeof raw.summary === 'string' ? raw.summary : undefined,
      issue: raw.issue && typeof raw.issue === 'object' ? raw.issue as Record<string, unknown> : undefined,
      authenticity: raw.authenticity && typeof raw.authenticity === 'object' ? raw.authenticity as Classification['authenticity'] : undefined,
      review: typeof raw.review === 'string' ? raw.review : undefined,
      decision: raw.decision === 'ACCEPT' || raw.decision === 'REJECT' || raw.decision === 'REVIEW_REQUIRED' ? raw.decision : undefined,
      civicRelevance: raw.civic_relevance && typeof raw.civic_relevance === 'object' ? raw.civic_relevance as Record<string, unknown> : undefined,
      followUpQuestions: Array.isArray(raw.follow_up_questions) ? raw.follow_up_questions : [],
    };
  } finally {
    clearTimeout(timeout);
  }
}

async function appendClassificationAudit(client: PoolClient, incidentId: string, reportId: string, classification: Classification, confirmedCategory: string) {
  const prior = await client.query<{ current_hash: string }>('SELECT current_hash FROM audit_logs WHERE incident_id=$1 ORDER BY timestamp DESC, id DESC LIMIT 1 FOR UPDATE', [incidentId]);
  const previousHash = prior.rows[0]?.current_hash || '0'.repeat(64);
  const metadata = { reportId, suggestedCategory: classification.category, confirmedCategory, confidence: classification.confidence, engine: classification.engine, modelVersion: classification.modelVersion, newStatus: 'OPEN' };
  const currentHash = crypto.createHash('sha256').update(`${previousHash}|${incidentId}|INCIDENT_AI_CLASSIFIED|M13_CLASSIFICATION_WORKER|${JSON.stringify(metadata)}`).digest('hex');
  await client.query('INSERT INTO audit_logs (incident_id,event_type,actor,previous_hash,current_hash,metadata) VALUES ($1,$2,$3,$4,$5,$6::jsonb)', [incidentId, 'INCIDENT_AI_CLASSIFIED', 'M13_CLASSIFICATION_WORKER', previousHash, currentHash, JSON.stringify(metadata)]);
}

export type ReportClassificationDependencies = {
  download: (report: PendingReport) => Promise<Buffer>;
  classify: (report: PendingReport, image: Buffer) => Promise<Classification>;
};

export async function processReportClassification(pool: Pool, job: Job, dependencies: ReportClassificationDependencies = { download: downloadPrivateEvidence, classify }): Promise<void> {
  const { reportId } = parseReportClassificationPayload(job.payload);
  const pending = await pool.query<PendingReport>(`
    SELECT r.id, r.incident_id, r.description, r.category_confirmed AS citizen_category, m.storage_path, m.mime_type
    FROM reports r JOIN media_assets m ON m.report_id = r.id
    WHERE r.id=$1 AND r.category_confidence IS NULL
    ORDER BY CASE m.kind WHEN 'NORMALIZED' THEN 0 ELSE 1 END, m.created_at ASC LIMIT 1
  `, [reportId]);
  const report = pending.rows[0];
  if (!report) return;

  const image = await dependencies.download(report);
  const requestHash = crypto.createHash('sha256').update(image).update(report.description || '').digest('hex');
  const startedAt = Date.now();
  const classification = await dependencies.classify(report, image);
  const latencyMs = Date.now() - startedAt;
  const taxonomy = await pool.query<{ key: string }>('SELECT key FROM categories WHERE active=true');
  const allowed = new Set(taxonomy.rows.map((row) => row.key));
  const rejectedByVision = classification.decision === 'REJECT' || classification.category === 'NOT_A_CIVIC_ISSUE';
  const normalizedAiCategory = rejectedByVision ? 'OTHER' : classification.category === 'OTHERS' && allowed.has('OTHER') ? 'OTHER' : classification.category;
  const suggestedCategory = allowed.has(normalizedAiCategory) ? normalizedAiCategory : (allowed.has('OTHER') ? 'OTHER' : 'OTHERS');
  // The citizen's selected category is the editable human decision and must not be silently overwritten by AI.
  const citizenCategory = report.citizen_category?.toUpperCase();
  const confirmedCategory = rejectedByVision ? 'OTHER' : citizenCategory && allowed.has(citizenCategory) ? citizenCategory : (classification.confidence >= 0.4 && suggestedCategory !== 'OTHERS' ? suggestedCategory : 'OTHERS');

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const authenticityVerdict = classification.authenticity?.verdict || 'UNAVAILABLE';
    const evidenceQuality = String(classification.issue?.evidence_quality || 'MEDIUM');
    const requiresHumanReview = !rejectedByVision && (classification.decision === 'REVIEW_REQUIRED' || classification.review === 'HUMAN_REVIEW' || classification.confidence < 0.7 || suggestedCategory === 'OTHER' || evidenceQuality === 'LOW' || (Boolean(classification.authenticity) && ['SUSPICIOUS', 'LIKELY_SYNTHETIC', 'INCONCLUSIVE'].includes(authenticityVerdict)));
    const incidentReportCount = report.incident_id ? await client.query<{ count: string }>('SELECT COUNT(*)::text AS count FROM reports WHERE incident_id=$1', [report.incident_id]) : { rows: [{ count: '0' }] };
    const canRejectIncident = rejectedByVision && Number(incidentReportCount.rows[0]?.count || 0) <= 1;
    const nextSubmissionStatus = rejectedByVision ? 'REJECTED' : requiresHumanReview ? 'REVIEW_REQUIRED' : 'ACCEPTED';
    const updated = await client.query('UPDATE reports SET category_suggested=$2, category_confirmed=$3, category_confidence=$4, submission_status=$5 WHERE id=$1 AND category_confidence IS NULL RETURNING id', [reportId, suggestedCategory, confirmedCategory, classification.confidence, nextSubmissionStatus]);
    if (!updated.rowCount) { await client.query('COMMIT'); return; }
    await client.query(`
      UPDATE ai_analyses SET provider=$2, model=$3, category=$4, confidence=$5, result=$6::jsonb, status=$7,request_hash=$8,latency_ms=$9,prompt_tokens=$10,completion_tokens=$11,completed_at=NOW(),failure_code=NULL
      WHERE id=(SELECT id FROM ai_analyses WHERE report_id=$1 AND status='PENDING' ORDER BY created_at DESC LIMIT 1)
    `, [reportId, classification.engine.startsWith('groq') ? 'groq' : 'local', classification.modelVersion, suggestedCategory, classification.confidence, JSON.stringify({ ...classification.raw, summary: classification.summary || null, issue: classification.issue || null, civic_relevance: classification.civicRelevance || null, decision: classification.decision || null, follow_up_questions: classification.followUpQuestions || [], authenticity: classification.authenticity || { verdict: 'INCONCLUSIVE', confidence: 0, signals: [], limitations: ['No authenticity result was provided.'] }, review: rejectedByVision ? 'REJECTED' : requiresHumanReview ? 'HUMAN_REVIEW' : 'AUTO_ACCEPT' }), rejectedByVision ? 'REJECTED' : requiresHumanReview ? 'REVIEW_REQUIRED' : 'COMPLETED', requestHash, latencyMs, Number((classification.raw as any).usage?.prompt_tokens) || null, Number((classification.raw as any).usage?.completion_tokens) || null]);
    if (report.incident_id) {
      const transitioned = rejectedByVision && canRejectIncident
        ? await client.query('UPDATE incidents SET status=\'REJECTED\' WHERE id=$1 AND status=\'AI_REVIEW\' RETURNING id', [report.incident_id])
        : requiresHumanReview ? { rowCount: 0 } : await client.query('UPDATE incidents SET category=$2, status=\'OPEN\' WHERE id=$1 AND status=\'AI_REVIEW\' RETURNING id', [report.incident_id, confirmedCategory]);
      if (transitioned.rowCount) await appendClassificationAudit(client, report.incident_id, reportId, classification, confirmedCategory);
      await client.query(`INSERT INTO outbox_events (topic,payload,idempotency_key) VALUES ('incident.classified',$2::jsonb,$1) ON CONFLICT (idempotency_key) DO NOTHING`, [`report-classified:${reportId}`, JSON.stringify({ reportId, incidentId: report.incident_id, suggestedCategory, confirmedCategory, confidence: classification.confidence, authenticityVerdict, decision: classification.decision, civicRelevance: classification.civicRelevance, review: rejectedByVision ? 'REJECTED' : requiresHumanReview ? 'HUMAN_REVIEW' : 'AUTO_ACCEPT', summary: classification.summary || null })]);
      const eventType = rejectedByVision ? 'AI_REJECTED_NON_CIVIC' : requiresHumanReview ? 'AI_REVIEW_REQUIRED' : 'CLASSIFICATION_ACCEPTED';
      const state = rejectedByVision && canRejectIncident ? 'REJECTED' : requiresHumanReview ? 'AI_REVIEW' : 'OPEN';
      const correlation = `classification:${reportId}:${eventType}`;
      await client.query(`INSERT INTO incident_timeline_events (incident_id,report_id,event_type,lifecycle_state,actor_label,metadata,correlation_id) VALUES ($1::uuid,$2::uuid,$3,$4::"IncidentStatus",'Civique AI',$5::jsonb,$6) ON CONFLICT (correlation_id) DO NOTHING`, [report.incident_id,reportId,eventType,state,JSON.stringify({ suggestedCategory,confirmedCategory,confidence:classification.confidence,decision:classification.decision,civicRelevance:classification.civicRelevance,review:rejectedByVision?'REJECTED':requiresHumanReview?'HUMAN_REVIEW':'AUTO_ACCEPT' }),correlation]);
      await client.query(`INSERT INTO outbox_events (topic,payload,idempotency_key) VALUES ('lifecycle.notification',$1::jsonb,$2) ON CONFLICT (idempotency_key) DO NOTHING`, [JSON.stringify({ reportId,incidentId:report.incident_id,eventType,state,correlationId:correlation }),`notify:${correlation}`]);
    }
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
