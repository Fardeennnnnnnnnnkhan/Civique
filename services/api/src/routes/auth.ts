import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../db';
import { UserRole } from '@prisma/client';
import { clearSessionCookies, createSession, hashToken, rotateSession, revokeSession, revokeAllSessions, setCsrfCookie, setSessionCookies } from '../utils/sessions';
import rateLimit from 'express-rate-limit';
import { AuthenticatedRequest, authenticateJWT, requireCookieCsrf } from '../middleware/auth';
import { z } from 'zod';
import { AuthTokenPurpose, consumeAuthActionTokenWithDb, issueAuthActionToken } from '../services/authTokens';
import { enqueueOutbox } from '../jobs/queue';
import { createMfaEnrollment, decryptMfaSecret, encryptMfaSecret, verifyTotpCode } from '../services/mfa';
import { recordSecurityEvent } from '../services/securityEvents';

const router = Router();
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20, standardHeaders: true, legacyHeaders: false, message: { success: false, error: { code: 'RATE_LIMITED', message: 'Too many authentication attempts' } } });
const recoveryLimiter = rateLimit({ windowMs: 60 * 60 * 1000, max: 10, standardHeaders: true, legacyHeaders: false, message: { success: false, error: { code: 'RATE_LIMITED', message: 'Too many recovery attempts' } } });

const emailSchema = z.string().trim().email().max(254).transform((value) => value.toLowerCase());
const passwordSchema = z.string().min(8).max(128).regex(/[a-z]/, 'Password must include a lowercase letter').regex(/[A-Z]/, 'Password must include an uppercase letter').regex(/[0-9]/, 'Password must include a number');
const passwordRequirementsMessage = 'Password must be 8–128 characters and include at least one lowercase letter, one uppercase letter, and one number.';

const getAccessTokenSecret = () => { if (!process.env.JWT_ACCESS_SECRET) throw new Error('JWT_ACCESS_SECRET is not configured'); return process.env.JWT_ACCESS_SECRET; };

function generateAccessToken(user: { id: string; email: string | null; role: UserRole }) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    getAccessTokenSecret(),
    { expiresIn: '15m' }
  );
}

function generateMfaChallenge(userId: string): string {
  return jwt.sign({ sub: userId, purpose: 'MFA_CHALLENGE' }, getAccessTokenSecret(), { expiresIn: '5m' });
}

function isOfficialRole(role: UserRole): boolean {
  return role !== UserRole.CITIZEN;
}

async function issueSession(res: Response, user: { id: string; email: string | null; role: UserRole }) {
  const accessToken = generateAccessToken(user);
  const refreshToken = await createSession(user.id);
  setSessionCookies(res, accessToken, refreshToken);
  return accessToken;
}


// POST /api/v1/auth/register
router.post('/register', authLimiter, async (req: Request, res: Response) => {
  const parsed = z.object({ email: emailSchema, password: passwordSchema, phoneNumber: z.string().trim().min(7).max(30).optional() }).safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Enter a valid email and a password with at least 8 characters, upper/lowercase letters, and a number',
        details: parsed.error.flatten().fieldErrors,
      }
    });
  }
  const { email, password, phoneNumber } = parsed.data;

  try {
    // Check if user already exists
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email },
          phoneNumber ? { phoneNumber } : {}
        ]
      }
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'USER_EXISTS',
          message: 'User with this email or phone number already exists'
        }
      });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Create user
    const newUser = await prisma.user.create({
      data: {
        email,
        passwordHash,
        phoneNumber: phoneNumber || null,
        role: UserRole.CITIZEN
      }
    });

    // Generate tokens
    const accessToken = generateAccessToken(newUser);
    const refreshToken = await createSession(newUser.id);
    setSessionCookies(res, accessToken, refreshToken);

    res.status(201).json({
      success: true,
      data: {
        accessToken,
        user: {
          id: newUser.id,
          email: newUser.email,
          role: newUser.role
        }
      }
    });
  } catch (err) {
    console.error('Registration failed:', err);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Something went wrong during registration'
      }
    });
  }
});

