import { Router, Response } from 'express';
import { UserRole } from '@prisma/client';
import { prisma } from '../db';
import { AuthenticatedRequest, authenticateJWT, requireRole } from '../middleware/auth';
import { createSignedMediaUrl } from '../utils/supabase';

const router = Router();
router.get('/', authenticateJWT, requireRole([UserRole.FIELD_WORKER]), async (req: AuthenticatedRequest, res: Response) => {
  const orders = await prisma.workOrder.findMany({ where: { workerId: req.user!.id }, include: { incident: { include: { ward: true } } }, orderBy: { assignedAt: 'desc' } });
  res.json({ success: true, data: { workOrders: orders } });
});
router.get('/:id', authenticateJWT, requireRole([UserRole.FIELD_WORKER]), async (req: AuthenticatedRequest, res: Response) => {
  const order = await prisma.workOrder.findFirst({ where: { id: req.params.id, workerId: req.user!.id }, include: { incident: { include: { ward: true, reports: { orderBy: { createdAt: 'asc' }, take: 1 } } } } });
  if (!order) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Work order not found.' } });
  const report = order.incident.reports[0];
  res.json({ success: true, data: { workOrder: { ...order, incident: { ...order.incident, reports: report ? [{ ...report, photoUrl: await createSignedMediaUrl(report.photoUrl).catch(() => null) }] : [] } } } });
});
export default router;

