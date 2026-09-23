import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { UserRole } from '@prisma/client';
import { prisma } from '../db';
import { hasPermission, Permission } from '../services/rbac';

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
    const expired = err instanceof jwt.TokenExpiredError;
    return res.status(expired ? 401 : 403).json({
      success: false,
      error: {
        code: expired ? 'ACCESS_TOKEN_EXPIRED' : 'FORBIDDEN',
        message: expired ? 'Access token expired' : 'Invalid access token'
      }
    });
  }
}

/** Protects state-changing endpoints that authenticate with a browser cookie. */
export function requireCookieCsrf(req: Request, res: Response, next: NextFunction) {
  const cookieHeader = req.headers.cookie || '';
  const hasBrowserSession = /(?:^|;\s*)civique_(?:access|refresh)=/.test(cookieHeader);
  if (!hasBrowserSession) return next();
  const csrfCookie = cookieHeader.match(/(?:^|;\s*)civique_csrf=([^;]+)/)?.[1];
  const csrfHeader = req.headers['x-csrf-token'];
  if (!csrfCookie || typeof csrfHeader !== 'string' || csrfCookie !== csrfHeader) {
    return res.status(403).json({ success: false, error: { code: 'CSRF_REQUIRED', message: 'CSRF token required' } });
  }
  next();
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
      console.warn(JSON.stringify({ module: 'authorization', operation: 'role_check', status: 'DENIED', userId: req.user.id, role: req.user.role, method: req.method, route: req.baseUrl + req.path }));
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

export function requirePermission(permission: Permission) {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
    let allowed = hasPermission(req.user.role, permission);
    try {
      const rows = await prisma.$queryRaw<Array<{ allowed: boolean }>>`SELECT EXISTS (SELECT 1 FROM user_role_assignments ura JOIN role_permissions rp ON rp.role_id=ura.role_id JOIN permissions p ON p.id=rp.permission_id WHERE ura.user_id=${req.user.id}::uuid AND ura.status='ACTIVE' AND ura.starts_at<=NOW() AND (ura.expires_at IS NULL OR ura.expires_at>NOW()) AND p.key=${permission}) OR EXISTS (SELECT 1 FROM delegations d WHERE d.delegatee_id=${req.user.id}::uuid AND d.permission=${permission} AND d.starts_at<=NOW() AND d.expires_at>NOW() AND d.revoked_at IS NULL) AS allowed`;
      allowed = allowed || Boolean(rows[0]?.allowed);
    } catch { /* additive migration not applied: retain legacy compatibility policy */ }
    if (!allowed) return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Permission denied.' } });
    next();
  };
}
