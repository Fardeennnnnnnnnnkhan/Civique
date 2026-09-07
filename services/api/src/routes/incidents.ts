import { Router, Request, Response } from 'express';
import { prisma } from '../db';
import { IncidentStatus, PriorityLevel, UserRole, Prisma } from '@prisma/client';
import jwt from 'jsonwebtoken';
import { AuthenticatedRequest, authenticateJWT, requireRole } from '../middleware/auth';
import { logIncidentChange } from '../utils/audit';
import { broadcastIncident } from '../utils/socket';
import { upload, validateImageBuffer } from '../middleware/upload';
import { supabase } from '../utils/supabase';
import { transitionIncident } from '../services/incidentTransitions';
import { PUBLIC_STATUSES, toPublicIncidentSummary } from '../utils/publicIncident';
import { incidentScope, scopeLabel } from '../utils/scope';
import { recordRoutingDecision } from '../services/routing';

const router = Router();

router.get('/work-orders', authenticateJWT, requireRole([UserRole.FIELD_WORKER]), async (req: AuthenticatedRequest, res: Response) => {
  const orders = await (prisma as any).workOrder.findMany({ where: { workerId: req.user!.id, status: { in: ['ASSIGNED', 'IN_PROGRESS', 'RESOLUTION_SUBMITTED'] } }, include: { incident: { select: { id: true, publicTrackingId: true, category: true, status: true, priority: true, latitude: true, longitude: true, ward: { select: { id: true, name: true } }, slaDeadline: true } } }, orderBy: { assignedAt: 'asc' } });
  res.json({ success: true, workOrders: orders });
});

/**
 * GET /api/v1/incidents
 * Fetches all incidents with optional filters: status, category, and bbox (bounding box).
 * Bounding box format: bbox=minLng,minLat,maxLng,maxLat
 */
router.get('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { status, category, bbox } = req.query;
    const where: any = {};

    // 1. Try to extract and verify JWT to apply role-based filtering
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const secret = process.env.JWT_ACCESS_SECRET;
      if (secret) try {
        const decoded = jwt.verify(token, secret) as { id: string; email: string | null; role: UserRole };
        req.user = decoded;
      } catch (err) {}
    }

    const isOfficial = Boolean(req.user && req.user.role !== UserRole.CITIZEN);
    if (!isOfficial) where.isPublic = true;

    // 2. Apply Role-Scoped Geographic or Departmental Filtering for Officials
    if (req.user && req.user.role !== UserRole.CITIZEN) {
      const dbUser = await prisma.user.findUnique({
        where: { id: req.user.id },
      });

      if (dbUser) {
        if (dbUser.role === UserRole.FIELD_WORKER) {
          where.assignedTo = dbUser.id;
        } else if (dbUser.role === UserRole.WARD_OFFICER) {
          if (dbUser.wardId) {
            where.wardId = dbUser.wardId;
          }
        } else if (dbUser.role === UserRole.ZONAL_OFFICER) {
          if (dbUser.zoneId) {
            where.zoneId = dbUser.zoneId;
          }
        } else if (dbUser.role === UserRole.DEPARTMENT_HEAD) {
          if (dbUser.departmentId) {
            where.departmentId = dbUser.departmentId;
          }
        } else if (dbUser.role === UserRole.CITY_ADMIN || dbUser.role === UserRole.COMMISSIONER) {
          if (dbUser.cityId) {
            where.cityId = dbUser.cityId;
          }
        }
      }
    }

    if (status) {
      if (typeof status === 'string' && Object.values(IncidentStatus).includes(status as IncidentStatus)) {
        where.status = status as IncidentStatus;
      } else {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_FILTER',
            message: `Invalid status filter. Must be one of: ${Object.values(IncidentStatus).join(', ')}`,
          },
        });
      }
    }

    if (category) {
      where.category = category as string;
    }

    if (bbox && typeof bbox === 'string') {
      const coords = bbox.split(',').map(Number);
      if (coords.length === 4 && coords.every((c) => !isNaN(c))) {
        const [minLng, minLat, maxLng, maxLat] = coords;
        if (minLng < -180 || maxLng > 180 || minLat < -90 || maxLat > 90 || minLng >= maxLng || minLat >= maxLat || (maxLng - minLng) > 20 || (maxLat - minLat) > 20) return res.status(400).json({ success: false, error: { code: 'BBOX_TOO_LARGE', message: 'Map viewport is invalid or too large.' } });
        where.longitude = { gte: minLng, lte: maxLng };
        where.latitude = { gte: minLat, lte: maxLat };
      } else {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_BBOX',
            message: 'Bounding box (bbox) must be format minLng,minLat,maxLng,maxLat numbers.',
          },
        });
      }
    }

    if (!status && !isOfficial) where.status = { in: PUBLIC_STATUSES };
    const limit = Math.min(Math.max(Number(req.query.limit) || 50, 1), 100);
    const incidents = await prisma.incident.findMany({
      where,
      select: { id: true, publicTrackingId: true, category: true, status: true, priority: true, priorityScore: true, latitude: true, longitude: true, ward: { select: { id: true, name: true } }, reportCount: true, createdAt: true },
      orderBy: {
        createdAt: 'desc',
      },
      take: limit + 1,
    });
    const hasMore = incidents.length > limit;
    const page = incidents.slice(0, limit);

    return res.json({
      success: true,
      incidents: page.map(toPublicIncidentSummary),
      pagination: { limit, hasMore, nextCursor: hasMore ? page[page.length - 1]?.id : null },
    });
  } catch (error: any) {
    console.error('Failed to query incidents:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: error.message || 'An unexpected error occurred while fetching incidents.',
      },
    });
  }
});

