import express, { Request, Response } from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';
import authRouter from './routes/auth';

const app = express();

app.use(cors());
app.use(express.json());

// Initialize Prisma Client
const prisma = new PrismaClient();

// Register Authentication Router
app.use('/api/v1/auth', authRouter);

// GET /api/v1/health
app.get('/api/v1/health', async (req: Request, res: Response) => {
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

  const status = dbStatus === 'CONNECTED' ? 'HEALTHY' : 'DEGRADED';

  res.status(status === 'HEALTHY' ? 200 : 500).json({
    success: true,
    status,
    timestamp: new Date().toISOString(),
    services: {
      postgresql: dbStatus,
      api: 'RUNNING'
    },
    performance: {
      dbLatencyMs: latency
    }
  });
});

export default app;
export { prisma };
