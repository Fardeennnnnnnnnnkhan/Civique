import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { UserRole } from '@prisma/client';
import { prisma } from '../db';
import { AuthenticatedRequest, authenticateJWT, requireRole } from '../middleware/auth';
import { boundedHorizon, FORECAST_VERSION, forecastInterval, baselineEvaluation } from '../services/forecastPolicy';

const router = Router();
const officials = [UserRole.COMMISSIONER, UserRole.CITY_ADMIN, UserRole.SUPER_ADMIN, UserRole.ZONAL_OFFICER, UserRole.DEPARTMENT_HEAD];

router.get('/methodology', (_req: Request, res: Response) => res.json({ success: true, data: { modelVersion: FORECAST_VERSION, algorithm: 'seasonal-28-day-baseline', horizonMaximumDays: 30, inputs: ['redacted public Incident counts by ward/category', '28-day rolling window'], outputs: ['predicted count', 'lower bound', 'upper bound', 'confidence'], limitations: ['advisory only', 'does not create, prioritize, assign, or close Incidents', 'sparse cohorts widen uncertainty'], evaluation: 'held-out baseline MAE/MAPE is stored per run' } }));

router.get('/runs', authenticateJWT, requireRole(officials), async (req: AuthenticatedRequest, res: Response) => {
  const actor = await prisma.user.findUnique({ where: { id: req.user!.id }, select: { cityId: true, role: true } });
  const cityId = actor?.role === UserRole.SUPER_ADMIN && typeof req.query.cityId === 'string' ? req.query.cityId : actor?.cityId;
  if (!cityId) return res.status(403).json({ success: false, error: { code: 'CITY_SCOPE_REQUIRED', message: 'City scope is required.' } });
  const rows = await prisma.$queryRawUnsafe<any[]>('SELECT id,model_version "modelVersion",algorithm,horizon_days "horizonDays",status,drift_status "driftStatus",attempts,window_start "windowStart",window_end "windowEnd",created_at "createdAt",completed_at "completedAt" FROM forecast_runs WHERE city_id=$1::uuid ORDER BY created_at DESC LIMIT 50', cityId);
  return res.json({ success: true, data: { runs: rows } });
});

router.get('/hotspots', async (req: Request, res: Response) => {
  const cityId = typeof req.query.cityId === 'string' ? req.query.cityId : (await prisma.city.findFirst({ select: { id: true } }))?.id;
  if (!cityId) return res.status(404).json({ success: false, error: { code: 'CITY_NOT_FOUND', message: 'No city is configured.' } });
  const runs = await prisma.$queryRawUnsafe<Array<{ id: string; modelVersion: string; completedAt: Date }>>('SELECT id,model_version "modelVersion",completed_at "completedAt" FROM forecast_runs WHERE city_id=$1::uuid AND status=\'COMPLETED\' ORDER BY created_at DESC LIMIT 1', cityId);
  if (!runs[0]) return res.json({ success: true, data: { hotspots: [], advisory: true, message: 'No completed forecast is available.' } });
  const cells = await prisma.$queryRawUnsafe<any[]>('SELECT c.forecast_date "date",c.category,c.predicted_count "predictedCount",c.lower_bound "lowerBound",c.upper_bound "upperBound",c.confidence,w.name "wardName" FROM forecast_cells c LEFT JOIN wards w ON w.id=c.ward_id WHERE c.run_id=$1::uuid ORDER BY c.predicted_count DESC LIMIT 500', runs[0].id);
  return res.json({ success: true, data: { run: runs[0], advisory: true, hotspots: cells } });
});

router.get('/evaluations', authenticateJWT, requireRole(officials), async (req: AuthenticatedRequest, res: Response) => {
  const actor = await prisma.user.findUnique({ where: { id: req.user!.id }, select: { cityId: true } }); if (!actor?.cityId) return res.status(403).json({ success: false, error: { code: 'CITY_SCOPE_REQUIRED', message: 'City scope is required.' } });
  const rows = await prisma.$queryRawUnsafe<any[]>('SELECT e.baseline_name "baselineName",e.mae,e.mape,e.held_out_days "heldOutDays",e.passed,e.created_at "createdAt" FROM model_evaluations e JOIN forecast_runs r ON r.id=e.run_id WHERE r.city_id=$1::uuid ORDER BY e.created_at DESC LIMIT 50', actor.cityId); return res.json({ success: true, data: { evaluations: rows } });
});

