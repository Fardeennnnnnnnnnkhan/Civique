import { PrismaClient } from '@prisma/client';

// Global shared Prisma Client to avoid connection pool exhaustion
export const prisma = new PrismaClient({
  log: [
    { emit: 'event', level: 'warn' },
    { emit: 'event', level: 'error' },
  ],
});

prisma.$on('warn', () => {
  console.warn(JSON.stringify({ timestamp: new Date().toISOString(), service: 'api', module: 'database', operation: 'prisma', status: 'WARN' }));
});

prisma.$on('error', () => {
  console.error(JSON.stringify({ timestamp: new Date().toISOString(), service: 'api', module: 'database', operation: 'prisma', status: 'ERROR' }));
});
