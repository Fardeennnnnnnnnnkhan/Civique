import { Incident, Prisma, UserRole } from '@prisma/client';

export type PolicyActor = {
  id: string;
  role: UserRole;
  cityId: string | null;
  zoneId: string | null;
  wardId: string | null;
  departmentId: string | null;
  active: boolean;
};

export async function loadPolicyActor(db: Prisma.TransactionClient | any, id: string): Promise<PolicyActor> {
  const actor = await db.user.findUnique({ where: { id }, select: { id: true, role: true, cityId: true, zoneId: true, wardId: true, departmentId: true, active: true } });
  if (!actor?.active) throw Object.assign(new Error('Active account required'), { code: 'FORBIDDEN' });
  return actor;
}

export function canReadIncident(actor: PolicyActor, incident: Pick<Incident, 'cityId' | 'zoneId' | 'wardId' | 'departmentId' | 'assignedTo'>, citizenOwns = false): boolean {
  switch (actor.role) {
    case UserRole.SUPER_ADMIN: return true;
    case UserRole.CITIZEN: return citizenOwns;
    case UserRole.FIELD_WORKER: return incident.assignedTo === actor.id;
    case UserRole.WARD_OFFICER: return !!actor.wardId && incident.wardId === actor.wardId;
    case UserRole.DEPARTMENT_HEAD: return !!actor.departmentId && incident.departmentId === actor.departmentId && (!actor.cityId || incident.cityId === actor.cityId);
    case UserRole.ZONAL_OFFICER: return !!actor.zoneId && incident.zoneId === actor.zoneId;
    case UserRole.COMMISSIONER:
    case UserRole.CITY_ADMIN: return !!actor.cityId && incident.cityId === actor.cityId;
    default: return false;
  }
}

export function assertIncidentAccess(actor: PolicyActor, incident: Pick<Incident, 'cityId' | 'zoneId' | 'wardId' | 'departmentId' | 'assignedTo'>, citizenOwns = false) {
  if (!canReadIncident(actor, incident, citizenOwns)) throw Object.assign(new Error('Resource is outside your authorized scope'), { code: 'FORBIDDEN' });
}

export function canTriage(actor: PolicyActor, incident: { cityId: string | null; zoneId: string | null; wardId: string | null; departmentId: string | null; triageOwnerId?: string | null }): boolean {
  if (actor.role === UserRole.SUPER_ADMIN) return true;
  if (actor.role === UserRole.WARD_OFFICER) return actor.wardId === incident.wardId && (!incident.triageOwnerId || incident.triageOwnerId === actor.id);
  if (actor.role === UserRole.DEPARTMENT_HEAD) return actor.departmentId === incident.departmentId && (!actor.cityId || actor.cityId === incident.cityId);
  if (actor.role === UserRole.ZONAL_OFFICER) return actor.zoneId === incident.zoneId;
  return (actor.role === UserRole.CITY_ADMIN || actor.role === UserRole.COMMISSIONER) && actor.cityId === incident.cityId;
}

export function assertTriageAccess(actor: PolicyActor, incident: Parameters<typeof canTriage>[1]) {
  if (!canTriage(actor, incident)) throw Object.assign(new Error('Incident mutation is outside your triage scope'), { code: 'FORBIDDEN' });
}
