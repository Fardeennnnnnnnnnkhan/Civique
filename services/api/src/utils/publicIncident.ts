import { IncidentStatus } from '@prisma/client';
export const PUBLIC_STATUSES: IncidentStatus[] = [IncidentStatus.REPORTED, IncidentStatus.AI_REVIEW, IncidentStatus.OPEN, IncidentStatus.ACKNOWLEDGED, IncidentStatus.ASSIGNED, IncidentStatus.IN_PROGRESS, IncidentStatus.RESOLUTION_SUBMITTED, IncidentStatus.AI_VERIFICATION, IncidentStatus.CITIZEN_CONFIRMATION, IncidentStatus.RESOLVED, IncidentStatus.ESCALATED, IncidentStatus.REOPENED, IncidentStatus.DISPUTED];
export function toPublicIncidentSummary(incident: any) {
  return { id: incident.id, trackingId: incident.publicTrackingId, category: incident.category, status: incident.status, priority: incident.priority, priorityScore: incident.priorityScore, latitude: Number(incident.latitude.toFixed(5)), longitude: Number(incident.longitude.toFixed(5)), ward: incident.ward ? { id: incident.ward.id, name: incident.ward.name } : null, reportCount: incident.reportCount, createdAt: incident.createdAt };
}
