import assert from 'assert';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { UserRole } from '@prisma/client';
import { prisma } from '../db';
import { AuthTokenPurpose, consumeAuthActionTokenWithDb, issueAuthActionToken } from './authTokens';
import { createSession, hashToken, rotateSession } from '../utils/sessions';
import { enqueueJob, enqueueOutbox } from '../jobs/queue';

async function run() {
  const suffix = crypto.randomUUID();
  const user = await prisma.user.create({
    data: { email: `codex-auth-${suffix}@example.invalid`, role: UserRole.CITIZEN, passwordHash: await bcrypt.hash('Initial1Password', 4) },
  });

  try {
    const issued = await issueAuthActionToken(prisma, { userId: user.id, purpose: AuthTokenPurpose.PASSWORD_RESET, expiresInMs: 60_000 });
    assert.notStrictEqual(issued.token, hashToken(issued.token), 'Only the token hash should be persisted');
    const consumed = await consumeAuthActionTokenWithDb(prisma, issued.token, AuthTokenPurpose.PASSWORD_RESET, async (_tx, userId) => userId);
    assert.strictEqual(consumed, user.id);
    const replay = await consumeAuthActionTokenWithDb(prisma, issued.token, AuthTokenPurpose.PASSWORD_RESET, async () => true);
    assert.strictEqual(replay, null, 'A single-use token must reject replay');

    const refresh = await createSession(user.id);
    const rotations = await Promise.all([rotateSession(refresh), rotateSession(refresh)]);
    assert.strictEqual(rotations.filter(Boolean).length, 1, 'Concurrent refresh rotation must mint exactly one replacement');
    const replacement = rotations.find(Boolean);
    assert(replacement);
    assert.strictEqual(await rotateSession(replacement.token), null, 'Refresh-token reuse must revoke the token family');

    const firstJob = await enqueueJob(prisma, { type: 'AUTH_TEST', payload: { suffix } });
    const secondJob = await enqueueJob(prisma, { type: 'AUTH_TEST', payload: { suffix } });
    assert.notStrictEqual(firstJob.id, secondJob.id, 'Jobs without idempotency keys must not collapse together');
    const firstEvent = await enqueueOutbox(prisma, { topic: 'auth.test', payload: { suffix } });
    const secondEvent = await enqueueOutbox(prisma, { topic: 'auth.test', payload: { suffix } });
    assert.notStrictEqual(firstEvent.id, secondEvent.id, 'Outbox events without idempotency keys must not collapse together');
    await prisma.job.deleteMany({ where: { id: { in: [firstJob.id, secondJob.id] } } });
    await prisma.outboxEvent.deleteMany({ where: { id: { in: [firstEvent.id, secondEvent.id] } } });
  } finally {
    await prisma.user.delete({ where: { id: user.id } });
    await prisma.$disconnect();
  }
}

run().then(() => console.log('Authentication lifecycle integration checks passed.')).catch(async (error) => {
  console.error(error);
  await prisma.$disconnect();
  process.exitCode = 1;
});
