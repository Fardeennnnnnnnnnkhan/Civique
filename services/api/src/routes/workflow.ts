import { Router, Response } from 'express';
import { IncidentStatus, UserRole } from '@prisma/client';
import { prisma } from '../db';
import { AuthenticatedRequest, authenticateJWT, requireRole } from '../middleware/auth';
import { assertTriageAccess, loadPolicyActor } from '../services/policies';
import { emitLifecycle } from '../services/workflowEvents';
import { recordRoutingDecision } from '../services/routing';
import { logIncidentChange } from '../utils/audit';
import { transitionIncident } from '../services/incidentTransitions';
import { incidentScope } from '../utils/scope';
import { canAdministrativeClose, isWithinAppealWindow } from '../services/resolutionVerificationPolicy';

const router = Router();
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function errorStatus(error: any) { return error.code === 'NOT_FOUND' ? 404 : error.code === 'FORBIDDEN' ? 403 : ['INVALID_STATE', 'INVALID_STATE_TRANSITION'].includes(error.code) ? 409 : 500; }
async function scopedIncident(tx: any, id: string) {
  return tx.incident.findUnique({ where: { id } });
}

router.post('/:id/acknowledge', authenticateJWT, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const result = await prisma.$transaction(async (tx) => {
      const [actor, incident] = await Promise.all([loadPolicyActor(tx, req.user!.id), scopedIncident(tx, req.params.id)]);
      if (!incident) throw Object.assign(new Error('Incident not found'), { code: 'NOT_FOUND' });
      assertTriageAccess(actor, incident);
      if (incident.status !== IncidentStatus.OPEN) throw Object.assign(new Error('Only an OPEN incident can be acknowledged'), { code: 'INVALID_STATE' });
      const updated = await tx.incident.update({ where: { id: incident.id }, data: { status: IncidentStatus.ACKNOWLEDGED } });
      await logIncidentChange(tx, incident.id, 'INCIDENT_ACKNOWLEDGED', actor.id, { previousStatus: incident.status, newStatus: 'ACKNOWLEDGED' });
      await emitLifecycle(tx, { incidentId: incident.id, eventType: 'INCIDENT_ACKNOWLEDGED', state: IncidentStatus.ACKNOWLEDGED, actorRole: actor.role, actorLabel: 'Ward officer', correlationId: `acknowledge:${incident.id}` });
      return updated;
    }, { maxWait: 15000, timeout: 30000 });
    res.json({ success: true, data: { incident: result } });
  } catch (error: any) { res.status(errorStatus(error)).json({ success: false, error: { code: error.code || 'SERVER_ERROR', message: error.message } }); }
});

router.post('/:id/confirm-classification', authenticateJWT, async (req: AuthenticatedRequest, res: Response) => {
  const category = typeof req.body.category === 'string' ? req.body.category.trim().toUpperCase() : '';
  const reason = typeof req.body.reason === 'string' ? req.body.reason.trim() : '';
  if (!category || !reason) return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Category and audit reason are required.' } });
  try {
    const result = await prisma.$transaction(async (tx) => {
      const [actor, incident, taxonomy] = await Promise.all([loadPolicyActor(tx, req.user!.id), scopedIncident(tx, req.params.id), tx.category.findUnique({ where: { key: category } })]);
      if (!incident) throw Object.assign(new Error('Incident not found'), { code: 'NOT_FOUND' });
      assertTriageAccess(actor, incident);
      if (!taxonomy?.active) throw Object.assign(new Error('Unsupported taxonomy category'), { code: 'INVALID_STATE' });
      if (incident.status !== IncidentStatus.AI_REVIEW && incident.status !== IncidentStatus.OPEN) throw Object.assign(new Error('Classification cannot be changed in this state'), { code: 'INVALID_STATE' });
      const updated = await tx.incident.update({ where: { id: incident.id }, data: { category, status: IncidentStatus.OPEN } });
      await tx.report.updateMany({ where: { incidentId: incident.id }, data: { categoryConfirmed: category } });
      await logIncidentChange(tx, incident.id, 'CLASSIFICATION_CONFIRMED', actor.id, { previousCategory: incident.category, category, reason });
      await emitLifecycle(tx, { incidentId: incident.id, eventType: 'CLASSIFICATION_ACCEPTED', state: IncidentStatus.OPEN, actorRole: actor.role, actorLabel: 'Ward officer', metadata: { category, override: incident.category !== category, reason }, correlationId: `classification-confirmed:${incident.id}:${category}` });
      return updated;
    }, { maxWait: 15000, timeout: 30000 });
    res.json({ success: true, data: { incident: result } });
  } catch (error: any) { res.status(errorStatus(error)).json({ success: false, error: { code: error.code || 'SERVER_ERROR', message: error.message } }); }
});

