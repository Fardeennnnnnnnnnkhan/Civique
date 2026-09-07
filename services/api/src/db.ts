import { PrismaClient } from '@prisma/client';

// Global shared Prisma Client to avoid connection pool exhaustion
export const prisma = new PrismaClient({
  log: ['warn', 'error'],
});
