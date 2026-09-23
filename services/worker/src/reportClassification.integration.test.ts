import assert from 'assert';
import crypto from 'crypto';
import { createPool, Job } from './queue';
import { processReportClassification } from './reportClassification';

async function run() {
  const pool = createPool();
  const incidentId = crypto.randomUUID();
  const reportId = crypto.randomUUID();
  const mediaId = crypto.randomUUID();
  const analysisId = crypto.randomUUID();
  const trackingId = `CIV-TEST-${Date.now()}-${crypto.randomInt(1000, 9999)}`;
  try {
    await pool.query(`INSERT INTO categories (id,key,name,active,created_at,updated_at) VALUES ($1,'POTHOLE','Pothole',true,NOW(),NOW()) ON CONFLICT (key) DO NOTHING`, [crypto.randomUUID()]);
    await pool.query(`INSERT INTO incidents (id,public_tracking_id,category,status,priority,priority_score,latitude,longitude,report_count,before_photo_urls,after_photo_urls,sla_breached,is_public,created_at) VALUES ($1,$2,'OTHER','AI_REVIEW','MEDIUM',0,22.7,75.8,1,ARRAY['private'],ARRAY[]::text[],false,true,NOW())`, [incidentId, trackingId]);
    await pool.query(`INSERT INTO reports (id,incident_id,photo_url,description,category_suggested,category_confirmed,latitude,longitude,capture_method,created_at) VALUES ($1,$2,'reports/normalized/test.webp','large pothole','OTHER','OTHER',22.7,75.8,'UPLOAD',NOW())`, [reportId, incidentId]);
    await pool.query(`INSERT INTO media_assets (id,report_id,storage_path,sha256,mime_type,byte_size,is_private,kind,created_at) VALUES ($1,$2,'reports/normalized/test.webp',$3,'image/webp',4,true,'NORMALIZED',NOW())`, [mediaId, reportId, '0'.repeat(64)]);
    await pool.query(`INSERT INTO ai_analyses (id,report_id,provider,model,prompt_version,schema_version,result,status,created_at) VALUES ($1,$2,'pending','qwen/qwen3.8-27b','m13-v1','m13-v1','{}'::jsonb,'PENDING',NOW())`, [analysisId, reportId]);
    const job: Job = { id: crypto.randomUUID(), type: 'REPORT_CLASSIFICATION', payload: { reportId }, attempts: 1, max_attempts: 6 };
    await processReportClassification(pool, job, {
      download: async () => Buffer.from('fake'),
      classify: async () => ({ category: 'POTHOLE', confidence: 0.91, engine: 'fake-groq', modelVersion: 'contract-test', raw: { success: true, category: 'POTHOLE', confidence: 0.91 } }),
    });
    const report = await pool.query<{ category_confirmed: string; category_confidence: string }>('SELECT category_confirmed,category_confidence FROM reports WHERE id=$1', [reportId]);
    const incident = await pool.query<{ status: string; category: string }>('SELECT status,category FROM incidents WHERE id=$1', [incidentId]);
    const audit = await pool.query('SELECT id FROM audit_logs WHERE incident_id=$1 AND event_type=\'INCIDENT_AI_CLASSIFIED\'', [incidentId]);
    const outbox = await pool.query('SELECT id FROM outbox_events WHERE idempotency_key=$1', [`report-classified:${reportId}`]);
    assert.strictEqual(report.rows[0]?.category_confirmed, 'POTHOLE');
    assert.strictEqual(Number(report.rows[0]?.category_confidence), 0.91);
    assert.deepStrictEqual(incident.rows[0], { status: 'OPEN', category: 'POTHOLE' });
    assert.strictEqual(audit.rowCount, 1);
    assert.strictEqual(outbox.rowCount, 1);
    await processReportClassification(pool, job, { download: async () => { throw new Error('should not redownload'); }, classify: async () => { throw new Error('should not reclassify'); } });
  } finally {
    await pool.query('DELETE FROM outbox_events WHERE idempotency_key=$1', [`report-classified:${reportId}`]);
    await pool.query('DELETE FROM incidents WHERE id=$1', [incidentId]);
    await pool.end();
  }
}

run().then(() => console.log('Durable Report classification integration checks passed.')).catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