/**
 * GET /api/v1/incidents/admin-metrics
 * Fetches dashboard statistics (Open Incidents, Resolved Today, SLA Breach Ratio, etc.) scoped by user role.
 */
router.get('/admin-metrics', authenticateJWT, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user!;
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { id: true, role: true, cityId: true, zoneId: true, wardId: true, departmentId: true },
    });

    if (!dbUser || dbUser.role === UserRole.CITIZEN) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Access denied. Official permissions required.',
        },
      });
    }

    const where = incidentScope(dbUser);

    const openCount = await prisma.incident.count({
      where: {
        ...where,
        status: {
          notIn: ['RESOLVED', 'REJECTED'],
        },
      },
    });

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const resolvedTodayCount = await prisma.incident.count({
      where: {
        ...where,
        status: 'RESOLVED',
        resolvedAt: {
          gte: startOfToday,
        },
      },
    });

    const activeTicketsCount = await prisma.incident.count({
      where: {
        ...where,
        status: {
          notIn: ['RESOLVED', 'REJECTED'],
        },
      },
    });

    const breachedTicketsCount = await prisma.incident.count({
      where: {
        ...where,
        status: {
          notIn: ['RESOLVED', 'REJECTED'],
        },
        OR: [
          { slaBreached: true },
          {
            slaDeadline: {
              lt: new Date(),
            },
          },
        ],
      },
    });

    let slaCompliance = 100;
    if (activeTicketsCount > 0) {
      const compliantCount = activeTicketsCount - breachedTicketsCount;
      slaCompliance = Math.round((compliantCount / activeTicketsCount) * 100);
    }

    const recentIncidents = await prisma.incident.findMany({
      where,
      orderBy: {
        createdAt: 'desc',
      },
      take: 5,
      select: { id: true, publicTrackingId: true, category: true, status: true, priority: true, createdAt: true },
    });

    const recentActivities = recentIncidents.map((inc) => {
      let timeDesc = 'Recently';
      const diffMs = Date.now() - new Date(inc.createdAt).getTime();
      const diffMins = Math.round(diffMs / 60000);
      if (diffMins < 60) {
        timeDesc = `${diffMins} mins ago`;
      } else {
        const diffHrs = Math.round(diffMins / 60);
        if (diffHrs < 24) {
          timeDesc = `${diffHrs} hours ago`;
        } else {
          timeDesc = new Date(inc.createdAt).toLocaleDateString();
        }
      }

      let desc = `Incident ${inc.publicTrackingId} created in ward.`;
      if (inc.status === 'RESOLVED') {
        desc = `Incident ${inc.publicTrackingId} marked resolved.`;
      } else if (inc.status === 'ASSIGNED') {
        desc = `Incident ${inc.publicTrackingId} assigned to field crew.`;
      } else if (inc.status === 'IN_PROGRESS') {
        desc = `Incident ${inc.publicTrackingId} repair works active.`;
      }

      return {
        time: timeDesc,
        title: `${inc.category} Incident`,
        desc,
        type: inc.status === 'RESOLVED' ? 'resolved' : inc.priority === 'HIGH' || inc.priority === 'CRITICAL' ? 'critical' : 'reported',
      };
    });

    return res.json({
      success: true,
      data: {
        metrics: {
          openCount,
          resolvedCount: resolvedTodayCount,
          slaCompliance,
        },
        scope: scopeLabel(dbUser),
        recentActivities,
      },
    });
  } catch (error: any) {
    console.error('Failed to retrieve admin dashboard metrics:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: error.message || 'An unexpected error occurred while loading dashboard metrics.',
      },
    });
  }
});

/**
 * GET /api/v1/incidents/admin-queue
 * Scope-correct operational queue. This is intentionally separate from the
 * privacy-safe public map endpoint above.
 */
