import pg from 'pg';
import 'dotenv/config';

const targets = [
  ['api', process.env.API_READY_URL || 'http://127.0.0.1:5000/ready'],
  ['ml', `${(process.env.ML_SERVICE_URL || 'http://127.0.0.1:8000').replace(/\/$/, '')}/health`],
  ['web', process.env.WEB_HEALTH_URL || 'http://127.0.0.1:3000'],
];
let failed = false;
for (const [name, url] of targets) {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(4000) });
    console.log(`${name}: ${response.ok ? 'READY' : `HTTP_${response.status}`}`);
    if (!response.ok) failed = true;
  } catch { console.log(`${name}: UNREACHABLE`); failed = true; }
}
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 1 });
try {
  const queue = await pool.query(`SELECT COUNT(*) FILTER (WHERE status IN ('QUEUED','RETRY_WAIT')) pending,COUNT(*) FILTER (WHERE status='DEAD_LETTER') dead FROM jobs`);
  const heartbeat = await pool.query(`SELECT EXTRACT(EPOCH FROM (NOW()-updated_at)) age_seconds FROM service_heartbeats WHERE service='worker'`);
  console.log(`database: READY`);
  console.log(`queue: pending=${queue.rows[0].pending} dead=${queue.rows[0].dead}`);
  console.log(`worker: ${heartbeat.rows[0] && Number(heartbeat.rows[0].age_seconds) < 30 ? 'READY' : 'STALE_OR_NOT_RUNNING'}`);
  if (!heartbeat.rows[0] || Number(heartbeat.rows[0].age_seconds) >= 30) failed = true;
} catch { console.log('database/queue: UNAVAILABLE'); failed = true; }
finally { await pool.end(); }
process.exitCode = failed ? 1 : 0;
