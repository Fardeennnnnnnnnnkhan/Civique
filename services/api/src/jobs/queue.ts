import { Prisma, PrismaClient } from '@prisma/client';
type Db = PrismaClient | Prisma.TransactionClient;
export async function enqueueJob(db: Db, input: { type: string; payload: Prisma.InputJsonValue; idempotencyKey?: string; maxAttempts?: number }) {
  if (!input.idempotencyKey) {
    return db.job.create({ data: { type: input.type, payload: input.payload, maxAttempts: input.maxAttempts ?? 5 } });
  }
  return db.job.upsert({ where: { idempotencyKey: input.idempotencyKey }, create: { type: input.type, payload: input.payload, idempotencyKey: input.idempotencyKey, maxAttempts: input.maxAttempts ?? 5 }, update: {} });
}
export async function enqueueOutbox(db: Db, input: { topic: string; payload: Prisma.InputJsonValue; idempotencyKey?: string }) {
  if (!input.idempotencyKey) {
    return db.outboxEvent.create({ data: { topic: input.topic, payload: input.payload } });
  }
  return db.outboxEvent.upsert({ where: { idempotencyKey: input.idempotencyKey }, create: { topic: input.topic, payload: input.payload, idempotencyKey: input.idempotencyKey }, update: {} });
}