router.post('/:id/route', authenticateJWT, async (req: AuthenticatedRequest, res: Response) => {
  const departmentId = typeof req.body.departmentId === 'string' ? req.body.departmentId : null;
  const reason = typeof req.body.reason === 'string' ? req.body.reason.trim() : '';
  if (departmentId && !uuid.test(departmentId)) return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid department ID.' } });
  try {
    const result = await prisma.$transaction(async (tx) => {
      const [actor, incident] = await Promise.all([loadPolicyActor(tx, req.user!.id), scopedIncident(tx, req.params.id)]);
      if (!incident) throw Object.assign(new Error('Incident not found'), { code: 'NOT_FOUND' });
      assertTriageAccess(actor, incident);
      if (incident.status !== IncidentStatus.OPEN && incident.status !== IncidentStatus.ACKNOWLEDGED) throw Object.assign(new Error('Incident must be open or acknowledged before routing'), { code: 'INVALID_STATE' });
      let selectedDepartmentId = departmentId;
      if (departmentId) { const department = await tx.department.findUnique({ where: { id: departmentId } }); if (!department || (incident.cityId && department.cityId !== incident.cityId)) throw Object.assign(new Error('Department is outside incident city'), { code: 'FORBIDDEN' }); }
      const decision = await recordRoutingDecision(tx, { incidentId: incident.id, category: incident.category, cityId: incident.cityId, wardId: incident.wardId, previousDepartmentId: incident.departmentId });
      selectedDepartmentId ||= decision.department?.id || null;
      if (!selectedDepartmentId) throw Object.assign(new Error('No deterministic route exists; select a department and provide a reason'), { code: 'INVALID_STATE' });
      if (departmentId && !reason) throw Object.assign(new Error('Manual rerouting requires a reason'), { code: 'INVALID_STATE' });
      const updated = await tx.incident.update({ where: { id: incident.id }, data: { departmentId: selectedDepartmentId } });
      if (departmentId) await tx.$executeRaw`INSERT INTO routing_decisions (incident_id,category_key,department_id,previous_department_id,reason,fallback_used,actor_id) VALUES (${incident.id}::uuid,${incident.category},${departmentId}::uuid,${incident.departmentId}::uuid,${reason},true,${actor.id}::uuid)`;
      await emitLifecycle(tx, { incidentId: incident.id, eventType: 'DEPARTMENT_ROUTED', state: updated.status, actorRole: actor.role, actorLabel: 'Ward officer', metadata: { departmentId: selectedDepartmentId, reason: reason || decision.reason }, correlationId: `route:${incident.id}:${selectedDepartmentId}:${Date.now()}` });
      return updated;
    }, { maxWait: 15000, timeout: 30000 });
    res.json({ success: true, data: { incident: result } });
  } catch (error: any) { res.status(errorStatus(error)).json({ success: false, error: { code: error.code || 'SERVER_ERROR', message: error.message } }); }
});