// POST /api/v1/auth/login
router.post('/login', authLimiter, async (req: Request, res: Response) => {
  const parsed = z.object({ email: emailSchema, password: z.string().min(1).max(128), mfaCode: z.string().regex(/^\d{6}$/).optional() }).safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Email and password are required'
      }
    });
  }
  const { email, password } = parsed.data;

  try {
    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user || !user.passwordHash) {
      void recordSecurityEvent(prisma, { type: 'LOGIN_FAILURE', success: false, req, metadata: { reason: 'INVALID_CREDENTIALS' } }).catch(() => undefined);
      return res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid email or password'
        }
      });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      void recordSecurityEvent(prisma, { type: 'LOGIN_FAILURE', userId: user.id, success: false, req, metadata: { reason: 'INVALID_CREDENTIALS' } }).catch(() => undefined);
      return res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid email or password'
        }
      });
    }

    if (!user.active) {
      void recordSecurityEvent(prisma, { type: 'LOGIN_FAILURE', userId: user.id, success: false, req, metadata: { reason: 'ACCOUNT_SUSPENDED' } }).catch(() => undefined);
      return res.status(403).json({
        success: false,
        error: { code: 'ACCOUNT_SUSPENDED', message: 'This account is suspended. Contact a Civique administrator.' }
      });
    }

    const mfaCode = parsed.data.mfaCode;
    if (user.mfaEnabled) {
      let validMfa = false;
      try {
        validMfa = Boolean(mfaCode && user.mfaSecretEncrypted && verifyTotpCode(decryptMfaSecret(user.mfaSecretEncrypted), mfaCode));
      } catch {
        validMfa = false;
      }
      if (!validMfa) {
        void recordSecurityEvent(prisma, { type: mfaCode ? 'MFA_FAILURE' : 'LOGIN_FAILURE', userId: user.id, success: false, req, metadata: { reason: mfaCode ? 'INVALID_MFA_CODE' : 'MFA_REQUIRED' } }).catch(() => undefined);
        if (!mfaCode) {
          setCsrfCookie(res);
          return res.status(401).json({ success: false, error: { code: 'MFA_REQUIRED', message: 'Multi-factor verification is required', challengeToken: generateMfaChallenge(user.id) } });
        }
        return res.status(401).json({ success: false, error: { code: 'MFA_INVALID', message: 'The multi-factor code is invalid or expired' } });
      }
    }

    const accessToken = await issueSession(res, user);
    void recordSecurityEvent(prisma, { type: user.mfaEnabled ? 'MFA_SUCCESS' : 'LOGIN_SUCCESS', userId: user.id, success: true, req }).catch(() => undefined);

    res.status(200).json({
      success: true,
      data: {
        accessToken,
        user: {
          id: user.id,
          email: user.email,
          role: user.role
        }
      }
    });
  } catch (err) {
    console.error('Login failed:', err);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Something went wrong during login'
      }
    });
  }
});

// POST /api/v1/auth/refresh
router.post('/refresh', authLimiter, requireCookieCsrf, async (req: Request, res: Response) => {
  const refreshToken = req.body.refreshToken || (req.headers.cookie || '').match(/(?:^|;\s*)civique_refresh=([^;]+)/)?.[1];

  if (!refreshToken) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'REFRESH_TOKEN_REQUIRED',
        message: 'Refresh token is required'
      }
    });
  }

  try {
    const rotated = await rotateSession(refreshToken);
    const user = rotated ? await prisma.user.findUnique({ where: { id: rotated.userId } }) : null;

    if (!user || !user.active) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'User is suspended or does not exist'
        }
      });
    }

    const newAccessToken = generateAccessToken(user);
    setSessionCookies(res, newAccessToken, rotated!.token);

    res.status(200).json({
      success: true,
      data: {
        accessToken: newAccessToken,
      }
    });
  } catch (err) {
    void recordSecurityEvent(prisma, { type: 'REFRESH_REPLAY', success: false, req, metadata: { reason: 'INVALID_OR_REPLAYED_REFRESH' } }).catch(() => undefined);
    return res.status(403).json({
      success: false,
      error: {
        code: 'FORBIDDEN',
        message: 'Invalid or expired refresh token'
      }
    });
  }
});