router.get('/admin-queue', authenticateJWT, requireRole([
  UserRole.FIELD_WORKER, UserRole.WARD_OFFICER, UserRole.DEPARTMENT_HEAD,
  UserRole.ZONAL_OFFICER, UserRole.COMMISSIONER, UserRole.CITY_ADMIN, UserRole.SUPER_ADMIN,
]), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const dbUser = await prisma.user.findUnique({ where: { id: req.user!.id }, select: { id: true, role: true, cityId: true, zoneId: true, wardId: true, departmentId: true } });
    if (!dbUser) return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Official permissions required.' } });
    const where: Prisma.IncidentWhereInput = incidentScope(dbUser);
    const status = typeof req.query.status === 'string' ? req.query.status : undefined;
    const category = typeof req.query.category === 'string' ? req.query.category.trim() : undefined;
    const search = typeof req.query.search === 'string' ? req.query.search.trim() : undefined;
    if (status) {
      if (!Object.values(IncidentStatus).includes(status as IncidentStatus)) return res.status(400).json({ success: false, error: { code: 'INVALID_FILTER', message: 'Invalid status filter.' } });
      where.status = status as IncidentStatus;
    }
    if (category) where.category = category;
    if (search) where.OR = [{ publicTrackingId: { contains: search, mode: 'insensitive' } }, { category: { contains: search, mode: 'insensitive' } }];
    const requestedLimit = Number(req.query.limit);
    const limit = Number.isFinite(requestedLimit) ? Math.min(Math.max(Math.trunc(requestedLimit), 1), 100) : 25;
    const cursor = typeof req.query.cursor === 'string' && req.query.cursor.length > 0 ? req.query.cursor : undefined;
    const incidents = await prisma.incident.findMany({ where, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], take: limit + 1, ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}), select: { id: true, publicTrackingId: true, category: true, status: true, priority: true, priorityScore: true, latitude: true, longitude: true, reportCount: true, slaDeadline: true, slaBreached: true, createdAt: true, ward: { select: { id: true, name: true } }, departmentId: true, assignedTo: true } });
    const hasMore = incidents.length > limit;
    const page = incidents.slice(0, limit);
    return res.json({ success: true, data: { incidents: page, pagination: { limit, hasMore, nextCursor: hasMore ? page[page.length - 1]?.id ?? null : null }, scope: scopeLabel(dbUser) } });
  } catch (error) {
    console.error('Failed to query admin incident queue:', error);
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Unable to load the operational queue.' } });
  }
});

/**
 * GET /api/v1/incidents/:id
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // If an official is authenticated, enforce object-level scope before
    // returning the operational detail payload. Anonymous/public map reads
    // retain their existing behavior and redaction is handled by M6 DTO work.
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ') && process.env.JWT_ACCESS_SECRET) {
      try {
        const decoded = jwt.verify(authHeader.slice(7), process.env.JWT_ACCESS_SECRET) as { id: string };
        const scopedUser = await prisma.user.findUnique({ where: { id: decoded.id }, select: { id: true, role: true, cityId: true, zoneId: true, wardId: true, departmentId: true, active: true } });
        if (scopedUser?.active && scopedUser.role !== UserRole.CITIZEN) {
          const inScope = await prisma.incident.findFirst({ where: { id, ...incidentScope(scopedUser) }, select: { id: true } });
          if (!inScope) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Incident not found.' } });
        }
      } catch {
        // Invalid optional tokens are treated as anonymous public reads.
      }
    }

    const incident = await prisma.incident.findUnique({
      where: { id },
      include: {
        ward: true,
        reports: {
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
    });

    if (!incident) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: `Incident with ID ${id} was not found.`,
        },
      });
    }

    return res.json({
      success: true,
      incident,
    });
  } catch (error: any) {
    console.error('Failed to query incident details:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: error.message || 'An unexpected error occurred while fetching incident details.',
      },
    });
  }
});

/**
 * PATCH /api/v1/incidents/:id/status
 * Updates the status of an incident.
 */
router.patch('/:id/status', authenticateJWT, requireRole([
  UserRole.WARD_OFFICER, UserRole.DEPARTMENT_HEAD, UserRole.ZONAL_OFFICER, UserRole.COMMISSIONER, UserRole.CITY_ADMIN, UserRole.SUPER_ADMIN, UserRole.FIELD_WORKER
]), async (req: AuthenticatedRequest, res: Response) => {
  const { status } = req.body;
  if (!status || !Object.values(IncidentStatus).includes(status as IncidentStatus)) return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid incident status' } });
  try {
    const result = await prisma.$transaction((tx) => transitionIncident(tx, { incidentId: req.params.id, to: status as IncidentStatus, actorId: req.user!.id, actorRole: req.user!.role, actorLabel: req.user!.email || req.user!.id }));
    try { broadcastIncident('incident:updated', result); } catch { /* realtime delivery is best effort */ }
    return res.json({ success: true, incident: result });
  } catch (error: any) {
    const code = error.code === 'NOT_FOUND' ? 404 : error.code === 'FORBIDDEN' ? 403 : error.code === 'INVALID_STATE_TRANSITION' ? 409 : 500;
    return res.status(code).json({ success: false, error: { code: error.code || 'SERVER_ERROR', message: error.message || 'Unable to transition incident' } });
  }
});

