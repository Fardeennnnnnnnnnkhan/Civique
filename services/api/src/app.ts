import express, { Request, Response } from 'express';
import cors from 'cors';
import { prisma } from './db';
import authRouter from './routes/auth';
import geographyRouter from './routes/geography';
import reportsRouter from './routes/reports';
import incidentsRouter from './routes/incidents';
import usersRouter from './routes/users';
import notificationsRouter from './routes/notifications';
import routingRouter from './routes/routing';
import slaRouter from './routes/sla';
import civicHealthRouter from './routes/civicHealth';
import assetsRouter from './routes/assets';
import forecastsRouter from './routes/forecasts';
import socioRouter from './routes/socio';
import integrationsRouter from './routes/integrations';
import tenantsRouter from './routes/tenants';
import workflowRouter from './routes/workflow';
import workOrdersRouter from './routes/workOrders';
import { getAllowedOrigins, isConfigured } from './utils/env';
import { requestContext } from './middleware/requestContext';
import { REQUIRED_COLUMNS, REQUIRED_TABLES, ReadinessSnapshot, evaluateReadiness } from './services/readiness';

const app = express();

// Never expose ORM, SQL, stack, provider, or connection details through an API response.
// Route handlers may log the technical error, while clients receive a short actionable message.
const technicalResponseError = /(Prisma|PrismaClient|Invalid `|invocation|Query Engine|\bP20\d{2}\b|column .* does not exist|relation .* does not exist| at .*:\d+:\d+|ECONNREFUSED|ENOTFOUND|fetch failed|stack trace)/i;
app.use((_req, res, next) => {
  const originalJson = res.json.bind(res);
  res.json = ((body: any) => {
    if (body?.error?.message && (technicalResponseError.test(String(body.error.message)) || String(body.error.message).length > 240)) {
      const status = res.statusCode;
      body = { ...body, error: { ...body.error, message: status === 409 ? 'This action conflicts with the latest record. Refresh and try again.' : 'Something went wrong. Please try again.' } };
    }
    return originalJson(body);
  }) as typeof res.json;
  next();
});

app.use(cors({ origin: getAllowedOrigins(), credentials: true }));
app.use(requestContext);
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: false, limit: '1mb' }));

// Register Routers
app.use('/api/v1/auth', authRouter);
app.use('/api/v1/geography', geographyRouter);
app.use('/api/v1/reports', reportsRouter);
app.use('/api/v1/incidents', workflowRouter);
app.use('/api/v1/incidents', incidentsRouter);
app.use('/api/v1/work-orders', workOrdersRouter);
app.use('/api/v1/users', usersRouter);
app.use('/api/v1/notifications', notificationsRouter);
app.use('/api/v1/routing', routingRouter);
app.use('/api/v1/sla', slaRouter);
app.use('/api/v1/civic-health', civicHealthRouter);
app.use('/api/v1', assetsRouter);
app.use('/api/v1/forecasts', forecastsRouter);
app.use('/api/v1/socio', socioRouter);
app.use('/api/v1/integrations', integrationsRouter);
app.use('/api/v1/tenants', tenantsRouter);

function liveness(_req: Request, res: Response) {
  res.status(200).json({ success: true, status: 'HEALTHY', timestamp: new Date().toISOString(), services: { api: 'RUNNING' } });
}

async function readiness(_req: Request, res: Response) {
  let dbStatus: ReadinessSnapshot['database'] = 'ERROR';
  let latency = 0;
  const missingSchema: string[] = [];
  let queuePending: number | null = null;
  let queueDeadLetter: number | null = null;

  try {
    const start = Date.now();
    // Execute raw select check using Prisma
    await prisma.$queryRaw`SELECT NOW()`;
    const required = await prisma.$queryRaw<Array<{ table_name: string; column_name: string }>>`
      SELECT table_name, column_name FROM information_schema.columns
      WHERE table_schema='public' AND (table_name, column_name) IN (
        ('media_assets','kind'), ('media_assets','source_asset_id'), ('reports','title'),
        ('incidents','triage_owner_id'), ('resolution_submissions','verification_result'),
        ('notifications','idempotency_key'), ('audit_logs','chain_sequence'), ('audit_logs','hash_version')
      )`;
    const present = new Set(required.map((row) => `${row.table_name}.${row.column_name}`));
    for (const expected of REQUIRED_COLUMNS) if (!present.has(expected)) missingSchema.push(expected);
    const tables = await prisma.$queryRaw<Array<{ table_name: string }>>`SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name IN ('incident_timeline_events','triage_assignments','resolution_decisions','service_heartbeats','jobs','outbox_events','audit_chain_heads')`;
    const tableSet = new Set(tables.map((row) => row.table_name));
    for (const table of REQUIRED_TABLES) if (!tableSet.has(table)) missingSchema.push(table);
    if (tableSet.has('jobs')) {
      const queue = await prisma.$queryRaw<Array<{ pending: bigint; dead_letter: bigint }>>`
        SELECT COUNT(*) FILTER (WHERE status IN ('QUEUED','RETRY_WAIT')) AS pending,
               COUNT(*) FILTER (WHERE status='DEAD_LETTER') AS dead_letter
        FROM jobs`;
      queuePending = Number(queue[0]?.pending || 0);
      queueDeadLetter = Number(queue[0]?.dead_letter || 0);
    }
    latency = Date.now() - start;
    dbStatus = 'CONNECTED';
  } catch (error) {
    console.error(JSON.stringify({ timestamp: new Date().toISOString(), service: 'api', module: 'readiness', operation: 'database', status: 'ERROR', errorType: error instanceof Error ? error.name : 'UnknownError' }));
  }

  const storageStatus = isConfigured('SUPABASE_URL') && isConfigured('SUPABASE_SERVICE_ROLE_KEY') ? 'CONFIGURED' : 'NOT_CONFIGURED';
  let aiStatus = process.env.ML_SERVICE_URL ? 'UNREACHABLE' : 'NOT_CONFIGURED';
  if (process.env.ML_SERVICE_URL) {
    try {
      const response = await fetch(`${process.env.ML_SERVICE_URL.replace(/\/$/, '')}/health`, { signal: AbortSignal.timeout(2500) });
      aiStatus = response.ok ? 'AVAILABLE' : `HTTP_${response.status}`;
    } catch { aiStatus = 'UNREACHABLE'; }
  }
  let workerStatus: ReadinessSnapshot['worker'] = 'UNKNOWN';
  if (dbStatus === 'CONNECTED' && !missingSchema.includes('service_heartbeats')) {
    const heartbeats = await prisma.$queryRaw<Array<{ updated_at: Date }>>`SELECT updated_at FROM service_heartbeats WHERE service='worker'`.catch(() => []);
    workerStatus = heartbeats[0] && Date.now() - heartbeats[0].updated_at.getTime() < 30_000 ? 'AVAILABLE' : 'STALE_OR_NOT_RUNNING';
  }
  const snapshot: ReadinessSnapshot = {
    database: dbStatus,
    dbLatencyMs: latency,
    missingSchema,
    storage: storageStatus,
    ai: aiStatus as ReadinessSnapshot['ai'],
    worker: workerStatus,
    queue: dbStatus === 'CONNECTED' && !missingSchema.includes('jobs') ? 'AVAILABLE' : 'UNAVAILABLE',
    queuePending,
    queueDeadLetter,
  };
  const policy = evaluateReadiness(snapshot, process.env.REQUIRE_STORAGE_READY !== 'false');

  res.status(policy.ready ? 200 : 503).json({
    success: policy.ready,
    status: policy.status,
    timestamp: new Date().toISOString(),
    blockingReasons: policy.blockingReasons,
    degradedReasons: policy.degradedReasons,
    services: {
      postgresql: dbStatus,
      api: 'RUNNING',
      storage: storageStatus,
      ai: aiStatus,
      worker: workerStatus,
      schema: missingSchema.length ? 'INCOMPATIBLE' : 'COMPATIBLE',
      queue: snapshot.queue,
    },
    missingSchema,
    queue: { pending: queuePending, deadLetter: queueDeadLetter },
    performance: {
      dbLatencyMs: latency
    }
  });
}

// Liveness never depends on external services; readiness does.
app.get('/health', liveness);
app.get('/api/v1/health', liveness);
app.get('/ready', readiness);
app.get('/api/v1/ready', readiness);

export default app;
export { prisma };
