import { Router, Response } from 'express';
import { prisma } from '../db';
import { UserRole } from '@prisma/client';
import { AuthenticatedRequest, authenticateJWT, requirePermission, requireRole } from '../middleware/auth';
import { PERMISSIONS, permissionCatalog } from '../services/rbac';
import { Prisma } from '@prisma/client';
import { userScope } from '../utils/scope';
import { z } from 'zod';
import { AuthTokenPurpose, issueAuthActionToken, revokeOpenAuthActionTokens } from '../services/authTokens';
import { enqueueOutbox } from '../jobs/queue';
import { recordSecurityEvent } from '../services/securityEvents';

const router = Router();

const officialRoles = [UserRole.WARD_OFFICER, UserRole.DEPARTMENT_HEAD, UserRole.ZONAL_OFFICER, UserRole.COMMISSIONER, UserRole.CITY_ADMIN, UserRole.SUPER_ADMIN];
const userManagerRoles = [UserRole.COMMISSIONER, UserRole.CITY_ADMIN, UserRole.SUPER_ADMIN];
const roleRank: Record<UserRole, number> = {
  CITIZEN: 0,
  FIELD_WORKER: 1,
  WARD_OFFICER: 2,
  DEPARTMENT_HEAD: 3,
  ZONAL_OFFICER: 4,
  COMMISSIONER: 5,
  CITY_ADMIN: 6,
  SUPER_ADMIN: 7,
};

const invitationSchema = z.object({
  email: z.string().trim().email().max(254).transform((value) => value.toLowerCase()),
  role: z.nativeEnum(UserRole).refine((role) => role !== UserRole.CITIZEN && role !== UserRole.SUPER_ADMIN),
  cityId: z.string().uuid(),
  zoneId: z.string().uuid().optional(),
  wardId: z.string().uuid().optional(),
  departmentId: z.string().uuid().optional(),
});

router.get('/permissions/catalog', authenticateJWT, requirePermission(PERMISSIONS.ROLES_READ), async (_req: AuthenticatedRequest, res: Response) => res.json({ success: true, data: { permissions: permissionCatalog() } }));

router.get('/roles', authenticateJWT, requirePermission(PERMISSIONS.ROLES_READ), async (req: AuthenticatedRequest, res: Response) => {
  const actor = await prisma.user.findUnique({ where: { id: req.user!.id }, select: { cityId: true, role: true } });
  if (!actor) return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Active account required.' } });
  try {
    const roles = await prisma.$queryRaw<Array<{ id: string; name: string; key: string; cityId: string | null; protected: boolean; description: string | null }>>`SELECT id,name,key,city_id "cityId",protected,description FROM roles WHERE active=true AND (city_id IS NULL OR city_id=${actor.cityId}::uuid) ORDER BY protected DESC,name ASC`;
    if (roles.length) return res.json({ success: true, data: { roles } });
    const names: Record<string, string> = { SUPER_ADMIN: 'Super Administrator', CITY_ADMIN: 'City Administrator', COMMISSIONER: 'Commissioner', ZONAL_OFFICER: 'Zonal Officer', DEPARTMENT_HEAD: 'Department Head', WARD_OFFICER: 'Ward Officer', FIELD_WORKER: 'Field Worker', CITIZEN: 'Citizen' };
    return res.json({ success: true, data: { roles: Object.entries(names).map(([key, name]) => ({ id: `legacy-${key}`, name, key, cityId: null, protected: true, description: 'Protected system role. Apply migration 0021 to manage persistent assignments.', permissions: [] })) } });
  } catch {
    const names: Record<string, string> = { SUPER_ADMIN: 'Super Administrator', CITY_ADMIN: 'City Administrator', COMMISSIONER: 'Commissioner', ZONAL_OFFICER: 'Zonal Officer', DEPARTMENT_HEAD: 'Department Head', WARD_OFFICER: 'Ward Officer', FIELD_WORKER: 'Field Worker', CITIZEN: 'Citizen' };
    return res.json({ success: true, data: { roles: Object.entries(names).map(([key, name]) => ({ id: `legacy-${key}`, name, key, cityId: null, protected: true, description: 'Protected system role. Apply migration 0021 to manage persistent assignments.', permissions: [] })) } });
  }
});

