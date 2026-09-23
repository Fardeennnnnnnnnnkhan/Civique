import { UserRole } from '@prisma/client';

export const PERMISSIONS = { PEOPLE_READ: 'people.read', PEOPLE_INVITE: 'people.invite', PEOPLE_STATUS: 'people.status', ROLES_READ: 'roles.read', ROLES_MANAGE: 'roles.manage', AUDIT_READ: 'audit.read' } as const;
export type Permission = typeof PERMISSIONS[keyof typeof PERMISSIONS];
const ROLE_PERMISSIONS: Record<UserRole, readonly Permission[]> = {
  [UserRole.CITIZEN]: [], [UserRole.FIELD_WORKER]: [],
  [UserRole.WARD_OFFICER]: [PERMISSIONS.PEOPLE_READ], [UserRole.DEPARTMENT_HEAD]: [PERMISSIONS.PEOPLE_READ], [UserRole.ZONAL_OFFICER]: [PERMISSIONS.PEOPLE_READ],
  [UserRole.COMMISSIONER]: [PERMISSIONS.PEOPLE_READ, PERMISSIONS.PEOPLE_INVITE, PERMISSIONS.PEOPLE_STATUS, PERMISSIONS.ROLES_READ, PERMISSIONS.AUDIT_READ],
  [UserRole.CITY_ADMIN]: [PERMISSIONS.PEOPLE_READ, PERMISSIONS.PEOPLE_INVITE, PERMISSIONS.PEOPLE_STATUS, PERMISSIONS.ROLES_READ, PERMISSIONS.AUDIT_READ],
  [UserRole.SUPER_ADMIN]: Object.values(PERMISSIONS),
};
export function hasPermission(role: UserRole, permission: Permission): boolean { return ROLE_PERMISSIONS[role]?.includes(permission) ?? false; }
export function isActiveWindow(startsAt: Date, expiresAt: Date | null, now = new Date()): boolean { return startsAt <= now && (!expiresAt || expiresAt > now); }
export function permissionCatalog() { return Object.values(PERMISSIONS).map((key) => ({ key, reserved: key === PERMISSIONS.ROLES_MANAGE || key === PERMISSIONS.AUDIT_READ, description: key.replace('.', ' — ') })); }
