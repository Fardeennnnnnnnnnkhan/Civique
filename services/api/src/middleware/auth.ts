import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { UserRole } from '@prisma/client';
import { prisma } from '../db';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string | null;
    role: UserRole;
  };
}

export async function authenticateJWT(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  const cookieToken = (req.headers.cookie || '').match(/(?:^|;\s*)civique_access=([^;]+)/)?.[1];
  const token = authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : cookieToken;
  if (!token) {
    return res.status(401).json({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Access token required'
      }
    });
  }

  const secret = process.env.JWT_ACCESS_SECRET;
  if (!secret) return res.status(500).json({ success: false, error: { code: 'AUTH_NOT_CONFIGURED', message: 'Authentication is not configured' } });

  try {
    const decoded = jwt.verify(token, secret) as { id: string; email: string | null; role: UserRole };
    const user = await prisma.user.findUnique({ where: { id: decoded.id } });
    if (!user || !user.active) return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'User is suspended or does not exist' } });
    req.user = { id: user.id, email: user.email, role: user.role };
    if (!authHeader && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
      const csrfCookie = (req.headers.cookie || '').match(/(?:^|;\s*)civique_csrf=([^;]+)/)?.[1];
      if (!csrfCookie || csrfCookie !== req.headers['x-csrf-token']) return res.status(403).json({ success: false, error: { code: 'CSRF_REQUIRED', message: 'CSRF token required' } });
    }
    next();
  } catch (err) {
    return res.status(403).json({
      success: false,
      error: {
        code: 'FORBIDDEN',
        message: 'Invalid or expired access token'
      }
    });
  }
}

export function requireRole(allowedRoles: UserRole[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required'
        }
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Insufficient permissions'
        }
      });
    }

    next();
  };
}