router.post('/roles', authenticateJWT, requirePermission(PERMISSIONS.ROLES_MANAGE), async (req: AuthenticatedRequest, res: Response) => {
  const parsed = z.object({ name: z.string().trim().min(2).max(80), key: z.string().regex(/^[a-z][a-z0-9_.-]{2,60}$/), description: z.string().trim().max(500).optional(), cityId: z.string().uuid().nullable().optional(), permissionKeys: z.array(z.string()).max(50).default([]) }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Role name, key, and valid permissions are required.' } });
  const actor = await prisma.user.findUnique({ where: { id: req.user!.id }, select: { cityId: true } });
  const cityId = parsed.data.cityId ?? actor?.cityId ?? null;
  if (!actor || (req.user!.role !== UserRole.SUPER_ADMIN && cityId !== actor.cityId)) return res.status(403).json({ success: false, error: { code: 'SCOPE_DENIED', message: 'Custom roles must remain within your city scope.' } });
  const permissions = await prisma.$queryRaw<Array<{ id: string; key: string; reserved: boolean }>>`SELECT id,key,reserved FROM permissions WHERE key = ANY(${parsed.data.permissionKeys}::text[])`;
  if (permissions.length !== parsed.data.permissionKeys.length || permissions.some((permission) => permission.reserved)) return res.status(403).json({ success: false, error: { code: 'RESERVED_PERMISSION', message: 'Custom roles cannot grant reserved permissions.' } });
  try {
    const roleRows = await prisma.$queryRaw<Array<{ id: string }>>`INSERT INTO roles (name,key,city_id,description) VALUES (${parsed.data.name},${parsed.data.key},${cityId}::uuid,${parsed.data.description ?? null}) RETURNING id`;
    const roleId = roleRows[0]?.id;
    if (!roleId) throw new Error('ROLE_CREATE_FAILED');
    for (const permission of permissions) await prisma.$executeRaw`INSERT INTO role_permissions (role_id,permission_id) VALUES (${roleId}::uuid,${permission.id}::uuid)`;
    return res.status(201).json({ success: true, data: { role: { id: roleId, name: parsed.data.name, key: parsed.data.key, cityId, permissions: permissions.map((permission) => permission.key) } } });
  } catch { return res.status(409).json({ success: false, error: { code: 'ROLE_EXISTS', message: 'A role with this key already exists in the selected scope.' } }); }
});

router.post('/:id([0-9a-fA-F-]{36})/role-assignments', authenticateJWT, requirePermission(PERMISSIONS.ROLES_MANAGE), async (req: AuthenticatedRequest, res: Response) => {
  const parsed = z.object({ roleId: z.string().uuid(), reason: z.string().trim().min(3).max(500), startsAt: z.coerce.date().optional(), expiresAt: z.coerce.date().optional() }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Role, reason, and valid assignment dates are required.' } });
  if (req.params.id === req.user!.id) return res.status(409).json({ success: false, error: { code: 'SEPARATION_OF_DUTIES', message: 'You cannot approve your own role elevation.' } });
  const [actor, target, role] = await Promise.all([
    prisma.user.findUnique({ where: { id: req.user!.id }, select: { id: true, role: true, cityId: true, zoneId: true, wardId: true, departmentId: true } }),
    prisma.user.findUnique({ where: { id: req.params.id }, select: { id: true, cityId: true, role: true } }),
    prisma.$queryRaw<Array<{ id: string; cityId: string | null }>>`SELECT id,city_id "cityId" FROM roles WHERE id=${parsed.data.roleId}::uuid AND active=true`,
  ]);
  const roleRecord = role[0];
  if (!actor || !target || !roleRecord) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Target user or role was not found.' } });
  if (roleRecord.cityId && roleRecord.cityId !== target.cityId) return res.status(403).json({ success: false, error: { code: 'SCOPE_DENIED', message: 'Role is outside the target city scope.' } });
  const scopedTarget = await prisma.user.findFirst({ where: { id: target.id, ...userScope(actor) }, select: { id: true } });
  if (!scopedTarget) return res.status(403).json({ success: false, error: { code: 'SCOPE_DENIED', message: 'Target user is outside your assigned scope.' } });
  const assignments = await prisma.$queryRaw<Array<{ id: string; userId: string; roleId: string; status: string; startsAt: Date; expiresAt: Date | null }>>`INSERT INTO user_role_assignments (user_id,role_id,approved_by_id,reason,starts_at,expires_at) VALUES (${target.id}::uuid,${roleRecord.id}::uuid,${actor.id}::uuid,${parsed.data.reason},${parsed.data.startsAt ?? new Date()},${parsed.data.expiresAt ?? null}) RETURNING id,user_id "userId",role_id "roleId",status,starts_at "startsAt",expires_at "expiresAt"`;
  return res.status(201).json({ success: true, data: { assignment: assignments[0] } });
});

router.post('/:id([0-9a-fA-F-]{36})/scope-grants', authenticateJWT, requirePermission(PERMISSIONS.ROLES_MANAGE), async (req: AuthenticatedRequest, res: Response) => {
  const parsed = z.object({ scopeType: z.enum(['CITY', 'ZONE', 'WARD', 'DEPARTMENT', 'ASSET_TYPE']), scopeId: z.string().uuid(), reason: z.string().trim().min(3).max(500), startsAt: z.coerce.date().optional(), expiresAt: z.coerce.date().optional() }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Scope type, scope ID, reason, and valid dates are required.' } });
  if (req.params.id === req.user!.id) return res.status(409).json({ success: false, error: { code: 'SEPARATION_OF_DUTIES', message: 'You cannot grant yourself a new scope.' } });
  const actor = await prisma.user.findUnique({ where: { id: req.user!.id }, select: { id: true, role: true, cityId: true, zoneId: true, wardId: true, departmentId: true } });
  const target = await prisma.user.findUnique({ where: { id: req.params.id }, select: { id: true } });
  if (!actor || !target) return res.status(404).json({ success: false, error: { code: 'USER_NOT_FOUND', message: 'Target user was not found.' } });
  const scoped = await prisma.user.findFirst({ where: { id: target.id, ...userScope(actor) }, select: { id: true } });
  if (!scoped) return res.status(403).json({ success: false, error: { code: 'SCOPE_DENIED', message: 'Target user is outside your scope.' } });
  const rows = await prisma.$queryRaw<Array<{ id: string; scopeType: string; scopeId: string; expiresAt: Date | null }>>`INSERT INTO scope_grants (user_id,scope_type,scope_id,reason,starts_at,expires_at) VALUES (${target.id}::uuid,${parsed.data.scopeType},${parsed.data.scopeId}::uuid,${parsed.data.reason},${parsed.data.startsAt ?? new Date()},${parsed.data.expiresAt ?? null}) RETURNING id,scope_type "scopeType",scope_id "scopeId",expires_at "expiresAt"`;
  return res.status(201).json({ success: true, data: { grant: rows[0] } });
});

router.post('/:id([0-9a-fA-F-]{36})/delegations', authenticateJWT, requirePermission(PERMISSIONS.ROLES_MANAGE), async (req: AuthenticatedRequest, res: Response) => {
  const parsed = z.object({ delegateeId: z.string().uuid(), permission: z.string().min(3).max(100), scopeType: z.string().max(30).optional(), scopeId: z.string().uuid().optional(), startsAt: z.coerce.date(), expiresAt: z.coerce.date(), reason: z.string().trim().min(3).max(500) }).refine((value) => value.expiresAt > value.startsAt, { message: 'expiresAt must be after startsAt' }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Delegation dates, permission, delegatee, and reason are required.' } });
  if (parsed.data.delegateeId === req.user!.id) return res.status(409).json({ success: false, error: { code: 'SEPARATION_OF_DUTIES', message: 'You cannot delegate authority to yourself.' } });
  const rows = await prisma.$queryRaw<Array<{ id: string; expiresAt: Date }>>`INSERT INTO delegations (grantor_id,delegatee_id,permission,scope_type,scope_id,starts_at,expires_at,reason) VALUES (${req.user!.id}::uuid,${parsed.data.delegateeId}::uuid,${parsed.data.permission},${parsed.data.scopeType ?? null},${parsed.data.scopeId ?? null}::uuid,${parsed.data.startsAt},${parsed.data.expiresAt},${parsed.data.reason}) RETURNING id,expires_at "expiresAt"`;
  return res.status(201).json({ success: true, data: { delegation: rows[0] } });
});

router.get('/:id([0-9a-fA-F-]{36})/employment', authenticateJWT, requirePermission(PERMISSIONS.PEOPLE_READ), async (req: AuthenticatedRequest, res: Response) => {
  const profile = await prisma.$queryRaw<Array<Record<string, unknown>>>`SELECT id,user_id "userId",employee_number "employeeNumber",designation,skills,shift,availability,supervisor_id "supervisorId",emergency_phone "emergencyPhone" FROM employment_profiles WHERE user_id=${req.params.id}::uuid`;
  return res.json({ success: true, data: { profile: profile[0] ?? null } });
});

router.put('/:id([0-9a-fA-F-]{36})/employment', authenticateJWT, requirePermission(PERMISSIONS.PEOPLE_STATUS), async (req: AuthenticatedRequest, res: Response) => {
  const parsed = z.object({ employeeNumber: z.string().trim().max(60).optional(), designation: z.string().trim().max(120).optional(), skills: z.array(z.string().trim().max(60)).max(30).optional(), shift: z.string().trim().max(80).optional(), availability: z.enum(['AVAILABLE', 'ON_LEAVE', 'OFF_DUTY', 'SUSPENDED']).optional(), supervisorId: z.string().uuid().nullable().optional(), emergencyPhone: z.string().trim().max(30).optional() }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Employee profile fields are invalid.' } });
  const p = parsed.data;
  const rows = await prisma.$queryRaw<Array<Record<string, unknown>>>`INSERT INTO employment_profiles (user_id,employee_number,designation,skills,shift,availability,supervisor_id,emergency_phone) VALUES (${req.params.id}::uuid,${p.employeeNumber ?? null},${p.designation ?? null},${p.skills ?? []},${p.shift ?? null},${p.availability ?? 'AVAILABLE'},${p.supervisorId ?? null}::uuid,${p.emergencyPhone ?? null}) ON CONFLICT (user_id) DO UPDATE SET employee_number=EXCLUDED.employee_number,designation=EXCLUDED.designation,skills=EXCLUDED.skills,shift=EXCLUDED.shift,availability=EXCLUDED.availability,supervisor_id=EXCLUDED.supervisor_id,emergency_phone=EXCLUDED.emergency_phone,updated_at=NOW() RETURNING id,user_id "userId",employee_number "employeeNumber",designation,skills,shift,availability,supervisor_id "supervisorId",emergency_phone "emergencyPhone"`;
  return res.json({ success: true, data: { profile: rows[0] } });
});

async function validateInvitationScope(actor: { role: UserRole; cityId: string | null }, input: z.infer<typeof invitationSchema>) {
  if (actor.role !== UserRole.SUPER_ADMIN && actor.cityId !== input.cityId) return 'Invitations must remain within your city scope.';
  if (roleRank[input.role] >= roleRank[actor.role]) return 'You cannot invite a user at or above your role.';
  const wardScopedRoles: UserRole[] = [UserRole.FIELD_WORKER, UserRole.WARD_OFFICER];
  const departmentScopedRoles: UserRole[] = [UserRole.FIELD_WORKER, UserRole.DEPARTMENT_HEAD];
  if (wardScopedRoles.includes(input.role) && !input.wardId) return 'A ward is required for this role.';
  if (input.role === UserRole.ZONAL_OFFICER && !input.zoneId) return 'A zone is required for this role.';
  if (departmentScopedRoles.includes(input.role) && !input.departmentId) return 'A department is required for this role.';

  const [city, zone, ward, department] = await Promise.all([
    prisma.city.findUnique({ where: { id: input.cityId }, select: { id: true, active: true } }),
    input.zoneId ? prisma.zone.findUnique({ where: { id: input.zoneId }, select: { cityId: true } }) : null,
    input.wardId ? prisma.ward.findUnique({ where: { id: input.wardId }, select: { zone: { select: { cityId: true } } } }) : null,
    input.departmentId ? prisma.department.findUnique({ where: { id: input.departmentId }, select: { cityId: true } }) : null,
  ]);
  if (!city?.active) return 'The selected city is unavailable.';
  if (zone && zone.cityId !== input.cityId) return 'The selected zone is outside the city.';
  if (ward && ward.zone.cityId !== input.cityId) return 'The selected ward is outside the city.';
  if (department && department.cityId !== input.cityId) return 'The selected department is outside the city.';
  if (input.zoneId && !zone) return 'The selected zone does not exist.';
  if (input.wardId && !ward) return 'The selected ward does not exist.';
  if (input.departmentId && !department) return 'The selected department does not exist.';
  return null;
}

router.post('/invitations', authenticateJWT, requirePermission(PERMISSIONS.PEOPLE_INVITE), async (req: AuthenticatedRequest, res: Response) => {
  const parsed = invitationSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invitation details are invalid.', details: parsed.error.flatten().fieldErrors } });
  const actor = await prisma.user.findUnique({ where: { id: req.user!.id }, select: { id: true, role: true, cityId: true } });
  if (!actor) return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'User-management permission required.' } });
  const scopeError = await validateInvitationScope(actor, parsed.data);
  if (scopeError) return res.status(403).json({ success: false, error: { code: 'SCOPE_DENIED', message: scopeError } });

  const existing = await prisma.user.findUnique({ where: { email: parsed.data.email }, select: { id: true, passwordHash: true } });
  if (existing?.passwordHash) return res.status(409).json({ success: false, error: { code: 'USER_EXISTS', message: 'An activated account already uses this email.' } });

  const result = await prisma.$transaction(async (tx) => {
    const user = existing
      ? await tx.user.update({ where: { id: existing.id }, data: { ...parsed.data, active: false } })
      : await tx.user.create({ data: { ...parsed.data, active: false } });
    // Official onboarding links are deliberately short-lived and single-use.
    const issued = await issueAuthActionToken(tx, { userId: user.id, purpose: AuthTokenPurpose.INVITATION, expiresInMs: 60 * 1000, createdById: actor.id });
    await enqueueOutbox(tx, {
      topic: 'auth.invitation.requested',
      payload: { userId: user.id, email: user.email, token: issued.token, expiresInMinutes: 1 },
      idempotencyKey: `invitation:${issued.record.id}`,
    });
    return { user, token: issued.token };
  });

  return res.status(201).json({ success: true, data: { invitation: { userId: result.user.id, email: result.user.email, role: result.user.role, expiresInMinutes: 1, deliveryStatus: 'QUEUED', ...(process.env.NODE_ENV !== 'production' ? { developmentToken: result.token } : {}) } } });
});

/** GET /api/v1/users/:id — scoped employee detail without secrets or tokens. */
router.get('/:id([0-9a-fA-F-]{36})', authenticateJWT, requirePermission(PERMISSIONS.PEOPLE_READ), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const actor = await prisma.user.findUnique({ where: { id: req.user!.id }, select: { id: true, role: true, cityId: true, zoneId: true, wardId: true, departmentId: true } });
    if (!actor) return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Official permissions required.' } });
    const target = await prisma.user.findFirst({
      where: { id: req.params.id, ...userScope(actor) },
      select: {
        id: true,
        email: true,
        phoneNumber: true,
        role: true,
        active: true,
        cityId: true,
        zoneId: true,
        wardId: true,
        departmentId: true,
        mfaEnabled: true,
        notificationInApp: true,
        notificationEmail: true,
        notificationSms: true,
        createdAt: true,
        updatedAt: true,
        city: { select: { id: true, name: true } },
        zone: { select: { id: true, name: true } },
        ward: { select: { id: true, name: true } },
      },
    });
    if (!target) return res.status(404).json({ success: false, error: { code: 'USER_NOT_FOUND', message: 'User not found in your assigned scope.' } });

    const [
      activeIncidentCount,
      resolvedIncidentCount,
      workOrderCount,
      completedWorkOrderCount,
      sessionCount,
      securityEventCount,
      recentSecurityEvents,
      department,
      assignedIncidents,
      workOrders,
      resolutionSubmissions,
      assignmentHistory,
      slaBreachedCount,
    ] = await Promise.all([
      prisma.incident.count({ where: { assignedTo: target.id, status: { notIn: ['RESOLVED', 'REJECTED'] } } }),
      prisma.incident.count({ where: { OR: [{ assignedTo: target.id }, { workerRef: target.id }], status: 'RESOLVED' } }),
      prisma.workOrder.count({ where: { workerId: target.id } }),
      prisma.workOrder.count({ where: { workerId: target.id, status: 'COMPLETED' } }),
      prisma.userSession.count({ where: { userId: target.id } }),
      prisma.securityEvent.count({ where: { userId: target.id } }),
      prisma.securityEvent.findMany({
        where: { userId: target.id },
        orderBy: { createdAt: 'desc' },
        take: 15,
        select: { id: true, type: true, success: true, ipAddress: true, userAgent: true, metadata: true, createdAt: true },
      }),
      target.departmentId
        ? prisma.department.findUnique({
            where: { id: target.departmentId },
            select: { id: true, name: true, handledCategories: true, defaultSlaHours: true, warningThresholdHours: true },
          })
        : null,
      prisma.incident.findMany({
        where: { assignedTo: target.id },
        orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
        take: 20,
        select: {
          id: true,
          publicTrackingId: true,
          category: true,
          status: true,
          priority: true,
          priorityScore: true,
          slaDeadline: true,
          slaBreached: true,
          assignedAt: true,
          startedAt: true,
          completedAt: true,
          createdAt: true,
          resolvedAt: true,
          resolvedNotes: true,
          ward: { select: { id: true, name: true } },
          reports: {
            take: 1,
            select: { id: true, title: true, landmark: true, photoUrl: true, severity: true },
          },
        },
      }),
      prisma.workOrder.findMany({
        where: { workerId: target.id },
        orderBy: { createdAt: 'desc' },
        take: 20,
        select: {
          id: true,
          incidentId: true,
          status: true,
          assignedAt: true,
          startedAt: true,
          completedAt: true,
          createdAt: true,
          incident: {
            select: {
              id: true,
              publicTrackingId: true,
              category: true,
              status: true,
              priority: true,
              slaBreached: true,
            },
          },
        },
      }),
      prisma.resolutionSubmission.findMany({
        where: { workerId: target.id },
        orderBy: { submittedAt: 'desc' },
        take: 20,
        select: {
          id: true,
          incidentId: true,
          evidencePath: true,
          evidenceOriginalPath: true,
          notes: true,
          submittedAt: true,
          verificationStatus: true,
          verificationResult: true,
          verifiedAt: true,
          incident: {
            select: {
              id: true,
              publicTrackingId: true,
              category: true,
              status: true,
            },
          },
        },
      }),
      prisma.assignmentHistory.findMany({
        where: { workerId: target.id },
        orderBy: { createdAt: 'desc' },
        take: 20,
        select: {
          id: true,
          incidentId: true,
          action: true,
          reason: true,
          createdAt: true,
          incident: {
            select: {
              id: true,
              publicTrackingId: true,
              category: true,
              status: true,
            },
          },
        },
      }),
      prisma.incident.count({
        where: {
          OR: [{ assignedTo: target.id }, { workerRef: target.id }],
          slaBreached: true,
        },
      }),
    ]);

    const totalHandled = activeIncidentCount + resolvedIncidentCount;
    const slaComplianceRate = totalHandled > 0
      ? Math.max(0, Math.round(((totalHandled - slaBreachedCount) / totalHandled) * 100))
      : 100;

    return res.json({
      success: true,
      data: {
        employee: {
          ...target,
          department,
          activeIncidentCount,
          resolvedIncidentCount,
          workOrderCount,
          completedWorkOrderCount,
          sessionCount,
          securityEventCount,
          recentSecurityEvents,
          assignedIncidents,
          workOrders,
          resolutionSubmissions,
          assignmentHistory,
          performance: {
            slaComplianceRate,
            slaBreachedCount,
            totalWorkOrders: workOrderCount,
            completedWorkOrders: completedWorkOrderCount,
            totalAssigned: totalHandled,
          },
        },
      },
    });
  } catch (error) {
    console.error('Failed to load scoped employee detail:', error);
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Unable to load employee details.' } });
  }
});

