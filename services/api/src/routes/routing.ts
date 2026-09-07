import { Router, Response } from 'express';
import { Prisma, UserRole } from '@prisma/client';
import { prisma } from '../db';
import { AuthenticatedRequest, authenticateJWT, requireRole } from '../middleware/auth';
import { previewRouting, SUPPORTED_CATEGORIES, normalizeCategory } from '../services/routing';

const router = Router();
const admins = [UserRole.WARD_OFFICER, UserRole.DEPARTMENT_HEAD, UserRole.ZONAL_OFFICER, UserRole.COMMISSIONER, UserRole.CITY_ADMIN, UserRole.SUPER_ADMIN];

router.get('/categories', async (_req, res) => {
  const categories = await (prisma as any).category.findMany({ where: { active: true }, orderBy: { name: 'asc' } });
  res.json({ success: true, categories, supported: SUPPORTED_CATEGORIES });
});

router.get('/preview', authenticateJWT, requireRole(admins), async (req: AuthenticatedRequest, res: Response) => {
  const category = typeof req.query.category === 'string' ? req.query.category : '';
  if (!category) return res.status(400).json({ success: false, error: { code: 'CATEGORY_REQUIRED', message: 'category is required.' } });
  const result = await previewRouting(prisma, { category, cityId: typeof req.query.cityId === 'string' ? req.query.cityId : null, wardId: typeof req.query.wardId === 'string' ? req.query.wardId : null });
  res.json({ success: true, data: { ...result, category: normalizeCategory(category) } });
});

router.get('/rules', authenticateJWT, requireRole(admins), async (req: AuthenticatedRequest, res: Response) => {
  const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
  const cityId = user?.role === UserRole.SUPER_ADMIN ? (typeof req.query.cityId === 'string' ? req.query.cityId : undefined) : user?.cityId ?? undefined;
  const rules = await (prisma as any).routingRule.findMany({ where: { ...(cityId ? { OR: [{ cityId }, { cityId: null }] } : {}), ...(req.query.active !== undefined ? { active: req.query.active === 'true' } : {}) }, include: { category: true, department: true, city: true, ward: true }, orderBy: [{ active: 'desc' }, { priority: 'desc' }, { createdAt: 'desc' }] });
  res.json({ success: true, rules });
});

router.post('/rules', authenticateJWT, requireRole([UserRole.CITY_ADMIN, UserRole.SUPER_ADMIN]), async (req: AuthenticatedRequest, res: Response) => {
  const { category, cityId, wardId, departmentId, priority = 0, effectiveFrom, effectiveUntil } = req.body as Record<string, unknown>;
  if (typeof category !== 'string' || typeof departmentId !== 'string') return res.status(400).json({ success: false, error: { code: 'INVALID_RULE', message: 'category and departmentId are required.' } });
  const actor = await prisma.user.findUnique({ where: { id: req.user!.id } });
  const department = await prisma.department.findUnique({ where: { id: departmentId } });
  if (!department) return res.status(400).json({ success: false, error: { code: 'DEPARTMENT_NOT_FOUND', message: 'Department not found.' } });
  if (actor?.role !== UserRole.SUPER_ADMIN && actor?.cityId && department.cityId !== actor.cityId) return res.status(403).json({ success: false, error: { code: 'OUT_OF_SCOPE', message: 'Department is outside your city scope.' } });
  const key = normalizeCategory(category);
  const cat = await (prisma as any).category.upsert({ where: { key }, update: { active: true }, create: { key, name: key.replace(/_/g, ' ') } });
  const rule = await (prisma as any).routingRule.create({ data: { categoryId: cat.id, cityId: typeof cityId === 'string' ? cityId : department.cityId, wardId: typeof wardId === 'string' ? wardId : null, departmentId, priority: Number(priority) || 0, effectiveFrom: effectiveFrom ? new Date(String(effectiveFrom)) : new Date(), effectiveUntil: effectiveUntil ? new Date(String(effectiveUntil)) : null } });
  res.status(201).json({ success: true, rule });
});

router.patch('/rules/:id', authenticateJWT, requireRole([UserRole.CITY_ADMIN, UserRole.SUPER_ADMIN]), async (req: AuthenticatedRequest, res: Response) => {
  const existing = await (prisma as any).routingRule.findUnique({ where: { id: req.params.id }, include: { department: true } });
  if (!existing) return res.status(404).json({ success: false, error: { code: 'RULE_NOT_FOUND', message: 'Routing rule not found.' } });
  const actor = await prisma.user.findUnique({ where: { id: req.user!.id } });
  if (actor?.role !== UserRole.SUPER_ADMIN && actor?.cityId && existing.department.cityId !== actor.cityId) return res.status(403).json({ success: false, error: { code: 'OUT_OF_SCOPE', message: 'Rule is outside your city scope.' } });
  const data: Record<string, unknown> = {};
  if (typeof req.body.active === 'boolean') data.active = req.body.active;
  if (req.body.effectiveUntil !== undefined) data.effectiveUntil = req.body.effectiveUntil ? new Date(String(req.body.effectiveUntil)) : null;
  if (req.body.priority !== undefined) data.priority = Number(req.body.priority) || 0;
  const rule = await (prisma as any).routingRule.update({ where: { id: req.params.id }, data });
  res.json({ success: true, rule });
});

export default router;
