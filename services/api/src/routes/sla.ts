import { Router, Response } from 'express';
import { UserRole } from '@prisma/client';
import { prisma } from '../db';
import { AuthenticatedRequest, authenticateJWT, requireRole } from '../middleware/auth';
import { evaluateDurableSla } from '../services/durableSla';

const router = Router();
const roles = [UserRole.DEPARTMENT_HEAD, UserRole.ZONAL_OFFICER, UserRole.COMMISSIONER, UserRole.CITY_ADMIN, UserRole.SUPER_ADMIN];

router.post('/evaluate', authenticateJWT, requireRole([UserRole.CITY_ADMIN, UserRole.COMMISSIONER, UserRole.SUPER_ADMIN]), async (_req, res) => res.json({ success: true, data: await evaluateDurableSla() }));

router.get('/policies', authenticateJWT, requireRole(roles), async (req: AuthenticatedRequest, res: Response) => {
  const actor = await prisma.user.findUnique({ where: { id: req.user!.id } });
  const cityId = actor?.role === UserRole.SUPER_ADMIN && typeof req.query.cityId === 'string' ? req.query.cityId : actor?.cityId;
  const policies = await (prisma as any).slaPolicy.findMany({ where: cityId ? { OR: [{ cityId }, { cityId: null }] } : {}, orderBy: [{ active: 'desc' }, { version: 'desc' }] });
  res.json({ success: true, policies });
});

router.get('/incidents/:incidentId', authenticateJWT, requireRole(roles), async (req, res) => {
  const sla = await (prisma as any).incidentSla.findUnique({ where: { incidentId: req.params.incidentId }, include: { policy: true, events: { orderBy: { tier: 'asc' } } } });
  if (!sla) return res.status(404).json({ success: false, error: { code: 'SLA_NOT_FOUND', message: 'No durable SLA state exists for this incident.' } });
  res.json({ success: true, sla });
});

export default router;
