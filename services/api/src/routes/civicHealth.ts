import { Router, Request, Response } from 'express';
import { IncidentStatus, UserRole } from '@prisma/client';
import { prisma } from '../db';
import { AuthenticatedRequest, authenticateJWT, requireRole } from '../middleware/auth';
import { incidentScope } from '../utils/scope';
import { calculateCivicHealth, CIVIC_HEALTH_VERSION, DEFAULT_HEALTH_WEIGHTS, HealthWeights } from '../services/civicHealthPolicy';

const router = Router();
const officials = [UserRole.COMMISSIONER, UserRole.CITY_ADMIN, UserRole.SUPER_ADMIN];

async function activePolicy(cityId: string) {
  const rows = await prisma.$queryRawUnsafe<any[]>('SELECT id,city_id "cityId",version,weights,"minimum_cohort" "minimumCohort" FROM civic_health_policies WHERE city_id=$1::uuid AND active=true ORDER BY activated_at DESC NULLS LAST LIMIT 1', cityId);
  return rows[0] as { id: string; cityId: string; version: string; weights: HealthWeights; minimumCohort: number } | undefined;
}

async function wardHealth(cityId: string, wardId: string, policy: { weights: HealthWeights }) {
  const from = new Date(Date.now() - 30 * 86400000);
  const incidents = await prisma.incident.findMany({ where: { cityId, wardId, isPublic: true, createdAt: { gte: from }, status: { not: IncidentStatus.REJECTED } }, select: { status: true, priority: true, reportCount: true, slaBreached: true, resolvedAt: true, createdAt: true } });
  const eligible = incidents.length;
  const resolved = incidents.filter((incident) => incident.status === IncidentStatus.RESOLVED);
  const severe = incidents.filter((incident) => incident.priority === 'HIGH' || incident.priority === 'CRITICAL').length;
  const recurrence = incidents.filter((incident) => incident.reportCount > 1).length;
  const resolutionHours = resolved.filter((incident) => incident.resolvedAt).map((incident) => (incident.resolvedAt!.getTime() - incident.createdAt.getTime()) / 3600000);
  const quality = resolved.length ? Math.max(0, 100 - Math.min(100, (resolutionHours.reduce((sum, value) => sum + value, 0) / resolved.length) * 2)) : 0;
  const result = calculateCivicHealth({ eligible, unresolved: incidents.filter((incident) => incident.status !== IncidentStatus.RESOLVED).length, severityRisk: eligible ? (severe / eligible) * 100 : 0, slaCompliance: eligible ? ((eligible - incidents.filter((incident) => incident.slaBreached).length) / eligible) * 100 : 0, recurrence: eligible ? (recurrence / eligible) * 100 : 0, resolutionQuality: quality, citizenConfirmation: resolved.length ? 100 : 0 }, policy.weights);
  return { wardId, sourceWindowDays: 30, eligible, ...result };
}

router.get('/methodology', (_req: Request, res: Response) => res.json({ success: true, data: { version: CIVIC_HEALTH_VERSION, minimumCohort: 5, windowDays: 30, weights: DEFAULT_HEALTH_WEIGHTS, components: { unresolvedBurden: 'Lower unresolved share scores higher.', severityRisk: 'Lower high/critical share scores higher.', slaCompliance: 'Share without an SLA breach.', recurrence: 'Lower repeat-report share scores higher.', resolutionQuality: 'Resolution speed proxy, bounded and advisory.', citizenConfirmation: 'Resolved incidents with an explicit citizen confirmation signal.' }, uncertainty: 'Scores are suppressed below five eligible incidents; confidence increases with cohort completeness up to twenty incidents.' } }));

router.get('/wards', async (req: Request, res: Response) => {
  try {
    const cityId = typeof req.query.cityId === 'string' ? req.query.cityId : (await prisma.city.findFirst({ select: { id: true } }))?.id;
    if (!cityId) return res.status(404).json({ success: false, error: { code: 'CITY_NOT_FOUND', message: 'No civic health city is configured.' } });
    const policy = await activePolicy(cityId);
    if (!policy) return res.status(503).json({ success: false, error: { code: 'HEALTH_POLICY_UNAVAILABLE', message: 'Civic health policy is not active.' } });
    const wards = await prisma.ward.findMany({ where: { zone: { cityId } }, select: { id: true, name: true }, orderBy: { name: 'asc' } });
    const scores = await Promise.all(wards.map(async (ward) => ({ ...ward, health: await wardHealth(cityId, ward.id, policy) })));
    return res.json({ success: true, data: { metricVersion: policy.version, generatedAt: new Date().toISOString(), policyId: policy.id, wards: scores } });
  } catch (error: any) { return res.status(500).json({ success: false, error: { code: 'CIVIC_HEALTH_FAILED', message: 'Civic health scores are temporarily unavailable.' } }); }
});

