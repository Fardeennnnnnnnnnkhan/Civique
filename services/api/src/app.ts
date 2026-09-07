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
import { getAllowedOrigins, isConfigured } from './utils/env';

const app = express();

app.use(cors({ origin: getAllowedOrigins(), credentials: true }));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: false, limit: '1mb' }));

// Register Routers
app.use('/api/v1/auth', authRouter);
app.use('/api/v1/geography', geographyRouter);
app.use('/api/v1/reports', reportsRouter);
app.use('/api/v1/incidents', incidentsRouter);
app.use('/api/v1/users', usersRouter);
app.use('/api/v1/notifications', notificationsRouter);
app.use('/api/v1/routing', routingRouter);
app.use('/api/v1/sla', slaRouter);

function liveness(_req: Request, res: Response) {
  res.status(200).json({ success: true, status: 'HEALTHY', timestamp: new Date().toISOString(), services: { api: 'RUNNING' } });
}

async function readiness(_req: Request, res: Response) {
  let dbStatus = 'DISCONNECTED';
  let latency = 0;

  try {
    const start = Date.now();
    // Execute raw select check using Prisma
    await prisma.$queryRaw`SELECT NOW()`;
    latency = Date.now() - start;
    dbStatus = 'CONNECTED';
  } catch (err) {
    console.error('Prisma health check query failed:', err);
    dbStatus = 'ERROR';
  }

  const storageStatus = isConfigured('SUPABASE_URL') && isConfigured('SUPABASE_ANON_KEY') ? 'CONFIGURED' : 'NOT_CONFIGURED';
  const aiStatus = process.env.ML_SERVICE_URL ? 'CONFIGURED' : 'NOT_CONFIGURED';
  const status = dbStatus === 'CONNECTED' ? 'HEALTHY' : 'DEGRADED';

  res.status(status === 'HEALTHY' ? 200 : 503).json({
    success: true,
    status,
    timestamp: new Date().toISOString(),
    services: {
      postgresql: dbStatus,
      api: 'RUNNING',
      storage: storageStatus,
      ai: aiStatus,
      worker: dbStatus === 'CONNECTED' ? 'DATABASE_QUEUE_AVAILABLE' : 'UNKNOWN'
    },
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