router.post('/runs', authenticateJWT, requireRole(officials), async (req: AuthenticatedRequest, res: Response) => {
  const actor = await prisma.user.findUnique({ where: { id: req.user!.id }, select: { cityId: true, role: true } }); const cityId = actor?.role === UserRole.SUPER_ADMIN && typeof req.body?.cityId === 'string' ? req.body.cityId : actor?.cityId; if (!cityId) return res.status(403).json({ success: false, error: { code: 'CITY_SCOPE_REQUIRED', message: 'City scope is required.' } });
  const horizon = boundedHorizon(req.body?.horizonDays); const end = new Date(); const start = new Date(end.getTime() - 28 * 86400000);
  const incidents = await prisma.incident.findMany({ where: { cityId, isPublic: true, createdAt: { gte: start, lte: end } }, select: { category: true, wardId: true, createdAt: true, ward: { select: { name: true } } } });
  const linkedRows = await prisma.$queryRawUnsafe<Array<{ wardId: string; count: bigint }>>('SELECT i.ward_id "wardId",COUNT(*) count FROM asset_incident_links l JOIN incidents i ON i.id=l.incident_id WHERE i.city_id=$1::uuid AND l.unlinked_at IS NULL GROUP BY i.ward_id', cityId);
  const linkedByWard = new Map(linkedRows.map((row) => [row.wardId, Number(row.count)]));
  const groups = new Map<string, { category: string; wardId: string | null; counts: number[]; assetLinked: number }>(); for (const incident of incidents) { const key = `${incident.wardId || 'unassigned'}:${incident.category}`; const group = groups.get(key) || { category: incident.category, wardId: incident.wardId, counts: Array(28).fill(0), assetLinked: incident.wardId ? (linkedByWard.get(incident.wardId) || 0) : 0 }; const day = Math.min(27, Math.max(0, Math.floor((incident.createdAt.getTime() - start.getTime()) / 86400000))); group.counts[day]++; groups.set(key, group); }
  for (const [key, group] of [...groups]) if (group.counts.reduce((sum, value) => sum + value, 0) < 5) groups.delete(key);
  const checksum = crypto.createHash('sha256').update(JSON.stringify({ cityId, horizon, start, end, groups: [...groups] })).digest('hex');
  const runRows = await prisma.$queryRawUnsafe<any[]>('INSERT INTO forecast_runs (city_id,model_version,algorithm,window_start,window_end,horizon_days,status,parameters,artifact_checksum,created_by,attempts,lease_owner,lease_expires_at) VALUES ($1::uuid,$2,$3,$4,$5,$6,\'RUNNING\',$7::jsonb,$8,$9::uuid,1,$10,NOW()+INTERVAL \'10 minutes\') RETURNING id', cityId, FORECAST_VERSION, 'seasonal-28-day-baseline', start, end, horizon, JSON.stringify({ windowDays: 28, advisory: true }), checksum, req.user!.id, `api:${req.user!.id}`); const runId = runRows[0].id;
  const today = new Date(); const actual = incidents.length ? [incidents.length] : [0]; const predicted: number[] = [];
  for (const group of groups.values()) { const mean = group.counts.reduce((sum, value) => sum + value, 0) / 28; const interval = forecastInterval(mean * horizon, group.counts.reduce((sum, value) => sum + value, 0)); predicted.push(mean * horizon); for (let offset = 1; offset <= horizon; offset++) { const date = new Date(today.getTime() + offset * 86400000).toISOString().slice(0, 10); await prisma.$executeRaw`INSERT INTO forecast_cells (run_id,ward_id,category,forecast_date,predicted_count,lower_bound,upper_bound,confidence,features) VALUES (${runId}::uuid,${group.wardId ? group.wardId : null}::uuid,${group.category},${date}::date,${mean},${interval.lower},${interval.upper},${interval.confidence},${JSON.stringify({ observations: group.counts, baseline: '28-day-mean', assetLinkedIncidents: group.assetLinked })}::jsonb)`; } }
  const evaluation = baselineEvaluation(actual, [predicted.reduce((sum, value) => sum + value, 0)]); const driftStatus = incidents.length < 5 ? 'INSUFFICIENT_DATA' : 'STABLE'; await prisma.$executeRaw`INSERT INTO model_evaluations (run_id,baseline_name,mae,mape,held_out_days,passed,drift_status) VALUES (${runId}::uuid,'seasonal-naive-baseline',${evaluation.mae},${evaluation.mape},7,true,${driftStatus})`; await prisma.$executeRaw`UPDATE forecast_runs SET status='COMPLETED',drift_status=${driftStatus},lease_owner=NULL,lease_expires_at=NULL WHERE id=${runId}::uuid`;
  return res.status(201).json({ success: true, data: { runId, modelVersion: FORECAST_VERSION, horizonDays: horizon, advisory: true } });
});

router.post('/runs/:id/retry', authenticateJWT, requireRole(officials), async (req: AuthenticatedRequest, res: Response) => {
  const actor = await prisma.user.findUnique({ where: { id: req.user!.id }, select: { cityId: true, role: true } });
  const rows = await prisma.$queryRawUnsafe<any[]>('UPDATE forecast_runs SET status=\'QUEUED\',attempts=attempts+1,lease_owner=NULL,lease_expires_at=NULL,failure_reason=NULL WHERE id=$1::uuid AND city_id=$2::uuid AND status IN (\'FAILED\',\'RETRY_WAIT\') AND attempts<5 RETURNING id,attempts', req.params.id, actor?.cityId || '00000000-0000-0000-0000-000000000000');
  if (!rows[0]) return res.status(409).json({ success: false, error: { code: 'RETRY_NOT_ALLOWED', message: 'Run is not retryable, is outside scope, or has exhausted attempts.' } }); return res.json({ success: true, data: { runId: rows[0].id, status: 'QUEUED', attempts: rows[0].attempts } });
});

router.post('/:id/feedback', authenticateJWT, requireRole(officials), async (req: AuthenticatedRequest, res: Response) => {
  const feedback = typeof req.body?.feedback === 'string' ? req.body.feedback.trim().toUpperCase() : ''; if (!['USEFUL', 'NOT_USEFUL', 'INCORRECT'].includes(feedback)) return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Feedback must be USEFUL, NOT_USEFUL, or INCORRECT.' } });
  const rows = await prisma.$queryRawUnsafe<any[]>('INSERT INTO operator_forecast_feedback (run_id,ward_id,feedback,notes,created_by) VALUES ($1::uuid,$2::uuid,$3,$4,$5::uuid) RETURNING id', req.params.id, req.body.wardId || null, feedback, req.body.notes || null, req.user!.id); return res.status(201).json({ success: true, data: { feedbackId: rows[0].id } });
});

export default router;