// POST /api/v1/auth/logout
router.post('/logout', requireCookieCsrf, async (req: Request, res: Response) => {
  const token = req.body.refreshToken || (req.headers.cookie || '').match(/(?:^|;\s*)civique_refresh=([^;]+)/)?.[1];
  const session = token ? await prisma.userSession.findUnique({ where: { tokenHash: hashToken(token) }, select: { userId: true } }) : null;
  if (token) await revokeSession(token);
  await recordSecurityEvent(prisma, { type: 'LOGOUT', userId: session?.userId, success: true, req });
  clearSessionCookies(res);
  res.status(200).json({
    success: true,
    message: 'Logged out successfully'
  });
});

router.post('/logout-all', requireCookieCsrf, async (req: Request, res: Response) => {
  const token = req.body.refreshToken || (req.headers.cookie || '').match(/(?:^|;\s*)civique_refresh=([^;]+)/)?.[1];
  const session = token ? await prisma.userSession.findUnique({ where: { tokenHash: hashToken(token) }, select: { userId: true } }) : null;
  if (session) await revokeAllSessions(session.userId);
  await recordSecurityEvent(prisma, { type: 'LOGOUT', userId: session?.userId, success: true, req, metadata: { allSessions: true } });
  clearSessionCookies(res);
  res.status(200).json({ success: true, message: 'All sessions revoked' });
});

router.post('/mfa/enroll', authenticateJWT, async (req: AuthenticatedRequest, res: Response) => {
  const user = await prisma.user.findUnique({ where: { id: req.user!.id }, select: { id: true, email: true, role: true, mfaEnabled: true } });
  if (!user || !isOfficialRole(user.role)) return res.status(403).json({ success: false, error: { code: 'OFFICIAL_MFA_REQUIRED', message: 'MFA enrollment is available only to official accounts.' } });
  if (user.mfaEnabled) return res.status(409).json({ success: false, error: { code: 'MFA_ALREADY_ENABLED', message: 'Multi-factor authentication is already enabled.' } });
  const enrollment = createMfaEnrollment(user.email || user.id);
  await prisma.user.update({ where: { id: user.id }, data: { mfaSecretEncrypted: encryptMfaSecret(enrollment.secret) } });
  await recordSecurityEvent(prisma, { type: 'MFA_ENROLLMENT_STARTED', userId: user.id, success: true, req });
  return res.status(201).json({ success: true, data: { secret: enrollment.secret, otpauthUrl: enrollment.otpauthUrl } });
});