router.post('/:id/assign-worker', authenticateJWT, async (req: AuthenticatedRequest, res: Response) => {
  const workerId = typeof req.body.workerId === 'string' ? req.body.workerId : '';
  const reason = typeof req.body.reason === 'string' ? req.body.reason.trim() : '';
  const idempotencyKey = typeof req.body.idempotencyKey === 'string' ? req.body.idempotencyKey.trim() : '';
  const targetWardId = typeof req.body.wardId === 'string' && req.body.wardId && req.body.wardId !== 'ALL' ? req.body.wardId : undefined;
  const targetDeptId = typeof req.body.departmentId === 'string' && req.body.departmentId && req.body.departmentId !== 'ALL' ? req.body.departmentId : undefined;

  if (!uuid.test(workerId) || !reason || !idempotencyKey) return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Eligible worker, reason, and idempotency key are required.' } });
  try {
    const result = await prisma.$transaction(async (tx) => {
      const [actor, incident, worker] = await Promise.all([loadPolicyActor(tx, req.user!.id), scopedIncident(tx, req.params.id), tx.user.findUnique({ where: { id: workerId } })]);
      if (!incident) throw Object.assign(new Error('Incident not found'), { code: 'NOT_FOUND' });
      assertTriageAccess(actor, incident);
      if (incident.status !== IncidentStatus.OPEN && incident.status !== IncidentStatus.ACKNOWLEDGED && incident.status !== IncidentStatus.REOPENED && incident.status !== IncidentStatus.ESCALATED) throw Object.assign(new Error('Incident is not assignable in its current state'), { code: 'INVALID_STATE' });
      if (!worker?.active || worker.role !== UserRole.FIELD_WORKER) throw Object.assign(new Error('Selected user is not an active field worker'), { code: 'FORBIDDEN' });
      if (worker.cityId && incident.cityId && worker.cityId !== incident.cityId) throw Object.assign(new Error('Worker must belong to the same municipal city jurisdiction'), { code: 'FORBIDDEN' });

      const finalWardId = targetWardId || worker.wardId || incident.wardId;
      const finalDeptId = targetDeptId || worker.departmentId || incident.departmentId;

      const updated = await tx.incident.update({ where: { id: incident.id }, data: { assignedTo: worker.id, workerRef: worker.id, assignedBy: actor.id, assignedAt: new Date(), wardId: finalWardId, departmentId: finalDeptId, status: IncidentStatus.ASSIGNED } });
      await tx.workOrder.upsert({ where: { incidentId: incident.id }, update: { workerId: worker.id, status: 'ASSIGNED', assignedAt: new Date(), startedAt: null, completedAt: null }, create: { incidentId: incident.id, workerId: worker.id } });
      await tx.assignmentHistory.create({ data: { incidentId: incident.id, workerId: worker.id, departmentId: finalDeptId, action: 'WORKER_ASSIGNED', reason } });
      await emitLifecycle(tx, { incidentId: incident.id, eventType: 'WORKER_ASSIGNED', state: IncidentStatus.ASSIGNED, actorRole: actor.role, actorLabel: 'Ward officer', metadata: { workerId: worker.id, wardId: finalWardId, departmentId: finalDeptId }, correlationId: `assign-worker:${idempotencyKey}` });
      return updated;
    }, { maxWait: 15000, timeout: 30000 });
    res.json({ success: true, data: { incident: result } });
  } catch (error: any) { res.status(errorStatus(error)).json({ success: false, error: { code: error.code || 'SERVER_ERROR', message: error.message } }); }
});