// Legacy implementation retained only for migration reference; all clients use /status above.
router.patch('/:id/legacy-status', authenticateJWT, requireRole([
  UserRole.WARD_OFFICER,
  UserRole.DEPARTMENT_HEAD,
  UserRole.ZONAL_OFFICER,
  UserRole.CITY_ADMIN,
  UserRole.COMMISSIONER,
  UserRole.SUPER_ADMIN,
  UserRole.FIELD_WORKER
]), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const actor = req.user!;

    if (!status || !Object.values(IncidentStatus).includes(status as IncidentStatus)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: `Invalid status value. Must be one of: ${Object.values(IncidentStatus).join(', ')}`,
        },
      });
    }

    const incident = await prisma.incident.findUnique({
      where: { id },
    });

    if (!incident) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Incident not found.',
        },
      });
    }

    // Transition validation rules (Rule 18: Incident State Machine)
    const terminalStates: IncidentStatus[] = ['RESOLVED', 'REJECTED', 'DUPLICATE'];
    if (terminalStates.includes(incident.status) && status !== incident.status) {
      if (incident.status === 'RESOLVED' && status === 'REOPENED') {
        // Reopening is permitted
      } else {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_STATE_CHANGE',
            message: 'Cannot update status on a terminal incident state.',
          },
        });
      }
    }

    if (actor.role === UserRole.FIELD_WORKER) {
      const allowedWorkerStates: IncidentStatus[] = ['IN_PROGRESS', 'RESOLUTION_SUBMITTED'];
      if (!allowedWorkerStates.includes(status as IncidentStatus)) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Field workers can only transition to IN_PROGRESS or RESOLUTION_SUBMITTED.',
          },
        });
      }
    }

    const updateData: any = {
      status: status as IncidentStatus,
    };

    if (status === 'IN_PROGRESS' && !incident.startedAt) {
      updateData.startedAt = new Date();
    } else if (status === 'RESOLVED' && !incident.resolvedAt) {
      updateData.resolvedAt = new Date();
      updateData.completedAt = new Date();
    }

    const result = await prisma.$transaction(async (tx) => {
      const updatedIncident = await tx.incident.update({
        where: { id },
        data: updateData,
        include: {
          ward: true,
          reports: true,
        },
      });

      await logIncidentChange(
        tx,
        id,
        'INCIDENT_STATUS_CHANGED',
        actor.email || actor.id,
        {
          previousStatus: incident.status,
          newStatus: status,
        }
      );

      return updatedIncident;
    }, {
      timeout: 15000
    });

    try {
      broadcastIncident('incident:updated', result);
    } catch (wsErr) {
      console.error('Socket broadcast failed on status change:', wsErr);
    }

    return res.json({
      success: true,
      incident: result,
    });
  } catch (error: any) {
    console.error('Failed to update incident status:', error);

    return res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: error.message || 'An unexpected error occurred while updating status.',
      },
    });
  }
});

/**
 * POST /api/v1/incidents/:id/assign
 * Assigns an incident to a department and/or a specific field worker.
 */
