import { IncidentStatus } from '@prisma/client';
export const PUBLIC_STATUSES: IncidentStatus[] = [IncidentStatus.REPORTED, IncidentStatus.AI_REVIEW, IncidentStatus.OPEN, IncidentStatus.ACKNOWLEDGED, IncidentStatus.ASSIGNED, IncidentStatus.IN_PROGRESS, IncidentStatus.RESOLUTION_SUBMITTED, IncidentStatus.AI_VERIFICATION, IncidentStatus.CITIZEN_CONFIRMATION, IncidentStatus.RESOLVED, IncidentStatus.ESCALATED, IncidentStatus.REOPENED, IncidentStatus.DISPUTED];
function approximateCoordinate(value: number): number {
  // Three decimals are roughly 100m at Indore latitude and prevent household-level mapping.
  return Number(value.toFixed(3));
}
export function toPublicIncidentSummary(incident: any) {
  return { id: incident.id, trackingId: incident.publicTrackingId, category: incident.category, status: incident.status, priority: incident.priority, latitude: approximateCoordinate(incident.latitude), longitude: approximateCoordinate(incident.longitude), locationPrecision: 'APPROXIMATE_100M', ward: incident.ward ? { id: incident.ward.id, name: incident.ward.name } : null, reportCount: incident.reportCount, createdAt: incident.createdAt };
}
export function toPublicIncidentDetail(incident: any) {
  return { ...toPublicIncidentSummary(incident), resolvedAt: incident.resolvedAt ?? null, resolutionAvailable: Boolean(incident.resolvedAt), lastUpdatedAt: incident.completedAt ?? incident.assignedAt ?? incident.createdAt };
}

export function clusterPublicIncidents(incidents: Array<{ latitude: number; longitude: number; category?: string; status?: string }>) {
  const cells = new Map<string, { latitude: number; longitude: number; count: number; categories: Set<string>; statuses: Set<string> }>();
  for (const incident of incidents) {
    const latitude = Number(incident.latitude.toFixed(3));
    const longitude = Number(incident.longitude.toFixed(3));
    const key = `${latitude}:${longitude}`;
    const current = cells.get(key) || { latitude, longitude, count: 0, categories: new Set<string>(), statuses: new Set<string>() };
    current.count += 1;
    if (incident.category) current.categories.add(incident.category);
    if (incident.status) current.statuses.add(incident.status);
    cells.set(key, current);
  }
  return [...cells.values()].map((cell) => ({ latitude: cell.latitude, longitude: cell.longitude, count: cell.count, categories: [...cell.categories], statuses: [...cell.statuses] }));
}

export function toPublicEventPayload(payload: unknown, entityId: string) {
  if (!payload || typeof payload !== 'object') return { id: entityId };
  const value = payload as Record<string, any>;
  if (typeof value.latitude !== 'number' || typeof value.longitude !== 'number') return { id: value.id || entityId, status: value.status || undefined };
  return toPublicIncidentSummary({ ...value, id: value.id || entityId, publicTrackingId: value.publicTrackingId || value.trackingId || entityId, reportCount: Number(value.reportCount || 0), createdAt: value.createdAt || new Date(0), ward: value.ward ? { id: value.ward.id, name: value.ward.name } : null });
}