router.post('/mfa/confirm', authenticateJWT, async (req: AuthenticatedRequest, res: Response) => {
  const parsed = z.object({ code: z.string().regex(/^\d{6}$/) }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Enter the six-digit authenticator code.' } });
  const user = await prisma.user.findUnique({ where: { id: req.user!.id }, select: { id: true, role: true, mfaEnabled: true, mfaSecretEncrypted: true } });
  if (!user || !isOfficialRole(user.role)) return res.status(403).json({ success: false, error: { code: 'OFFICIAL_MFA_REQUIRED', message: 'MFA enrollment is available only to official accounts.' } });
  if (user.mfaEnabled) return res.status(409).json({ success: false, error: { code: 'MFA_ALREADY_ENABLED', message: 'Multi-factor authentication is already enabled.' } });
  let valid = false;
  try { valid = Boolean(user.mfaSecretEncrypted && verifyTotpCode(decryptMfaSecret(user.mfaSecretEncrypted), parsed.data.code)); } catch { valid = false; }
  if (!valid) {
    await recordSecurityEvent(prisma, { type: 'MFA_FAILURE', userId: user.id, success: false, req, metadata: { reason: 'ENROLLMENT_CODE_INVALID' } });
    return res.status(401).json({ success: false, error: { code: 'MFA_INVALID', message: 'The authenticator code is invalid or expired.' } });
  }
  await prisma.user.update({ where: { id: user.id }, data: { mfaEnabled: true, mfaEnrolledAt: new Date() } });
  await recordSecurityEvent(prisma, { type: 'MFA_ENROLLMENT_COMPLETED', userId: user.id, success: true, req });
  return res.json({ success: true, data: { enabled: true } });
});

router.post('/mfa/verify', authLimiter, requireCookieCsrf, async (req: Request, res: Response) => {
  const parsed = z.object({ challengeToken: z.string().min(20).max(2048), code: z.string().regex(/^\d{6}$/) }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'A valid MFA challenge and six-digit code are required.' } });
  let userId: string;
  try {
    const challenge = jwt.verify(parsed.data.challengeToken, getAccessTokenSecret()) as { sub?: string; purpose?: string };
    if (challenge.purpose !== 'MFA_CHALLENGE' || !challenge.sub) throw new Error('INVALID_MFA_CHALLENGE');
    userId = challenge.sub;
  } catch {
    return res.status(401).json({ success: false, error: { code: 'MFA_CHALLENGE_INVALID', message: 'The MFA challenge is invalid or expired.' } });
  }
  const user = await prisma.user.findUnique({ where: { id: userId } });
  let valid = false;
  try { valid = Boolean(user?.active && user.mfaEnabled && user.mfaSecretEncrypted && verifyTotpCode(decryptMfaSecret(user.mfaSecretEncrypted), parsed.data.code)); } catch { valid = false; }
  if (!user || !valid) {
    await recordSecurityEvent(prisma, { type: 'MFA_FAILURE', userId: user?.id, success: false, req, metadata: { reason: 'CHALLENGE_CODE_INVALID' } });
    return res.status(401).json({ success: false, error: { code: 'MFA_INVALID', message: 'The multi-factor code is invalid or expired.' } });
  }
  const accessToken = await issueSession(res, user);
  await recordSecurityEvent(prisma, { type: 'MFA_SUCCESS', userId: user.id, success: true, req });
  return res.json({ success: true, data: { accessToken, user: { id: user.id, email: user.email, role: user.role } } });
});

router.post('/password-recovery/request', recoveryLimiter, async (req: Request, res: Response) => {
  const parsed = z.object({ email: emailSchema }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Enter a valid email address' } });

  let developmentToken: string | undefined;
  try {
    const user = await prisma.user.findUnique({ where: { email: parsed.data.email }, select: { id: true, email: true, active: true } });
    if (user?.active && user.email) {
      await prisma.$transaction(async (tx) => {
        const issued = await issueAuthActionToken(tx, { userId: user.id, purpose: AuthTokenPurpose.PASSWORD_RESET, expiresInMs: 30 * 60 * 1000 });
        developmentToken = issued.token;
        await enqueueOutbox(tx, {
          topic: 'auth.password-recovery.requested',
          payload: { userId: user.id, email: user.email, token: issued.token, expiresInMinutes: 30 },
          idempotencyKey: `password-recovery:${issued.record.id}`,
        });
      });
    }
  } catch (error) {
    console.error('Password recovery request failed:', error);
  }

  return res.status(202).json({
    success: true,
    data: {
      message: 'If an active account exists for that address, a password reset link has been queued.',
      ...(process.env.NODE_ENV !== 'production' && developmentToken ? { developmentToken } : {}),
    },
  });
});

router.post('/password-recovery/reset', recoveryLimiter, async (req: Request, res: Response) => {
  const parsed = z.object({ token: z.string().min(32).max(256), password: passwordSchema }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'The token or new password is invalid', details: parsed.error.flatten().fieldErrors } });
  const passwordHash = await bcrypt.hash(parsed.data.password, 12);
  const reset = await consumeAuthActionTokenWithDb(prisma, parsed.data.token, AuthTokenPurpose.PASSWORD_RESET, async (tx, userId) => {
    await tx.user.update({ where: { id: userId }, data: { passwordHash } });
    await tx.userSession.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: new Date() } });
    return userId;
  });
  if (!reset) return res.status(400).json({ success: false, error: { code: 'INVALID_OR_EXPIRED_TOKEN', message: 'This password reset link is invalid or expired' } });
  void recordSecurityEvent(prisma, { type: 'PASSWORD_RESET', userId: reset, success: true, req }).catch(() => undefined);
  clearSessionCookies(res);
  return res.json({ success: true, data: { message: 'Password updated. Sign in again on every device.' } });
});

