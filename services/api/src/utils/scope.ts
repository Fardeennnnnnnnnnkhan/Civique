import { Prisma, UserRole } from '@prisma/client';

export type ScopedUser = { id: string; role: UserRole; cityId: string | null; zoneId: string | null; wardId: string | null; departmentId: string | null };

/** Return an empty predicate when a scoped official has no assigned scope. */
export function incidentScope(user: ScopedUser): Prisma.IncidentWhereInput {
  switch (user.role) {
    case UserRole.SUPER_ADMIN: return {};
    case UserRole.FIELD_WORKER: return { assignedTo: user.id };
    case UserRole.WARD_OFFICER: return user.wardId ? { wardId: user.wardId } : { id: '__NO_SCOPE__' };
    case UserRole.ZONAL_OFFICER: return user.zoneId ? { zoneId: user.zoneId } : { id: '__NO_SCOPE__' };
    case UserRole.DEPARTMENT_HEAD: return user.departmentId ? { departmentId: user.departmentId } : { id: '__NO_SCOPE__' };
    case UserRole.CITY_ADMIN:
    case UserRole.COMMISSIONER: return user.cityId ? { cityId: user.cityId } : { id: '__NO_SCOPE__' };
    default: return { id: '__NO_SCOPE__' };
  }
}

export function userScope(user: ScopedUser): Prisma.UserWhereInput {
  switch (user.role) {
    case UserRole.SUPER_ADMIN: return {};
    case UserRole.FIELD_WORKER: return { id: user.id };
    case UserRole.WARD_OFFICER: return user.wardId ? { wardId: user.wardId } : { id: '__NO_SCOPE__' };
    case UserRole.ZONAL_OFFICER: return user.zoneId ? { zoneId: user.zoneId } : { id: '__NO_SCOPE__' };
    case UserRole.DEPARTMENT_HEAD: return user.departmentId ? { departmentId: user.departmentId } : { id: '__NO_SCOPE__' };
    case UserRole.CITY_ADMIN:
    case UserRole.COMMISSIONER: return user.cityId ? { cityId: user.cityId } : { id: '__NO_SCOPE__' };
    default: return { id: '__NO_SCOPE__' };
  }
}

export function scopeLabel(user: ScopedUser) {
  if (user.role === UserRole.SUPER_ADMIN) return { type: 'platform', id: null };
  if (user.role === UserRole.FIELD_WORKER) return { type: 'worker', id: user.id };
  if (user.wardId) return { type: 'ward', id: user.wardId };
  if (user.zoneId) return { type: 'zone', id: user.zoneId };
  if (user.departmentId) return { type: 'department', id: user.departmentId };
  if (user.cityId) return { type: 'city', id: user.cityId };
  return { type: 'none', id: null };
}
