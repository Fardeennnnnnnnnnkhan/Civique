import assert from 'assert';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { AddressInfo } from 'net';
import { UserRole } from '@prisma/client';
import app from '../app';
import { prisma } from '../db';
import { getCurrentTotpCode } from '../services/mfa';

function cookieHeader(response: Response) {
  const headers = response.headers as Headers & { getSetCookie?: () => string[] };
  const values = headers.getSetCookie?.() ?? [response.headers.get('set-cookie') || ''];
  return values.map((value) => value.split(';', 1)[0]).filter(Boolean).join('; ');
}

function cookieValue(cookies: string, name: string) {
  return cookies.split('; ').find((value) => value.startsWith(`${name}=`))?.slice(name.length + 1) || '';
}

async function json(response: Response) {
  return response.json() as Promise<{ success: boolean; data?: Record<string, unknown>; error?: { code: string; message: string } }>;
}

async function run() {
  process.env.JWT_ACCESS_SECRET ||= 'integration-test-access-secret-that-is-long-enough';
  process.env.NODE_ENV = 'test';
  const server = app.listen(0, '127.0.0.1');
  await new Promise<void>((resolve) => server.once('listening', resolve));
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api/v1`;
  const suffix = crypto.randomUUID();
  const citizenEmail = `codex-http-${suffix}@example.invalid`;
  const adminEmail = `codex-admin-${suffix}@example.invalid`;
  const inviteEmail = `codex-invite-${suffix}@example.invalid`;
  const city = await prisma.city.create({ data: { name: `Codex Test City ${suffix}` } });
  await prisma.user.create({ data: { email: adminEmail, passwordHash: await bcrypt.hash('Admin1Password', 4), role: UserRole.SUPER_ADMIN } });

  try {
    const registration = await fetch(`${base}/auth/register`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: citizenEmail, password: 'Citizen1Password', role: 'SUPER_ADMIN' }) });
    assert.strictEqual(registration.status, 201);
    const registrationBody = await json(registration);
    assert.strictEqual((registrationBody.data?.user as { role: string }).role, UserRole.CITIZEN, 'Public registration must ignore privileged roles');
    const citizenCookies = cookieHeader(registration);

    const me = await fetch(`${base}/auth/me`, { headers: { cookie: citizenCookies } });
    assert.strictEqual(me.status, 200, 'HttpOnly cookie session should authenticate /auth/me');

    const recovery = await fetch(`${base}/auth/password-recovery/request`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: citizenEmail }) });
    assert.strictEqual(recovery.status, 202);
    const recoveryBody = await json(recovery);
    const resetToken = recoveryBody.data?.developmentToken;
    assert.strictEqual(typeof resetToken, 'string');
    const reset = await fetch(`${base}/auth/password-recovery/reset`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ token: resetToken, password: 'Citizen2Password' }) });
    assert.strictEqual(reset.status, 200);
    const replay = await fetch(`${base}/auth/password-recovery/reset`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ token: resetToken, password: 'Citizen3Password' }) });
    assert.strictEqual(replay.status, 400, 'Password recovery token must be single use');

    const adminLogin = await fetch(`${base}/auth/login`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: adminEmail, password: 'Admin1Password' }) });
    assert.strictEqual(adminLogin.status, 200);
    const adminCookies = cookieHeader(adminLogin);
    const invitation = await fetch(`${base}/users/invitations`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', cookie: adminCookies, 'x-csrf-token': cookieValue(adminCookies, 'civique_csrf') },
      body: JSON.stringify({ email: inviteEmail, role: UserRole.CITY_ADMIN, cityId: city.id }),
    });
    assert.strictEqual(invitation.status, 201, JSON.stringify(await invitation.clone().json()));
    const invitationBody = await json(invitation);
    const invitationToken = (invitationBody.data?.invitation as { developmentToken?: string }).developmentToken;
    assert.strictEqual(typeof invitationToken, 'string');
    const acceptance = await fetch(`${base}/auth/invitations/${encodeURIComponent(invitationToken!)}/accept`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ password: 'Official1Password' }) });
    assert.strictEqual(acceptance.status, 200);

    const officialLogin = await fetch(`${base}/auth/login`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: inviteEmail, password: 'Official1Password' }) });
    assert.strictEqual(officialLogin.status, 200);
    const officialCookies = cookieHeader(officialLogin);
    const officialCsrf = cookieValue(officialCookies, 'civique_csrf');
    const enrollment = await fetch(`${base}/auth/mfa/enroll`, { method: 'POST', headers: { 'content-type': 'application/json', cookie: officialCookies, 'x-csrf-token': officialCsrf } });
    assert.strictEqual(enrollment.status, 201);
    const enrollmentBody = await json(enrollment);
    const secret = (enrollmentBody.data as { secret: string }).secret;
    const confirmation = await fetch(`${base}/auth/mfa/confirm`, { method: 'POST', headers: { 'content-type': 'application/json', cookie: officialCookies, 'x-csrf-token': officialCsrf }, body: JSON.stringify({ code: getCurrentTotpCode(secret) }) });
    assert.strictEqual(confirmation.status, 200);

    const csrfBlockedLogout = await fetch(`${base}/auth/logout`, { method: 'POST', headers: { cookie: officialCookies, 'content-type': 'application/json' }, body: '{}' });
    assert.strictEqual(csrfBlockedLogout.status, 403, 'Cookie logout must require double-submit CSRF');
    const officialLogout = await fetch(`${base}/auth/logout`, { method: 'POST', headers: { cookie: officialCookies, 'x-csrf-token': officialCsrf, 'content-type': 'application/json' }, body: '{}' });
    assert.strictEqual(officialLogout.status, 200);

    const mfaRequiredLogin = await fetch(`${base}/auth/login`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: inviteEmail, password: 'Official1Password' }) });
    assert.strictEqual(mfaRequiredLogin.status, 401);
    const mfaChallenge = (await json(mfaRequiredLogin)).error as { challengeToken?: string };
    assert.equal(typeof mfaChallenge.challengeToken, 'string');
    const mfaVerifiedLogin = await fetch(`${base}/auth/mfa/verify`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ challengeToken: mfaChallenge.challengeToken, code: getCurrentTotpCode(secret) }) });
    assert.strictEqual(mfaVerifiedLogin.status, 200);
    const officialUser = await prisma.user.findUniqueOrThrow({ where: { email: inviteEmail } });
    const securityEventCount = await prisma.securityEvent.count({ where: { userId: officialUser.id, type: { in: ['MFA_ENROLLMENT_COMPLETED', 'MFA_SUCCESS', 'LOGOUT'] } } });
    assert.ok(securityEventCount >= 3, 'MFA and logout actions must be auditable');

    const citizen = await prisma.user.findUniqueOrThrow({ where: { email: citizenEmail } });
    await prisma.user.update({ where: { id: citizen.id }, data: { active: false } });
    const suspendedLogin = await fetch(`${base}/auth/login`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: citizenEmail, password: 'Citizen2Password' }) });
    assert.strictEqual(suspendedLogin.status, 403);
    assert.strictEqual((await json(suspendedLogin)).error?.code, 'ACCOUNT_SUSPENDED');
  } finally {
    await prisma.user.deleteMany({ where: { email: { in: [citizenEmail, adminEmail, inviteEmail] } } });
    await prisma.city.delete({ where: { id: city.id } });
    await prisma.$disconnect();
    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
}

run().then(() => console.log('Authentication HTTP integration checks passed.')).catch(async (error) => {
  console.error(error);
  await prisma.$disconnect();
  process.exitCode = 1;
});
