import { Prisma, SecurityEventType } from '@prisma/client';
import { Request } from 'express';
import { prisma } from '../db';

type Db = PrismaClientLike | Prisma.TransactionClient;
type PrismaClientLike = Pick<typeof prisma, 'securityEvent'>;

export function requestSecurityContext(req: Request): { ipAddress?: string; userAgent?: string; requestId?: string } {
  const forwarded = req.header('x-forwarded-for')?.split(',')[0]?.trim();
  return {
    ipAddress: (forwarded || req.socket.remoteAddress || '').slice(0, 128) || undefined,
    userAgent: req.header('user-agent')?.slice(0, 512),
    requestId: typeof req.res?.locals?.requestId === 'string' ? req.res.locals.requestId : undefined,
  };
}

export async function recordSecurityEvent(
  db: Db,
  input: {
    type: SecurityEventType;
    userId?: string;
    success: boolean;
    req?: Request;
    metadata?: Prisma.InputJsonValue;
  },
): Promise<void> {
  const context = input.req ? requestSecurityContext(input.req) : {};
  await db.securityEvent.create({
    data: {
      type: input.type,
      userId: input.userId,
      success: input.success,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      requestId: context.requestId,
      metadata: input.metadata,
    },
  });
}
