import { Router, Response } from 'express';
import { prisma } from '../db';
import { UserRole } from '@prisma/client';
import { AuthenticatedRequest, authenticateJWT, requireRole } from '../middleware/auth';
import { Prisma } from '@prisma/client';
import { userScope } from '../utils/scope';

const router = Router();

const officialRoles = [UserRole.WARD_OFFICER, UserRole.DEPARTMENT_HEAD, UserRole.ZONAL_OFFICER, UserRole.COMMISSIONER, UserRole.CITY_ADMIN, UserRole.SUPER_ADMIN];

/** GET /api/v1/users/directory — scoped, paginated people directory. */
router.get('/directory', authenticateJWT, requireRole(officialRoles), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const actor = await prisma.user.findUnique({ where: { id: req.user!.id }, select: { id: true, role: true, cityId: true, zoneId: true, wardId: true, departmentId: true } });
    if (!actor) return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Official permissions required.' } });
    const where: Prisma.UserWhereInput = { ...userScope(actor) };
    const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';
    const role = typeof req.query.role === 'string' ? req.query.role : '';
    if (search) where.OR = [{ email: { contains: search, mode: 'insensitive' } }, { phoneNumber: { contains: search, mode: 'insensitive' } }];
    if (role && Object.values(UserRole).includes(role as UserRole)) where.role = role as UserRole;
    else if (role) return res.status(400).json({ success: false, error: { code: 'INVALID_FILTER', message: 'Invalid role filter.' } });
    const requestedLimit = Number(req.query.limit); const limit = Number.isFinite(requestedLimit) ? Math.min(Math.max(Math.trunc(requestedLimit), 1), 100) : 25;
    const cursor = typeof req.query.cursor === 'string' && req.query.cursor ? req.query.cursor : undefined;
    const users = await prisma.user.findMany({ where, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], take: limit + 1, ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}), select: { id: true, email: true, phoneNumber: true, role: true, active: true, cityId: true, zoneId: true, wardId: true, departmentId: true, createdAt: true, _count: { select: { assignedIncidents: true } } } });
    const hasMore = users.length > limit; const page = users.slice(0, limit);
    return res.json({ success: true, data: { users: page.map(({ _count, ...user }) => ({ ...user, activeIncidentCount: _count.assignedIncidents })), pagination: { limit, hasMore, nextCursor: hasMore ? page[page.length - 1]?.id ?? null : null } } });
  } catch (error) {
    console.error('Failed to query scoped user directory:', error);
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Unable to load the people directory.' } });
  }
});

/**
 * GET /api/v1/users/workers
 * Retrieves active field workers. Optionally filters by ward and department.
 * Restricted to official roles.
 */
router.get('/workers', authenticateJWT, requireRole([
  UserRole.WARD_OFFICER,
  UserRole.DEPARTMENT_HEAD,
  UserRole.ZONAL_OFFICER,
  UserRole.CITY_ADMIN,
  UserRole.COMMISSIONER,
  UserRole.SUPER_ADMIN
]), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { wardId, departmentId } = req.query;
    const where: any = {
      role: UserRole.FIELD_WORKER,
      active: true,
    };

    if (wardId && typeof wardId === 'string') {
      where.wardId = wardId;
    }
    if (departmentId && typeof departmentId === 'string') {
      where.departmentId = departmentId;
    }

    const workers = await prisma.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        phoneNumber: true,
        role: true,
        wardId: true,
        departmentId: true,
      },
      orderBy: { email: 'asc' },
    });

    return res.json({
      success: true,
      data: { workers },
    });
  } catch (error: any) {
    console.error('Failed to query field workers:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: error.message || 'An unexpected error occurred while fetching field workers.',
      },
    });
  }
});

export default router;