router.post('/:id/confirm-resolution', authenticateJWT, async (req: AuthenticatedRequest, res: Response) => {
  const action = req.body.action === 'CONFIRM' || req.body.action === 'DISPUTE' ? req.body.action : null;
  const notes = typeof req.body.notes === 'string' ? req.body.notes.trim() : '';
  const key = typeof req.body.idempotencyKey === 'string' ? req.body.idempotencyKey.trim() : '';
  if (!action || !key || (action === 'DISPUTE' && notes.length < 5)) return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Action, idempotency key, and dispute notes are required.' } });
  try {
    const result = await prisma.$transaction(async (tx) => {
      const priors = await tx.$queryRaw<Array<{ incident_id: string; citizen_id: string }>>`SELECT incident_id,citizen_id FROM resolution_decisions WHERE idempotency_key=${key}`;
      if (priors[0] && (priors[0].citizen_id !== req.user!.id || priors[0].incident_id !== req.params.id)) throw Object.assign(new Error('Idempotency key belongs to another decision'), { code: 'FORBIDDEN' });
      if (priors[0]) return tx.incident.findUniqueOrThrow({ where: { id: priors[0].incident_id } });
      const incident = await tx.incident.findFirst({ where: { id: req.params.id, reports: { some: { submitterRef: req.user!.id } } } });
      if (!incident) throw Object.assign(new Error('Incident not found or not owned by citizen'), { code: 'NOT_FOUND' });
      if (req.user!.role !== UserRole.CITIZEN) throw Object.assign(new Error('Citizen ownership required'), { code: 'FORBIDDEN' });
      if (incident.status !== IncidentStatus.CITIZEN_CONFIRMATION) throw Object.assign(new Error('Incident is not awaiting citizen confirmation'), { code: 'INVALID_STATE' });
      await tx.$executeRaw`INSERT INTO resolution_decisions (incident_id,citizen_id,action,notes,idempotency_key) VALUES (${incident.id}::uuid,${req.user!.id}::uuid,${action}::"ResolutionDecisionAction",${notes || null},${key})`;
      const status = action === 'CONFIRM' ? IncidentStatus.RESOLVED : IncidentStatus.REOPENED;
      const updated = await tx.incident.update({ where: { id: incident.id }, data: { status, resolvedAt: action === 'CONFIRM' ? new Date() : null } });
      await tx.$executeRaw`UPDATE incidents SET citizen_confirmation_deadline=NULL WHERE id=${incident.id}::uuid`;
      const eventType = action === 'CONFIRM' ? 'CITIZEN_CONFIRMED' : 'CITIZEN_DISPUTED';
      await logIncidentChange(tx, incident.id, eventType, req.user!.id, { notes, newStatus: status });
      await emitLifecycle(tx, { incidentId: incident.id, eventType, state: status, actorRole: UserRole.CITIZEN, actorLabel: 'Citizen', metadata: { notes }, correlationId: `citizen-decision:${key}` });
      return updated;
    }, { maxWait: 15000, timeout: 30000 });
    res.json({ success: true, data: { incident: result } });
  } catch (error: any) { res.status(errorStatus(error)).json({ success: false, error: { code: error.code || 'SERVER_ERROR', message: error.message } }); }
});

router.get('/:id/verification', authenticateJWT, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const actor = await loadPolicyActor(prisma, req.user!.id);
    const incident = await prisma.incident.findFirst({ where: actor.role === UserRole.CITIZEN ? { id: req.params.id, reports: { some: { submitterRef: actor.id } } } : { id: req.params.id, ...incidentScope(actor) }, include: { reports: { select: { submitterRef: true } }, resolutionSubmissions: { orderBy: { submittedAt: 'desc' }, take: 5, select: { id: true, workerId: true, notes: true, captureAt: true, verificationStatus: true, verificationResult: true, verifiedAt: true, submittedAt: true } } } });
    const citizenOwns = incident?.reports.some((report) => report.submitterRef === actor.id);
    if (!incident || (actor.role === UserRole.CITIZEN && !citizenOwns)) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Verification details were not found.' } });
    return res.json({ success: true, data: { incidentId: incident.id, status: incident.status, confirmationDeadline: incident.citizenConfirmationDeadline, submissions: incident.resolutionSubmissions } });
  } catch (error: any) { return res.status(500).json({ success: false, error: { code: 'VERIFICATION_READ_FAILED', message: error.message } }); }
});