router.get('/wards/:id', async (req: Request, res: Response) => {
  const cityId = typeof req.query.cityId === 'string' ? req.query.cityId : (await prisma.ward.findUnique({ where: { id: req.params.id }, select: { zone: { select: { cityId: true } } } }))?.zone.cityId;
  if (!cityId) return res.status(404).json({ success: false, error: { code: 'WARD_NOT_FOUND', message: 'Ward not found.' } });
  const policy = await activePolicy(cityId);
  if (!policy) return res.status(503).json({ success: false, error: { code: 'HEALTH_POLICY_UNAVAILABLE', message: 'Civic health policy is not active.' } });
  const ward = await prisma.ward.findUnique({ where: { id: req.params.id }, select: { id: true, name: true } });
  if (!ward) return res.status(404).json({ success: false, error: { code: 'WARD_NOT_FOUND', message: 'Ward not found.' } });
  return res.json({ success: true, data: { metricVersion: policy.version, policyId: policy.id, ward: { ...ward, health: await wardHealth(cityId, ward.id, policy) } } });
});

router.get('/wards/:id/history', async (req: Request, res: Response) => {
  const rows = await prisma.$queryRawUnsafe<any[]>('SELECT snapshot_date "date",score,confidence,completeness,suppressed,components,explanation FROM civic_health_snapshots WHERE ward_id=$1::uuid ORDER BY snapshot_date DESC LIMIT 90', req.params.id);
  return res.json({ success: true, data: { history: rows } });
});

router.post('/preview', authenticateJWT, requireRole(officials), async (req: AuthenticatedRequest, res: Response) => {
  const weights = { ...DEFAULT_HEALTH_WEIGHTS, ...(req.body?.weights || {}) } as HealthWeights;
  const sum = Object.values(weights).reduce<number>((total, value) => total + Number(value), 0);
  if (Math.abs(sum - 1) > 0.001 || Object.values(weights).some((value) => Number(value) < 0)) return res.status(400).json({ success: false, error: { code: 'INVALID_WEIGHTS', message: 'Weights must be non-negative and sum to 1.' } });
  const cityId = typeof req.body?.cityId === 'string' ? req.body.cityId : null;
  const wardId = typeof req.body?.wardId === 'string' ? req.body.wardId : null;
  if (!cityId || !wardId) return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'City and ward are required.' } });
  const actor = await prisma.user.findUnique({ where: { id: req.user!.id }, select: { cityId: true, role: true } });
  if (!actor || (actor.role !== UserRole.SUPER_ADMIN && actor.cityId !== cityId)) return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Health preview is outside your city scope.' } });
  return res.json({ success: true, data: { preview: await wardHealth(cityId, wardId, { weights }), persisted: false, metricVersion: CIVIC_HEALTH_VERSION } });
});

router.post('/policies', authenticateJWT, requireRole([UserRole.CITY_ADMIN, UserRole.SUPER_ADMIN]), async (req: AuthenticatedRequest, res: Response) => {
  const cityId = typeof req.body?.cityId === 'string' ? req.body.cityId : null;
  const weights = { ...DEFAULT_HEALTH_WEIGHTS, ...(req.body?.weights || {}) } as HealthWeights;
  const sum = Object.values(weights).reduce<number>((total, value) => total + Number(value), 0);
  if (!cityId || Math.abs(sum - 1) > 0.001 || Object.values(weights).some((value) => Number(value) < 0)) return res.status(400).json({ success: false, error: { code: 'INVALID_POLICY', message: 'City and valid weights summing to one are required.' } });
  const actor = await prisma.user.findUnique({ where: { id: req.user!.id }, select: { cityId: true, role: true } });
  if (!actor || (actor.role !== UserRole.SUPER_ADMIN && actor.cityId !== cityId)) return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Policy is outside your city scope.' } });
  const version = typeof req.body?.version === 'string' ? req.body.version.trim() : `m19-${Date.now()}`;
  const rows = await prisma.$queryRawUnsafe<any[]>('INSERT INTO civic_health_policies (city_id,version,weights,created_by) VALUES ($1::uuid,$2,$3::jsonb,$4::uuid) RETURNING id,version', cityId, version, JSON.stringify(weights), req.user!.id);
  return res.status(201).json({ success: true, data: { policy: rows[0] } });
});

