import { Router, Response } from 'express';
import { UserRole } from '@prisma/client';
import { prisma } from '../db';
import { AuthenticatedRequest, authenticateJWT, requireRole } from '../middleware/auth';
import { evaluateDurableSla, pauseIncidentSla, resumeIncidentSla } from '../services/durableSla';

const router = Router();
const roles = [UserRole.DEPARTMENT_HEAD, UserRole.ZONAL_OFFICER, UserRole.COMMISSIONER, UserRole.CITY_ADMIN, UserRole.SUPER_ADMIN];

router.post('/evaluate', authenticateJWT, requireRole([UserRole.CITY_ADMIN, UserRole.COMMISSIONER, UserRole.SUPER_ADMIN]), async (_req, res) => res.json({ success: true, data: await evaluateDurableSla() }));

router.post('/:incidentId/pause', authenticateJWT, requireRole([UserRole.DEPARTMENT_HEAD, UserRole.ZONAL_OFFICER, UserRole.COMMISSIONER, UserRole.CITY_ADMIN, UserRole.SUPER_ADMIN]), async (req, res) => {
  try {
    const actor = await prisma.user.findUnique({ where: { id: (req as AuthenticatedRequest).user!.id }, select: { role: true, cityId: true, zoneId: true, departmentId: true } });
    const incident = await prisma.incident.findUnique({ where: { id: req.params.incidentId }, select: { cityId: true, zoneId: true, departmentId: true } });
    const reason = typeof req.body?.reason === 'string' ? req.body.reason.trim() : '';
    if (!reason || reason.length < 3) return res.status(400).json({ success: false, error: { code: 'REASON_REQUIRED', message: 'A pause reason of at least 3 characters is required.' } });
    if (!actor || !incident || (actor.role !== UserRole.SUPER_ADMIN && ((actor.role === UserRole.CITY_ADMIN || actor.role === UserRole.COMMISSIONER) ? actor.cityId !== incident.cityId : actor.role === UserRole.ZONAL_OFFICER ? actor.zoneId !== incident.zoneId : actor.departmentId !== incident.departmentId))) return res.status(403).json({ success: false, error: { code: 'SCOPE_DENIED', message: 'You cannot pause an SLA outside your assigned scope.' } });
    const sla = await pauseIncidentSla(req.params.incidentId, reason);
    res.json({ success: true, sla });
  } catch (error: any) {
    res.status(error.message === 'SLA_NOT_FOUND' ? 404 : 500).json({ success: false, error: { code: error.message || 'SLA_PAUSE_FAILED', message: 'Unable to pause the incident SLA.' } });
  }
});

router.post('/:incidentId/resume', authenticateJWT, requireRole([UserRole.DEPARTMENT_HEAD, UserRole.ZONAL_OFFICER, UserRole.COMMISSIONER, UserRole.CITY_ADMIN, UserRole.SUPER_ADMIN]), async (req, res) => {
  try {
    const sla = await resumeIncidentSla(req.params.incidentId);
    res.json({ success: true, sla });
  } catch (error: any) {
    res.status(error.message === 'SLA_NOT_FOUND' ? 404 : 500).json({ success: false, error: { code: error.message || 'SLA_RESUME_FAILED', message: 'Unable to resume the incident SLA.' } });
  }
});

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