router.post('/:id/assign', authenticateJWT, requireRole([
  UserRole.WARD_OFFICER,
  UserRole.DEPARTMENT_HEAD,
  UserRole.ZONAL_OFFICER,
  UserRole.CITY_ADMIN,
  UserRole.COMMISSIONER,
  UserRole.SUPER_ADMIN
]), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { departmentId, assignedTo } = req.body;
    const actor = req.user!;

    // 1. Read incident and check state
    const incident = await prisma.incident.findUnique({
      where: { id },
    });

    if (!incident) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Incident not found.',
        },
      });
    }

    const invalidStates: IncidentStatus[] = ['RESOLVED', 'REJECTED', 'DUPLICATE'];
    if (invalidStates.includes(incident.status)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_STATE',
          message: 'Cannot assign an incident that is resolved, rejected, or marked as duplicate.',
        },
      });
    }

    const updateData: any = {
      assignedBy: actor.id,
      assignedAt: new Date(),
      status: IncidentStatus.ASSIGNED,
    };

    const auditMetadata: any = {};

    // 2. Validate department outside transaction
    if (departmentId !== undefined) {
      if (departmentId === null) {
        updateData.departmentId = null;
        auditMetadata.departmentId = null;
      } else {
        const dept = await prisma.department.findUnique({
          where: { id: departmentId },
        });
        if (!dept) {
          return res.status(400).json({
            success: false,
            error: {
              code: 'DEPARTMENT_NOT_FOUND',
              message: 'The specified department does not exist.',
            },
          });
        }
        if (incident.cityId && dept.cityId && dept.cityId !== incident.cityId) return res.status(403).json({ success: false, error: { code: 'OUT_OF_SCOPE', message: 'Department is outside the incident city.' } });
        updateData.departmentId = departmentId;
        auditMetadata.departmentId = departmentId;
        auditMetadata.departmentName = dept.name;
      }
    }

    // 3. Validate worker outside transaction
    if (assignedTo !== undefined) {
      if (assignedTo === null) {
        updateData.assignedTo = null;
        updateData.workerRef = null;
        auditMetadata.assignedTo = null;
      } else {
        const worker = await prisma.user.findUnique({
          where: { id: assignedTo },
        });
        if (!worker || worker.role !== UserRole.FIELD_WORKER || !worker.active) {
          return res.status(400).json({
            success: false,
            error: {
              code: 'FIELD_WORKER_NOT_FOUND',
              message: 'The assigned user is not a valid field worker.',
            },
          });
        }
        if (incident.cityId && worker.cityId !== incident.cityId) return res.status(403).json({ success: false, error: { code: 'OUT_OF_SCOPE', message: 'Worker is outside the incident city.' } });
        if (incident.wardId && worker.wardId !== incident.wardId) return res.status(403).json({ success: false, error: { code: 'OUT_OF_SCOPE', message: 'Worker is outside the incident ward.' } });
        if (departmentId && worker.departmentId !== departmentId) return res.status(403).json({ success: false, error: { code: 'OUT_OF_SCOPE', message: 'Worker does not belong to the selected department.' } });
        updateData.assignedTo = assignedTo;
        updateData.workerRef = assignedTo;
        auditMetadata.assignedTo = assignedTo;
        auditMetadata.workerEmail = worker.email;
      }
    }

    // 4. Run database updates in transaction
    const result = await prisma.$transaction(async (tx) => {
      const updatedIncident = await tx.incident.update({
        where: { id },
        data: updateData,
        include: {
          ward: true,
          reports: true,
        },
      });

      await logIncidentChange(
        tx,
        id,
        'INCIDENT_ASSIGNED',
        actor.email || actor.id,
        {
          previousStatus: incident.status,
          newStatus: IncidentStatus.ASSIGNED,
          ...auditMetadata,
        }
      );
      await (tx as any).assignmentHistory.create({ data: { incidentId: id, workerId: assignedTo ?? incident.assignedTo, departmentId: departmentId !== undefined ? departmentId : incident.departmentId, action: 'ASSIGNMENT_UPDATED', reason: 'Manual department/worker assignment' } });
      if (assignedTo) {
        await (tx as any).workOrder.upsert({ where: { incidentId: id }, update: { workerId: assignedTo, status: 'ASSIGNED', assignedAt: new Date(), startedAt: null, completedAt: null }, create: { incidentId: id, workerId: assignedTo, status: 'ASSIGNED' } });
      }
      if (departmentId !== undefined && departmentId !== incident.departmentId) {
        await recordRoutingDecision(tx, { incidentId: id, category: updatedIncident.category, cityId: updatedIncident.cityId, wardId: updatedIncident.wardId, previousDepartmentId: incident.departmentId });
      }

      return updatedIncident;
    }, {
      timeout: 15000
    });

    try {
      broadcastIncident('incident:updated', result);
    } catch (wsErr) {
      console.error('Socket broadcast failed on assignment:', wsErr);
    }

    // Notify field worker and department head of assignment
    try {
      const { createNotification, notifyUsers } = require('../utils/notifications');
      
      // A. Notify assigned worker
      if (assignedTo) {
        createNotification(
          assignedTo,
          'Task Assignment',
          `You have been assigned to Incident #${incident.publicTrackingId} (${incident.category}).`,
          'INCIDENT_ASSIGNED',
          id
        ).catch((err: any) => console.error('Failed to notify assigned worker:', err));
      }

      // B. Notify department heads
      if (departmentId) {
        prisma.user.findMany({
          where: {
            role: UserRole.DEPARTMENT_HEAD,
            departmentId: departmentId,
            active: true
          }
        }).then(heads => {
          const headIds = heads.map(h => h.id);
          if (headIds.length > 0) {
            notifyUsers(
              headIds,
              `Incident Assigned to Department`,
              `Incident #${incident.publicTrackingId} (${incident.category}) has been routed to your department.`,
              'INCIDENT_ROUTED',
              id
            ).catch((err: any) => console.error('Failed to notify department heads:', err));
          }
        }).catch((err: any) => console.error('Failed to query department heads for notifications:', err));
      }
    } catch (notifErr) {
      console.error('Notification dispatch failure:', notifErr);
    }

    return res.json({
      success: true,
      incident: result,
    });
  } catch (error: any) {
    console.error('Failed to assign incident:', error);

    return res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: error.message || 'An unexpected error occurred while assigning incident.',
      },
    });
  }
});

