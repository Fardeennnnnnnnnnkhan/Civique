import crypto from 'crypto';
import { Prisma, PrismaClient } from '@prisma/client';
import { hashToken } from '../utils/sessions';

type Db = PrismaClient | Prisma.TransactionClient;
export const AuthTokenPurpose = { INVITATION: 'INVITATION', PASSWORD_RESET: 'PASSWORD_RESET' } as const;
export type AuthTokenPurposeValue = typeof AuthTokenPurpose[keyof typeof AuthTokenPurpose];
type AuthActionTokenRecord = { id: string; userId: string; purpose: AuthTokenPurposeValue; expiresAt: Date; createdAt: Date; usedAt: Date | null; revokedAt: Date | null };

const TOKEN_BYTES = 48;

export async function issueAuthActionToken(
  db: Db,
  input: { userId: string; purpose: AuthTokenPurposeValue; expiresInMs: number; createdById?: string },
) {
  const token = crypto.randomBytes(TOKEN_BYTES).toString('base64url');
  const now = new Date();
  await db.$executeRaw`UPDATE "auth_action_tokens" SET "revoked_at" = ${now} WHERE "user_id" = ${input.userId}::uuid AND "purpose" = ${input.purpose}::"AuthTokenPurpose" AND "used_at" IS NULL AND "revoked_at" IS NULL`;
  const rows = await db.$queryRaw<AuthActionTokenRecord[]>`
    INSERT INTO "auth_action_tokens" ("user_id", "purpose", "token_hash", "expires_at", "created_by_id")
    VALUES (${input.userId}::uuid, ${input.purpose}::"AuthTokenPurpose", ${hashToken(token)}, ${new Date(now.getTime() + input.expiresInMs)}, ${input.createdById ?? null}::uuid)
    RETURNING "id", "user_id" AS "userId", "purpose", "expires_at" AS "expiresAt", "created_at" AS "createdAt", "used_at" AS "usedAt", "revoked_at" AS "revokedAt"
  `;
  const record = rows[0];
  if (!record) throw new Error('AUTH_TOKEN_CREATE_FAILED');
  return { record, token };
}

export async function consumeAuthActionTokenWithDb<T>(
  db: PrismaClient,
  token: string,
  purpose: AuthTokenPurposeValue,
  operation: (tx: Prisma.TransactionClient, userId: string) => Promise<T>,
): Promise<T | null> {
  const candidates = await db.$queryRaw<AuthActionTokenRecord[]>`
    SELECT "id", "user_id" AS "userId", "purpose", "expires_at" AS "expiresAt", "created_at" AS "createdAt", "used_at" AS "usedAt", "revoked_at" AS "revokedAt"
    FROM "auth_action_tokens" WHERE "token_hash" = ${hashToken(token)} LIMIT 1
  `;
  const candidate = candidates[0];
  const invitationExpired = Boolean(candidate && purpose === AuthTokenPurpose.INVITATION && candidate.createdAt.getTime() + 60 * 1000 <= Date.now());
  if (!candidate || candidate.purpose !== purpose || candidate.usedAt || candidate.revokedAt || candidate.expiresAt <= new Date() || invitationExpired) return null;

  try {
    return await db.$transaction(async (tx) => {
      const claimed = await tx.$executeRaw`
        UPDATE "auth_action_tokens" SET "used_at" = NOW()
        WHERE "id" = ${candidate.id}::uuid AND "purpose" = ${purpose}::"AuthTokenPurpose" AND "used_at" IS NULL AND "revoked_at" IS NULL AND "expires_at" > NOW()
      `;
      if (claimed !== 1) throw new Error('AUTH_TOKEN_ALREADY_CONSUMED');
      return operation(tx, candidate.userId);
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'AUTH_TOKEN_ALREADY_CONSUMED') return null;
    throw error;
  }
}

export async function revokeOpenAuthActionTokens(db: Db, userId: string) {
  return db.$executeRaw`UPDATE "auth_action_tokens" SET "revoked_at" = NOW() WHERE "user_id" = ${userId}::uuid AND "used_at" IS NULL AND "revoked_at" IS NULL`;
}