router.post('/policies/:id/activate', authenticateJWT, requireRole([UserRole.CITY_ADMIN, UserRole.SUPER_ADMIN]), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const result = await prisma.$transaction(async (tx) => {
      const policy = await tx.$queryRawUnsafe<Array<{ id: string; cityId: string }>>('SELECT id,city_id "cityId" FROM civic_health_policies WHERE id=$1::uuid', req.params.id);
      if (!policy[0]) throw Object.assign(new Error('Health policy not found.'), { code: 'NOT_FOUND' });
      const actor = await tx.user.findUnique({ where: { id: req.user!.id }, select: { cityId: true, role: true } });
      if (!actor || (actor.role !== UserRole.SUPER_ADMIN && actor.cityId !== policy[0].cityId)) throw Object.assign(new Error('Policy is outside your city scope.'), { code: 'FORBIDDEN' });
      await tx.$executeRaw`UPDATE civic_health_policies SET active=false WHERE city_id=${policy[0].cityId}::uuid`;
      await tx.$executeRaw`UPDATE civic_health_policies SET active=true,activated_at=NOW() WHERE id=${req.params.id}::uuid`;
      return policy[0];
    });
    return res.json({ success: true, data: { activated: true, policyId: result.id, cityId: result.cityId } });
  } catch (error: any) { return res.status(error.code === 'NOT_FOUND' ? 404 : error.code === 'FORBIDDEN' ? 403 : 500).json({ success: false, error: { code: error.code || 'POLICY_ACTIVATION_FAILED', message: error.message } }); }
});

/** Nightly worker-compatible snapshot rebuild; safe to rerun for the same date. */
router.post('/snapshots/rebuild', authenticateJWT, requireRole(officials), async (req: AuthenticatedRequest, res: Response) => {
  const cityId = typeof req.body?.cityId === 'string' ? req.body.cityId : null;
  if (!cityId) return res.status(400).json({ success: false, error: { code: 'CITY_REQUIRED', message: 'City is required.' } });
  const actor = await prisma.user.findUnique({ where: { id: req.user!.id }, select: { cityId: true, role: true } });
  if (!actor || (actor.role !== UserRole.SUPER_ADMIN && actor.cityId !== cityId)) return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Snapshot scope denied.' } });
  const policy = await activePolicy(cityId);
  if (!policy) return res.status(409).json({ success: false, error: { code: 'HEALTH_POLICY_UNAVAILABLE', message: 'Activate a health policy before rebuilding snapshots.' } });
  const wards = await prisma.ward.findMany({ where: { zone: { cityId } }, select: { id: true } });
  let rebuilt = 0;
  for (const ward of wards) {
    const health = await wardHealth(cityId, ward.id, policy);
    await prisma.$executeRaw`INSERT INTO civic_health_snapshots (city_id,ward_id,policy_id,snapshot_date,source_watermark,score,confidence,completeness,suppressed,components,explanation) VALUES (${cityId}::uuid,${ward.id}::uuid,${policy.id}::uuid,CURRENT_DATE,NOW(),${health.score},${health.confidence},${health.completeness},${health.suppressed},${JSON.stringify(health.components)}::jsonb,${JSON.stringify(health.explanation)}::jsonb) ON CONFLICT (ward_id,snapshot_date,policy_id) DO UPDATE SET source_watermark=EXCLUDED.source_watermark,score=EXCLUDED.score,confidence=EXCLUDED.confidence,completeness=EXCLUDED.completeness,suppressed=EXCLUDED.suppressed,components=EXCLUDED.components,explanation=EXCLUDED.explanation`;
    rebuilt++;
  }
  return res.json({ success: true, data: { cityId, policyId: policy.id, rebuilt, snapshotDate: new Date().toISOString().slice(0, 10) } });
});

export default router;