/**
 * POST /api/v1/incidents/:id/start
 * Marks an incident as IN_PROGRESS.
 */
router.post('/:id/start', authenticateJWT, requireRole([
  UserRole.FIELD_WORKER,
  UserRole.WARD_OFFICER,
  UserRole.DEPARTMENT_HEAD,
  UserRole.ZONAL_OFFICER,
  UserRole.CITY_ADMIN,
  UserRole.COMMISSIONER,
  UserRole.SUPER_ADMIN
]), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const actor = req.user!;

    const result = await prisma.$transaction(async (tx) => {
      const incident = await tx.incident.findUnique({
        where: { id },
      });

      if (!incident) {
        throw new Error('INCIDENT_NOT_FOUND');
      }

      // Check status: must be ASSIGNED to start work
      if (incident.status !== IncidentStatus.ASSIGNED) {
        throw new Error('INVALID_STATUS_TRANSITION');
      }

      // Field workers can only start incidents assigned to them
      if (actor.role === UserRole.FIELD_WORKER && incident.assignedTo !== actor.id) {
        throw new Error('UNAUTHORIZED_ASSIGNMENT_OPERATION');
      }
      const workOrder = await (tx as any).workOrder.findUnique({ where: { incidentId: id } });
      if (!workOrder || workOrder.status !== 'ASSIGNED' || workOrder.workerId !== incident.assignedTo) throw new Error('STALE_ASSIGNMENT');

      const updatedIncident = await tx.incident.update({
        where: { id },
        data: {
          status: IncidentStatus.IN_PROGRESS,
          startedAt: new Date(),
        },
        include: {
          ward: true,
          reports: true,
        },
      });
      await (tx as any).workOrder.update({ where: { incidentId: id }, data: { status: 'IN_PROGRESS', startedAt: new Date() } });

      await logIncidentChange(
        tx,
        id,
        'INCIDENT_STARTED',
        actor.email || actor.id,
        {
          previousStatus: incident.status,
          newStatus: IncidentStatus.IN_PROGRESS,
        }
      );

      return updatedIncident;
    });

    try {
      broadcastIncident('incident:updated', result);
    } catch (wsErr) {
      console.error('Socket broadcast failed on start work:', wsErr);
    }

    // Notify Ward Officers that repair work has started
    if (result.wardId) {
      prisma.user.findMany({
        where: {
          role: UserRole.WARD_OFFICER,
          wardId: result.wardId,
          active: true
        }
      }).then(officers => {
        const officerIds = officers.map(o => o.id);
        if (officerIds.length > 0) {
          const { notifyUsers } = require('../utils/notifications');
          notifyUsers(
            officerIds,
            `Repair Started on #${result.publicTrackingId}`,
            `Field worker has started repair work on Incident #${result.publicTrackingId} (${result.category}).`,
            'INCIDENT_STARTED',
            id
          ).catch((err: any) => console.error('Failed to notify ward officers on start work:', err));
        }
      }).catch((err: any) => console.error('Failed to query ward officers on start work notifications:', err));
    }

    return res.json({
      success: true,
      incident: result,
    });
  } catch (error: any) {
    console.error('Failed to start incident repair:', error);

    let status = 500;
    let code = 'SERVER_ERROR';
    let message = error.message || 'An unexpected error occurred while starting incident repair.';

    if (error.message === 'INCIDENT_NOT_FOUND') {
      status = 404;
      code = 'NOT_FOUND';
      message = 'Incident not found.';
    } else if (error.message === 'INVALID_STATUS_TRANSITION') {
      status = 400;
      code = 'INVALID_STATUS';
      message = 'Incident is not in ASSIGNED status. Cannot start work.';
    } else if (error.message === 'UNAUTHORIZED_ASSIGNMENT_OPERATION') {
      status = 403;
      code = 'FORBIDDEN';
      message = 'You are not authorized to start work on this incident since it is not assigned to you.';
    } else if (error.message === 'STALE_ASSIGNMENT') {
      status = 409;
      code = 'STALE_ASSIGNMENT';
      message = 'This work order is no longer active. Refresh before starting work.';
    }

    return res.status(status).json({
      success: false,
      error: {
        code,
        message,
      },
    });
  }
});