router.patch('/:id/status', authenticateJWT, requirePermission(PERMISSIONS.PEOPLE_STATUS), async (req: AuthenticatedRequest, res: Response) => {
  const parsed = z.object({ active: z.boolean(), reason: z.string().trim().min(3).max(500) }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Active state and a reason are required.' } });
  if (req.params.id === req.user!.id) return res.status(409).json({ success: false, error: { code: 'SELF_STATUS_CHANGE', message: 'You cannot change your own account status.' } });

  const [actor, target] = await Promise.all([
    prisma.user.findUnique({ where: { id: req.user!.id }, select: { id: true, role: true, cityId: true, zoneId: true, wardId: true, departmentId: true } }),
    prisma.user.findUnique({ where: { id: req.params.id }, select: { id: true, role: true, cityId: true, zoneId: true, wardId: true, departmentId: true, active: true } }),
  ]);
  if (!actor || !target) return res.status(404).json({ success: false, error: { code: 'USER_NOT_FOUND', message: 'User not found.' } });
  if (roleRank[target.role] >= roleRank[actor.role]) return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'You cannot manage a user at or above your role.' } });
  const scopedTarget = await prisma.user.findFirst({ where: { id: target.id, ...userScope(actor) }, select: { id: true } });
  if (!scopedTarget) return res.status(403).json({ success: false, error: { code: 'SCOPE_DENIED', message: 'The user is outside your assigned scope.' } });

  const updated = await prisma.$transaction(async (tx) => {
    const user = await tx.user.update({ where: { id: target.id }, data: { active: parsed.data.active }, select: { id: true, email: true, role: true, active: true } });
    if (!parsed.data.active) {
      await tx.userSession.updateMany({ where: { userId: target.id, revokedAt: null }, data: { revokedAt: new Date() } });
      await revokeOpenAuthActionTokens(tx, target.id);
    }
    await enqueueOutbox(tx, { topic: parsed.data.active ? 'user.activated' : 'user.suspended', payload: { userId: target.id, actorId: actor.id, reason: parsed.data.reason }, idempotencyKey: `user-status:${target.id}:${Date.now()}` });
    return user;
  });
  if (!parsed.data.active) {
    void recordSecurityEvent(prisma, { type: 'ACCOUNT_SUSPENDED', userId: target.id, success: true, req, metadata: { actorId: actor.id, reason: parsed.data.reason } }).catch(() => undefined);
  }
  return res.json({ success: true, data: { user: updated } });
});