router.post('/:id/verification-review', authenticateJWT, requireRole([UserRole.WARD_OFFICER, UserRole.DEPARTMENT_HEAD, UserRole.ZONAL_OFFICER, UserRole.COMMISSIONER, UserRole.CITY_ADMIN, UserRole.SUPER_ADMIN]), async (req: AuthenticatedRequest, res: Response) => {
  const outcome = req.body.outcome === 'APPROVE' || req.body.outcome === 'REJECT' ? req.body.outcome : null;
  const reason = typeof req.body.reason === 'string' ? req.body.reason.trim() : '';
  if (!outcome || reason.length < 5) return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'A review outcome and audit reason are required.' } });
  try {
    const result = await prisma.$transaction(async (tx) => {
      const actor = await loadPolicyActor(tx, req.user!.id);
      const incident = await tx.incident.findFirst({ where: { id: req.params.id, ...incidentScope(actor) }, include: { resolutionSubmissions: { orderBy: { submittedAt: 'desc' }, take: 1 } } });
      if (!incident) throw Object.assign(new Error('Incident not found in your scope'), { code: 'NOT_FOUND' });
      if (incident.status !== IncidentStatus.AI_VERIFICATION) throw Object.assign(new Error('Incident is not awaiting verification review'), { code: 'INVALID_STATE' });
      const submission = incident.resolutionSubmissions[0];
      if (!submission) throw Object.assign(new Error('Resolution evidence is missing'), { code: 'INVALID_STATE' });
      const status = outcome === 'APPROVE' ? IncidentStatus.CITIZEN_CONFIRMATION : IncidentStatus.REOPENED;
      await tx.resolutionSubmission.update({ where: { id: submission.id }, data: { verificationStatus: outcome === 'APPROVE' ? 'VERIFIED_BY_OFFICIAL' : 'REJECTED_BY_OFFICIAL', verificationResult: { manual: true, outcome, reason, reviewedBy: actor.id }, verifiedAt: new Date() } });
      const updated = await tx.incident.update({ where: { id: incident.id }, data: { status, citizenConfirmationDeadline: outcome === 'APPROVE' ? new Date(Date.now() + 48 * 3600000) : null } });
      await logIncidentChange(tx, incident.id, outcome === 'APPROVE' ? 'RESOLUTION_OFFICIALLY_VERIFIED' : 'RESOLUTION_OFFICIALLY_REJECTED', actor.id, { submissionId: submission.id, reason, newStatus: status });
      await emitLifecycle(tx, { incidentId: incident.id, eventType: outcome === 'APPROVE' ? 'AWAITING_CITIZEN_CONFIRMATION' : 'INCIDENT_REOPENED', state: status, actorRole: actor.role, actorLabel: 'Authorized verification reviewer', metadata: { submissionId: submission.id, reason }, correlationId: 'official-verification:' + submission.id + ':' + outcome });
      return updated;
    });
    return res.json({ success: true, data: { incident: result } });
  } catch (error: any) { return res.status(error.code === 'NOT_FOUND' ? 404 : error.code === 'INVALID_STATE' ? 409 : 500).json({ success: false, error: { code: error.code || 'VERIFICATION_REVIEW_FAILED', message: error.message } }); }
});

router.post('/:id/administrative-close', authenticateJWT, requireRole([UserRole.WARD_OFFICER, UserRole.DEPARTMENT_HEAD, UserRole.ZONAL_OFFICER, UserRole.COMMISSIONER, UserRole.CITY_ADMIN, UserRole.SUPER_ADMIN]), async (req: AuthenticatedRequest, res: Response) => {
  const reason = typeof req.body.reason === 'string' ? req.body.reason.trim() : '';
  if (reason.length < 5) return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'An administrative closure reason is required.' } });
  try {
    const result = await prisma.$transaction(async (tx) => {
      const actor = await loadPolicyActor(tx, req.user!.id);
      const incident = await tx.incident.findFirst({ where: { id: req.params.id, ...incidentScope(actor) }, include: { resolutionSubmissions: { orderBy: { submittedAt: 'desc' }, take: 1 } } });
      if (!incident) throw Object.assign(new Error('Incident not found in your scope'), { code: 'NOT_FOUND' });
      if (!canAdministrativeClose({ status: incident.status, confirmationDeadline: incident.citizenConfirmationDeadline, verificationStatus: incident.resolutionSubmissions[0]?.verificationStatus })) throw Object.assign(new Error('Citizen confirmation window is still open or verified evidence is missing'), { code: 'INVALID_STATE' });
      const updated = await tx.incident.update({ where: { id: incident.id }, data: { status: IncidentStatus.RESOLVED, resolvedAt: new Date(), citizenConfirmationDeadline: null } });
      await logIncidentChange(tx, incident.id, 'ADMINISTRATIVE_CLOSURE', actor.id, { reason, appealWindowDays: 7 });
      await emitLifecycle(tx, { incidentId: incident.id, eventType: 'CITIZEN_CONFIRMED', state: IncidentStatus.RESOLVED, actorRole: actor.role, actorLabel: 'Authorized administrative closure', metadata: { reason, administrative: true }, correlationId: 'administrative-close:' + incident.id });
      return updated;
    });
    return res.json({ success: true, data: { incident: result } });
  } catch (error: any) { return res.status(error.code === 'NOT_FOUND' ? 404 : error.code === 'INVALID_STATE' ? 409 : 500).json({ success: false, error: { code: error.code || 'ADMINISTRATIVE_CLOSE_FAILED', message: error.message } }); }
});

