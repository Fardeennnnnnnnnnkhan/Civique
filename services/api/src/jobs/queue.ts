import { Prisma, PrismaClient } from '@prisma/client';
type Db = PrismaClient | Prisma.TransactionClient;
export async function enqueueJob(db: Db, input: { type: string; payload: Prisma.InputJsonValue; idempotencyKey?: string; maxAttempts?: number }) {
  return db.job.upsert({ where: { idempotencyKey: input.idempotencyKey || '__no_idempotency_key__' }, create: { type: input.type, payload: input.payload, idempotencyKey: input.idempotencyKey, maxAttempts: input.maxAttempts ?? 5 }, update: {} });
}
export async function enqueueOutbox(db: Db, input: { topic: string; payload: Prisma.InputJsonValue; idempotencyKey?: string }) {
  return db.outboxEvent.upsert({ where: { idempotencyKey: input.idempotencyKey || '__no_idempotency_key__' }, create: { topic: input.topic, payload: input.payload, idempotencyKey: input.idempotencyKey }, update: {} });
}