/** GET /api/v1/users/directory — scoped, paginated people directory. */
router.get('/directory', authenticateJWT, requirePermission(PERMISSIONS.PEOPLE_READ), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const actor = await prisma.user.findUnique({ where: { id: req.user!.id }, select: { id: true, role: true, cityId: true, zoneId: true, wardId: true, departmentId: true } });
    if (!actor) return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Official permissions required.' } });
    const where: Prisma.UserWhereInput = { ...userScope(actor) };
    const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';
    const role = typeof req.query.role === 'string' ? req.query.role : '';
    if (search) where.OR = [{ email: { contains: search, mode: 'insensitive' } }, { phoneNumber: { contains: search, mode: 'insensitive' } }];
    if (role && Object.values(UserRole).includes(role as UserRole)) where.role = role as UserRole;
    else if (role) return res.status(400).json({ success: false, error: { code: 'INVALID_FILTER', message: 'Invalid role filter.' } });
    const requestedLimit = Number(req.query.limit); const limit = Number.isFinite(requestedLimit) ? Math.min(Math.max(Math.trunc(requestedLimit), 1), 100) : 25;
    const cursor = typeof req.query.cursor === 'string' && req.query.cursor ? req.query.cursor : undefined;
    const users = await prisma.user.findMany({ where, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], take: limit + 1, ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}), select: { id: true, email: true, phoneNumber: true, role: true, active: true, cityId: true, zoneId: true, wardId: true, departmentId: true, createdAt: true, _count: { select: { assignedIncidents: true } } } });
    const hasMore = users.length > limit; const page = users.slice(0, limit);
    return res.json({ success: true, data: { users: page.map(({ _count, ...user }) => ({ ...user, activeIncidentCount: _count.assignedIncidents })), pagination: { limit, hasMore, nextCursor: hasMore ? page[page.length - 1]?.id ?? null : null } } });
  } catch (error) {
    console.error('Failed to query scoped user directory:', error);
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Unable to load the people directory.' } });
  }
});

