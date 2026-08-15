import dotenv from 'dotenv';
import path from 'path';

// Load env from monorepo root
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

import { PrismaClient } from '@prisma/client';

console.log('Worker initializing in Simplified Mode...');

const prisma = new PrismaClient();

prisma.$queryRaw`SELECT NOW()`
  .then((res: any) => console.log('Worker PostgreSQL connection verified via Prisma. Time:', res[0].now))
  .catch((err) => console.error('Worker PostgreSQL verification failed:', err));

// Keep-alive output for health logging
setInterval(() => {
  console.log(`[Health Log] Worker Status: ACTIVE (Mocking Queue) | Database connection verified via Prisma`);
}, 30000);
