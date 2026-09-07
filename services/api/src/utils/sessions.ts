import crypto from 'crypto';
import { prisma } from '../db';

const REFRESH_DAYS = 7;
export function hashToken(token: string): string { return crypto.createHash('sha256').update(token).digest('hex'); }
export async function createSession(userId: string): Promise<string> {
  const token = crypto.randomBytes(48).toString('base64url');
  await prisma.userSession.create({ data: { userId, tokenHash: hashToken(token), familyId: crypto.randomUUID(), expiresAt: new Date(Date.now() + REFRESH_DAYS * 86400000) } });
  return token;
}
export async function rotateSession(token: string): Promise<{ userId: string; token: string } | null> {
  const session = await prisma.userSession.findUnique({ where: { tokenHash: hashToken(token) } });
  if (!session || session.expiresAt <= new Date()) return null;
  if (session.revokedAt) {
    // Reuse detection: invalidate the entire token family after replay.
    await prisma.userSession.updateMany({ where: { familyId: session.familyId, revokedAt: null }, data: { revokedAt: new Date() } });
    return null;
  }
  const next = crypto.randomBytes(48).toString('base64url');
  const created = await prisma.$transaction(async (tx) => {
    const replacement = await tx.userSession.create({ data: { userId: session.userId, tokenHash: hashToken(next), familyId: session.familyId, expiresAt: new Date(Date.now() + REFRESH_DAYS * 86400000) } });
    await tx.userSession.update({ where: { id: session.id }, data: { revokedAt: new Date(), replacedById: replacement.id, lastUsedAt: new Date() } });
    return replacement;
  });
  return { userId: created.userId, token: next };
}
export async function revokeSession(token: string): Promise<void> { await prisma.userSession.updateMany({ where: { tokenHash: hashToken(token), revokedAt: null }, data: { revokedAt: new Date() } }); }
export async function revokeAllSessions(userId: string): Promise<void> { await prisma.userSession.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: new Date() } }); }
export function setRefreshCookie(res: { setHeader(name: string, value: string): void }, token: string) { res.setHeader('Set-Cookie', `civique_refresh=${token}; HttpOnly; Path=/api/v1/auth; Max-Age=${REFRESH_DAYS * 86400}; SameSite=Lax${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`); }
export function setAuthCookies(res: { setHeader(name: string, value: string | string[]): void }, accessToken: string) {
  const csrf = crypto.randomBytes(24).toString('base64url');
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  res.setHeader('Set-Cookie', [
    `civique_access=${accessToken}; HttpOnly; Path=/; Max-Age=900; SameSite=Lax${secure}`,
    `civique_csrf=${csrf}; Path=/; Max-Age=900; SameSite=Lax${secure}`,
  ]);
}
export function setSessionCookies(res: { setHeader(name: string, value: string | string[]): void }, accessToken: string, refreshToken: string) {
  const csrf = crypto.randomBytes(24).toString('base64url');
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  res.setHeader('Set-Cookie', [
    `civique_access=${accessToken}; HttpOnly; Path=/; Max-Age=900; SameSite=Lax${secure}`,
    `civique_refresh=${refreshToken}; HttpOnly; Path=/api/v1/auth; Max-Age=${REFRESH_DAYS * 86400}; SameSite=Lax${secure}`,
    `civique_csrf=${csrf}; Path=/; Max-Age=900; SameSite=Lax${secure}`,
  ]);
}