router.post('/:id/appeal', authenticateJWT, async (req: AuthenticatedRequest, res: Response) => {
  const reason = typeof req.body.reason === 'string' ? req.body.reason.trim() : '';
  if (req.user!.role !== UserRole.CITIZEN || reason.length < 10) return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'A citizen appeal with at least ten characters is required.' } });
  try {
    const result = await prisma.$transaction(async (tx) => {
      const incident = await tx.incident.findFirst({ where: { id: req.params.id, status: IncidentStatus.RESOLVED, reports: { some: { submitterRef: req.user!.id } } } });
      if (!incident) throw Object.assign(new Error('Only an owned resolved Incident can be appealed'), { code: 'NOT_FOUND' });
      if (!isWithinAppealWindow(incident.resolvedAt)) throw Object.assign(new Error('The seven-day appeal window has expired'), { code: 'APPEAL_WINDOW_EXPIRED' });
      const rows = await tx.$queryRawUnsafe<Array<{ id: string }>>('INSERT INTO resolution_appeals (incident_id,citizen_id,reason) VALUES ($1::uuid,$2::uuid,$3) RETURNING id', incident.id, req.user!.id, reason);
      const updated = await tx.incident.update({ where: { id: incident.id }, data: { status: IncidentStatus.REOPENED, resolvedAt: null, citizenConfirmationDeadline: null } });
      await logIncidentChange(tx, incident.id, 'RESOLUTION_APPEALED', req.user!.id, { reason, appealId: rows[0]?.id, newStatus: IncidentStatus.REOPENED });
      await emitLifecycle(tx, { incidentId: incident.id, eventType: 'INCIDENT_REOPENED', state: IncidentStatus.REOPENED, actorRole: UserRole.CITIZEN, actorLabel: 'Citizen appeal', metadata: { reason, appealId: rows[0]?.id }, correlationId: 'appeal:' + rows[0]?.id });
      return { incident: updated, appealId: rows[0]?.id };
    });
    return res.json({ success: true, data: result });
  } catch (error: any) { return res.status(error.code === 'APPEAL_WINDOW_EXPIRED' ? 409 : error.code === 'NOT_FOUND' ? 404 : 500).json({ success: false, error: { code: error.code || 'APPEAL_FAILED', message: error.message } }); }
});

// Explicit, idempotent lifecycle command for administrative/workforce clients.
router.post('/:id/transition', authenticateJWT, requireRole([
  UserRole.WARD_OFFICER,
  UserRole.DEPARTMENT_HEAD,
  UserRole.ZONAL_OFFICER,
  UserRole.COMMISSIONER,
  UserRole.CITY_ADMIN,
  UserRole.SUPER_ADMIN,
  UserRole.FIELD_WORKER,
]), async (req: AuthenticatedRequest, res: Response) => {
  const target = typeof req.body.to === 'string' ? req.body.to : '';
  const idempotencyKey = typeof req.body.idempotencyKey === 'string' ? req.body.idempotencyKey.trim() : '';
  if (!Object.values(IncidentStatus).includes(target as IncidentStatus) || !idempotencyKey || idempotencyKey.length > 160) return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'A valid target state and idempotency key are required.' } });
  try {
    const result = await prisma.$transaction(async (tx) => {
      const [actor, incident] = await Promise.all([loadPolicyActor(tx, req.user!.id), scopedIncident(tx, req.params.id)]);
      if (!incident) throw Object.assign(new Error('Incident not found'), { code: 'NOT_FOUND' });
      assertTriageAccess(actor, incident);
      if (actor.role === UserRole.FIELD_WORKER && incident.assignedTo !== actor.id) throw Object.assign(new Error('Only the assigned worker may transition this incident.'), { code: 'FORBIDDEN' });
      return transitionIncident(tx, { incidentId: incident.id, to: target as IncidentStatus, actorId: actor.id, actorRole: actor.role, actorLabel: actor.id, idempotencyKey, metadata: { command: 'explicit_transition' } });
    }, { maxWait: 15000, timeout: 30000 });
    return res.json({ success: true, data: { incident: result, idempotentReplay: Boolean((result as { idempotentReplay?: boolean }).idempotentReplay) } });
  } catch (error: any) {
    return res.status(errorStatus(error)).json({ success: false, error: { code: error.code || 'SERVER_ERROR', message: error.message || 'Lifecycle transition failed.' } });
  }
});

export default router;