/**
 * GET /api/v1/users/workers
 * Retrieves active field workers. Optionally filters by ward and department.
 * Restricted to official roles.
 */
router.get('/workers', authenticateJWT, requireRole([
  UserRole.WARD_OFFICER,
  UserRole.DEPARTMENT_HEAD,
  UserRole.ZONAL_OFFICER,
  UserRole.CITY_ADMIN,
  UserRole.COMMISSIONER,
  UserRole.SUPER_ADMIN
]), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { wardId, departmentId, search } = req.query;
    const where: any = {
      role: UserRole.FIELD_WORKER,
      active: true,
    };

    if (wardId && typeof wardId === 'string' && wardId !== 'ALL' && wardId !== 'all') {
      where.wardId = wardId;
    }
    if (departmentId && typeof departmentId === 'string' && departmentId !== 'ALL' && departmentId !== 'all') {
      where.departmentId = departmentId;
    }
    if (search && typeof search === 'string' && search.trim()) {
      where.OR = [
        { email: { contains: search.trim(), mode: 'insensitive' } },
        { phoneNumber: { contains: search.trim(), mode: 'insensitive' } },
      ];
    }

    const workers = await prisma.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        phoneNumber: true,
        role: true,
        wardId: true,
        ward: {
          select: {
            id: true,
            name: true,
          },
        },
        departmentId: true,
      },
      orderBy: { email: 'asc' },
    });

    return res.json({
      success: true,
      data: { workers },
    });
  } catch (error: any) {
    console.error('Failed to query field workers:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: error.message || 'An unexpected error occurred while fetching field workers.',
      },
    });
  }
});

export default router;
