import { IncidentStatus, Prisma, UserRole } from '@prisma/client';
import { logIncidentChange } from '../utils/audit';

const transitions: Record<IncidentStatus, readonly IncidentStatus[]> = {
  REPORTED: ['AI_REVIEW', 'OPEN', 'REJECTED', 'DUPLICATE'],
  AI_REVIEW: ['OPEN', 'REJECTED', 'DUPLICATE'],
  OPEN: ['ACKNOWLEDGED', 'ASSIGNED', 'REJECTED', 'DUPLICATE'],
  ACKNOWLEDGED: ['ASSIGNED', 'ESCALATED'],
  ASSIGNED: ['IN_PROGRESS', 'ESCALATED'],
  IN_PROGRESS: ['RESOLUTION_SUBMITTED', 'ESCALATED'],
  RESOLUTION_SUBMITTED: ['AI_VERIFICATION'],
  AI_VERIFICATION: ['CITIZEN_CONFIRMATION', 'REOPENED'],
  CITIZEN_CONFIRMATION: ['RESOLVED', 'DISPUTED'],
  RESOLVED: ['REOPENED'],
  DUPLICATE: [], REJECTED: [],
  ESCALATED: ['ASSIGNED'], DISPUTED: ['REOPENED'], REOPENED: ['OPEN'],
};
const workerTargets: IncidentStatus[] = [IncidentStatus.IN_PROGRESS, IncidentStatus.RESOLUTION_SUBMITTED];
const officials: UserRole[] = [UserRole.WARD_OFFICER, UserRole.DEPARTMENT_HEAD, UserRole.ZONAL_OFFICER, UserRole.COMMISSIONER, UserRole.CITY_ADMIN, UserRole.SUPER_ADMIN];

export function isValidIncidentTransition(from: IncidentStatus, to: IncidentStatus): boolean { return transitions[from]?.includes(to) ?? false; }
export async function transitionIncident(tx: Prisma.TransactionClient, input: { incidentId: string; to: IncidentStatus; actorId: string; actorRole: UserRole; actorLabel: string; metadata?: Record<string, unknown> }) {
  const incident = await tx.incident.findUnique({ where: { id: input.incidentId } });
  if (!incident) throw Object.assign(new Error('Incident not found'), { code: 'NOT_FOUND' });
  if (!isValidIncidentTransition(incident.status, input.to)) throw Object.assign(new Error(`Invalid transition ${incident.status} -> ${input.to}`), { code: 'INVALID_STATE_TRANSITION' });
  if (input.actorRole === UserRole.FIELD_WORKER && !workerTargets.includes(input.to)) throw Object.assign(new Error('Field workers may only start or submit assigned work'), { code: 'FORBIDDEN' });
  if (!officials.includes(input.actorRole) && input.actorRole !== UserRole.FIELD_WORKER && input.actorRole !== UserRole.CITIZEN) throw Object.assign(new Error('Role cannot transition incidents'), { code: 'FORBIDDEN' });
  const data: Prisma.IncidentUpdateInput = { status: input.to };
  if (input.to === IncidentStatus.IN_PROGRESS) data.startedAt = incident.startedAt || new Date();
  if (input.to === IncidentStatus.RESOLVED) { data.resolvedAt = new Date(); data.completedAt = new Date(); }
  const updated = await tx.incident.update({ where: { id: input.incidentId }, data });
  await logIncidentChange(tx, input.incidentId, 'INCIDENT_STATUS_CHANGED', input.actorLabel, { previousStatus: incident.status, newStatus: input.to, ...(input.metadata || {}) });
  await tx.outboxEvent.create({ data: { topic: 'incident.status_changed', payload: { incidentId: input.incidentId, previousStatus: incident.status, status: input.to, actorId: input.actorId }, idempotencyKey: `incident:${input.incidentId}:${incident.status}:${input.to}:${Date.now()}` } });
  return updated;
}
