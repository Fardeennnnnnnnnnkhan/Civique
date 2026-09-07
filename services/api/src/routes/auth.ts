import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../db';
import { UserRole } from '@prisma/client';
import { createSession, rotateSession, revokeSession, revokeAllSessions, setSessionCookies } from '../utils/sessions';
import rateLimit from 'express-rate-limit';
import { AuthenticatedRequest, authenticateJWT } from '../middleware/auth';

const router = Router();
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20, standardHeaders: true, legacyHeaders: false, message: { success: false, error: { code: 'RATE_LIMITED', message: 'Too many authentication attempts' } } });

const getAccessTokenSecret = () => { if (!process.env.JWT_ACCESS_SECRET) throw new Error('JWT_ACCESS_SECRET is not configured'); return process.env.JWT_ACCESS_SECRET; };

function generateAccessToken(user: { id: string; email: string | null; role: UserRole }) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    getAccessTokenSecret(),
    { expiresIn: '15m' }
  );
}


// POST /api/v1/auth/register
router.post('/register', authLimiter, async (req: Request, res: Response) => {
  const { email, password, phoneNumber } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Email and password are required'
      }
    });
  }

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
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Email and password are required'
      }
    });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user || !user.passwordHash) {
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
      return res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid email or password'
        }
      });
    }

    const accessToken = generateAccessToken(user);
    const refreshToken = await createSession(user.id);
    setSessionCookies(res, accessToken, refreshToken);

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
router.post('/refresh', authLimiter, async (req: Request, res: Response) => {
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
router.post('/logout', async (req: Request, res: Response) => {
  const token = req.body.refreshToken || (req.headers.cookie || '').match(/(?:^|;\s*)civique_refresh=([^;]+)/)?.[1];
  if (token) await revokeSession(token);
  res.setHeader('Set-Cookie', 'civique_refresh=; HttpOnly; Path=/api/v1/auth; Max-Age=0; SameSite=Lax');
  res.status(200).json({
    success: true,
    message: 'Logged out successfully'
  });
});

router.post('/logout-all', async (req: Request, res: Response) => {
  const token = req.body.refreshToken || (req.headers.cookie || '').match(/(?:^|;\s*)civique_refresh=([^;]+)/)?.[1];
  if (token) { const session = await prisma.userSession.findUnique({ where: { tokenHash: require('../utils/sessions').hashToken(token) } }); if (session) await revokeAllSessions(session.userId); }
  res.status(200).json({ success: true, message: 'All sessions revoked' });
});

router.get('/me', authenticateJWT, async (req: AuthenticatedRequest, res: Response) => {
  const user = await prisma.user.findUnique({ where: { id: req.user!.id }, select: { id: true, email: true, phoneNumber: true, role: true, cityId: true, zoneId: true, wardId: true, departmentId: true, active: true } });
  if (!user) return res.status(404).json({ success: false, error: { code: 'USER_NOT_FOUND', message: 'User not found' } });
  res.json({ success: true, data: { user } });
});

router.get('/sessions', authenticateJWT, async (req: AuthenticatedRequest, res: Response) => {
  const sessions = await prisma.userSession.findMany({ where: { userId: req.user!.id, revokedAt: null }, select: { id: true, createdAt: true, lastUsedAt: true, expiresAt: true }, orderBy: { createdAt: 'desc' } });
  res.json({ success: true, data: { sessions } });
});

export default router;