router.post('/invitations/:token/accept', authLimiter, async (req: Request, res: Response) => {
  const parsed = z.object({ password: passwordSchema, phoneNumber: z.string().trim().min(7).max(30).optional() }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: passwordRequirementsMessage, details: parsed.error.flatten().fieldErrors } });
  const passwordHash = await bcrypt.hash(parsed.data.password, 12);
  const accepted = await consumeAuthActionTokenWithDb(prisma, req.params.token, AuthTokenPurpose.INVITATION, async (tx, userId) => {
    const user = await tx.user.findUnique({ where: { id: userId }, select: { active: true } });
    if (!user || user.active) throw new Error('INVITATION_ACCOUNT_NOT_PENDING');
    return tx.user.update({ where: { id: userId }, data: { passwordHash, phoneNumber: parsed.data.phoneNumber, active: true }, select: { id: true, email: true, role: true } });
  }).catch((error: unknown) => {
    if (error instanceof Error && error.message === 'INVITATION_ACCOUNT_NOT_PENDING') return null;
    throw error;
  });
  if (!accepted) return res.status(400).json({ success: false, error: { code: 'INVALID_OR_EXPIRED_TOKEN', message: 'This invitation is invalid, expired, or already accepted' } });
  return res.json({ success: true, data: { message: 'Account activated. You can now sign in.', user: accepted } });
});

router.get('/me', authenticateJWT, async (req: AuthenticatedRequest, res: Response) => {
  const user = await prisma.user.findUnique({ where: { id: req.user!.id }, select: { id: true, email: true, phoneNumber: true, role: true, cityId: true, zoneId: true, wardId: true, departmentId: true, active: true, mfaEnabled: true } });
  if (!user) return res.status(404).json({ success: false, error: { code: 'USER_NOT_FOUND', message: 'User not found' } });
  res.json({ success: true, data: { user } });
});

router.get('/sessions', authenticateJWT, async (req: AuthenticatedRequest, res: Response) => {
  const sessions = await prisma.userSession.findMany({ where: { userId: req.user!.id, revokedAt: null }, select: { id: true, createdAt: true, lastUsedAt: true, expiresAt: true }, orderBy: { createdAt: 'desc' } });
  res.json({ success: true, data: { sessions } });
});

router.delete('/sessions/:id', authenticateJWT, async (req: AuthenticatedRequest, res: Response) => {
  const sessionId = z.string().uuid().safeParse(req.params.id);
  if (!sessionId.success) return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Session id is invalid.' } });
  const revoked = await prisma.userSession.updateMany({ where: { id: sessionId.data, userId: req.user!.id, revokedAt: null }, data: { revokedAt: new Date() } });
  if (revoked.count !== 1) return res.status(404).json({ success: false, error: { code: 'SESSION_NOT_FOUND', message: 'The session was not found or is already revoked.' } });
  await recordSecurityEvent(prisma, { type: 'LOGOUT', userId: req.user!.id, success: true, req, metadata: { sessionId: sessionId.data, device: 'session-management' } });
  return res.json({ success: true, data: { revoked: true } });
});

export default router;