/**
 * POST /api/v1/incidents/:id/resolve
 * Submits work order resolutions with after-photo proof.
 */
router.post('/:id/resolve', authenticateJWT, requireRole([
  UserRole.FIELD_WORKER,
  UserRole.WARD_OFFICER,
  UserRole.DEPARTMENT_HEAD,
  UserRole.CITY_ADMIN,
  UserRole.COMMISSIONER,
  UserRole.SUPER_ADMIN
]), upload.single('photo'), async (req: AuthenticatedRequest, res: Response) => {
  let uploadedPath = '';
  try {
    const { id } = req.params;
    const { resolvedNotes, captureAt, latitude: evidenceLat, longitude: evidenceLng } = req.body;
    const actor = req.user!;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'PHOTO_REQUIRED',
          message: 'An after-photo is required to submit a resolution.',
        },
      });
    }
    if (typeof resolvedNotes !== 'string' || resolvedNotes.trim().length < 5) return res.status(400).json({ success: false, error: { code: 'NOTES_REQUIRED', message: 'Describe the completed work in at least 5 characters.' } });
    const validatedEvidence = validateImageBuffer(req.file.buffer, req.file.mimetype);
    const capturedAt = captureAt ? new Date(String(captureAt)) : new Date();
    if (Number.isNaN(capturedAt.getTime()) || capturedAt.getTime() > Date.now() + 5 * 60 * 1000 || capturedAt.getTime() < Date.now() - 30 * 86400000) return res.status(400).json({ success: false, error: { code: 'INVALID_CAPTURE_TIME', message: 'Evidence capture time is outside the accepted window.' } });
    const parsedLat = evidenceLat === undefined || evidenceLat === '' ? null : Number(evidenceLat);
    const parsedLng = evidenceLng === undefined || evidenceLng === '' ? null : Number(evidenceLng);
    if ((parsedLat !== null && (!Number.isFinite(parsedLat) || parsedLat < -90 || parsedLat > 90)) || (parsedLng !== null && (!Number.isFinite(parsedLng) || parsedLng < -180 || parsedLng > 180))) return res.status(400).json({ success: false, error: { code: 'INVALID_EVIDENCE_GPS', message: 'Evidence GPS coordinates are invalid.' } });

    const incident = await prisma.incident.findUnique({
      where: { id },
    });

    if (!incident) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Incident not found.',
        },
      });
    }

    if (incident.status !== IncidentStatus.IN_PROGRESS) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_STATUS',
          message: 'Incident is not in IN_PROGRESS status. Cannot submit resolution.',
        },
      });
    }

    if (actor.role === UserRole.FIELD_WORKER && incident.assignedTo !== actor.id) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'You are not authorized to submit resolution for this incident since it is not assigned to you.',
        },
      });
    }
    const activeOrder = await (prisma as any).workOrder.findUnique({ where: { incidentId: id } });
    if (!activeOrder || activeOrder.status !== 'IN_PROGRESS' || activeOrder.workerId !== incident.assignedTo) return res.status(409).json({ success: false, error: { code: 'STALE_ASSIGNMENT', message: 'No active work order exists for this resolution.' } });
    if (parsedLat !== null && parsedLng !== null && (Math.abs(parsedLat - incident.latitude) > 0.05 || Math.abs(parsedLng - incident.longitude) > 0.05)) return res.status(400).json({ success: false, error: { code: 'GPS_OUT_OF_TOLERANCE', message: 'Evidence location is too far from the incident.' } });

    const fileExt = validatedEvidence.mimeType.split('/')[1] || 'jpg';
    uploadedPath = `resolutions/${id}/${Date.now()}_${Math.random().toString(36).substring(2, 11)}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('report-images')
      .upload(uploadedPath, req.file.buffer, {
        contentType: req.file.mimetype,
        upsert: true,
      });

    if (uploadError) {
      throw new Error(`Supabase Storage resolution upload failed: ${uploadError.message}`);
    }

    const { data: urlData } = supabase.storage.from('report-images').getPublicUrl(uploadedPath);
    const photoUrl = urlData.publicUrl;

    const result = await prisma.$transaction(async (tx) => {
      const updatedIncident = await tx.incident.update({
        where: { id },
        data: {
          status: IncidentStatus.RESOLUTION_SUBMITTED,
          completedAt: new Date(),
          resolvedNotes: resolvedNotes || null,
          afterPhotoUrls: {
            push: photoUrl,
          },
        },
        include: {
          ward: true,
          reports: true,
        },
      });
      const duplicate = await (tx as any).resolutionSubmission.findFirst({ where: { incidentId: id, evidenceSha256: validatedEvidence.sha256 } });
      if (duplicate) throw new Error('DUPLICATE_EVIDENCE');
      await (tx as any).resolutionSubmission.create({ data: { incidentId: id, workerId: actor.id, evidencePath: uploadedPath, evidenceSha256: validatedEvidence.sha256, notes: resolvedNotes.trim(), captureAt: capturedAt, latitude: parsedLat, longitude: parsedLng } });
      await (tx as any).workOrder.update({ where: { incidentId: id }, data: { status: 'RESOLUTION_SUBMITTED', completedAt: new Date() } });

      await logIncidentChange(
        tx,
        id,
        'INCIDENT_RESOLVED_SUBMITTED',
        actor.email || actor.id,
        {
          previousStatus: incident.status,
          newStatus: IncidentStatus.RESOLUTION_SUBMITTED,
          photoUrl,
          resolvedNotes: resolvedNotes || '',
        }
      );

      return updatedIncident;
    });

    try {
      broadcastIncident('incident:updated', result);
    } catch (wsErr) {
      console.error('Socket broadcast failed on resolution:', wsErr);
    }

    // Notify Ward Officers and Department Heads that a resolution has been submitted
    try {
      const { notifyUsers } = require('../utils/notifications');
      
      // A. Notify Ward Officers
      if (result.wardId) {
        prisma.user.findMany({
          where: {
            role: UserRole.WARD_OFFICER,
            wardId: result.wardId,
            active: true
          }
        }).then(officers => {
          const officerIds = officers.map(o => o.id);
          if (officerIds.length > 0) {
            notifyUsers(
              officerIds,
              `Resolution Submitted for #${result.publicTrackingId}`,
              `Field worker has submitted a resolution for Incident #${result.publicTrackingId} (${result.category}).`,
              'RESOLUTION_SUBMITTED',
              id
            ).catch((err: any) => console.error('Failed to notify ward officers on resolution:', err));
          }
        }).catch((err: any) => console.error('Failed to query ward officers for resolution notifications:', err));
      }

      // B. Notify Department Heads
      if (result.departmentId) {
        prisma.user.findMany({
          where: {
            role: UserRole.DEPARTMENT_HEAD,
            departmentId: result.departmentId,
            active: true
          }
        }).then(heads => {
          const headIds = heads.map(h => h.id);
          if (headIds.length > 0) {
            notifyUsers(
              headIds,
              `Resolution Submitted - Department`,
              `Field worker has completed repairs on Incident #${result.publicTrackingId} (${result.category}). Awaiting verification.`,
              'RESOLUTION_SUBMITTED',
              id
            ).catch((err: any) => console.error('Failed to notify department heads on resolution:', err));
          }
        }).catch((err: any) => console.error('Failed to query department heads for resolution notifications:', err));
      }
    } catch (notifErr) {
      console.error('Notification dispatch failure on resolution:', notifErr);
    }

    return res.json({
      success: true,
      incident: result,
    });
  } catch (error: any) {
    console.error('Failed to resolve incident:', error);

    if (uploadedPath) {
      try {
        await supabase.storage.from('report-images').remove([uploadedPath]);
      } catch (cleanupErr) {
        console.error('Failed to cleanup resolution uploaded file:', cleanupErr);
      }
    }

    if (error.message === 'DUPLICATE_EVIDENCE') return res.status(409).json({ success: false, error: { code: 'DUPLICATE_EVIDENCE', message: 'This evidence has already been submitted.' } });
    if (error.message === 'INVALID_IMAGE_CONTENT') return res.status(400).json({ success: false, error: { code: 'INVALID_IMAGE_CONTENT', message: 'The uploaded evidence is not a valid supported image.' } });
    return res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: error.message || 'An unexpected error occurred while submitting resolution.',
      },
    });
  }
});

/**
 * POST /api/v1/incidents/sla-scan
 * Triggers a manual synchronous scan for SLA breaches.
 */
router.post('/sla-scan', authenticateJWT, requireRole([
  UserRole.CITY_ADMIN,
  UserRole.COMMISSIONER,
  UserRole.SUPER_ADMIN,
  UserRole.WARD_OFFICER,
  UserRole.DEPARTMENT_HEAD
]), async (req: Request, res: Response) => {
  try {
    const { runSlaScan } = require('../jobs/slaEscalation');
    const stats = await runSlaScan();
    return res.json({
      success: true,
      data: stats
    });
  } catch (error: any) {
    console.error('Failed to trigger manual SLA scan:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: error.message || 'An unexpected error occurred while executing SLA scan.'
      }
    });
  }
});

export default router;
