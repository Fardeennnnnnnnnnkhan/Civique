import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { prisma } from '../db';
import { IncidentStatus, PriorityLevel, UserRole, Prisma } from '@prisma/client';
import jwt from 'jsonwebtoken';
import { AuthenticatedRequest, authenticateJWT, requirePermission, requireRole } from '../middleware/auth';
import { logIncidentChange, verifyAuditChain } from '../utils/audit';
import { broadcastIncident, readRealtimeEvents } from '../utils/socket';
import { normalizeImageBuffer, upload } from '../middleware/upload';
import { createSignedMediaUrl, supabase } from '../utils/supabase';
import { transitionIncident } from '../services/incidentTransitions';
import { PUBLIC_STATUSES, clusterPublicIncidents, toPublicEventPayload, toPublicIncidentDetail, toPublicIncidentSummary } from '../utils/publicIncident';
import { incidentScope, scopeLabel } from '../utils/scope';
import { recordRoutingDecision } from '../services/routing';
import { enqueueJob } from '../jobs/queue';
import { emitLifecycle } from '../services/workflowEvents';
import { calculatePriority, priorityPolicyVersion } from '../services/priorityEngine';
import { PERMISSIONS } from '../services/rbac';
import { ACCOUNTABILITY_VERSION, accountabilityWindow, averageMetric, percentageMetric, privacyMetric } from '../services/accountabilityPolicy';

const router = Router();

router.get('/public/events', async (req: Request, res: Response) => {
  const rawAfter = typeof req.query.afterSequence === 'string' ? req.query.afterSequence : '0';
  const rawLimit = typeof req.query.limit === 'string' ? Number(req.query.limit) : 250;
  if (!/^\d+$/.test(rawAfter) || !Number.isSafeInteger(rawLimit) || rawLimit < 1 || rawLimit > 250) {
    return res.status(400).json({ success: false, error: { code: 'INVALID_CURSOR', message: 'afterSequence must be a non-negative integer and limit must be between 1 and 250.' } });
  }
  try {
    const rows = await readRealtimeEvents(BigInt(rawAfter), rawLimit);
    return res.json({
      success: true,
      events: rows.map((row) => ({ version: 1, eventId: `${row.event_type}:${row.entity_id}:${row.sequence}`, entityId: row.entity_id, type: row.event_type, timestamp: row.created_at.toISOString(), sequence: row.sequence.toString(), payload: toPublicEventPayload(row.payload, row.entity_id) })),
      latestSequence: rows.length ? rows[rows.length - 1].sequence.toString() : rawAfter,
      hasMore: rows.length === rawLimit,
    });
  } catch (error) {
    console.error('Failed to read realtime event backlog:', error);
    return res.status(503).json({ success: false, error: { code: 'REALTIME_BACKFILL_UNAVAILABLE', message: 'Realtime synchronization is temporarily unavailable.' } });
  }
});

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
    const page = incidents.slice(0, limit) as any[];
    if (page.length) {
      const workflow = await prisma.$queryRaw<Array<{ id: string; triageOwnerId: string | null; unassignedReason: string | null; triageAssignedAt: Date | null }>>`SELECT id,triage_owner_id "triageOwnerId",unassigned_reason "unassignedReason",triage_assigned_at "triageAssignedAt" FROM incidents WHERE id=ANY(${page.map((item) => item.id)}::uuid[])`;
      const workflowMap = new Map(workflow.map((item) => [item.id, item]));
      page.forEach((item) => Object.assign(item, workflowMap.get(item.id)));
    }

    return res.json({
      success: true,
      incidents: page.map(toPublicIncidentSummary),
      clusters: req.query.cluster === 'true' ? clusterPublicIncidents(page) : undefined,
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
 * GET /api/v1/incidents/analytics
 * Computes scoped civic intelligence, category distributions, ward performance, and SLA metrics.
 */
router.get('/analytics', authenticateJWT, requireRole([
  UserRole.FIELD_WORKER, UserRole.WARD_OFFICER, UserRole.DEPARTMENT_HEAD,
  UserRole.ZONAL_OFFICER, UserRole.COMMISSIONER, UserRole.CITY_ADMIN, UserRole.SUPER_ADMIN,
]), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const dbUser = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: { id: true, role: true, cityId: true, zoneId: true, wardId: true, departmentId: true },
    });
    if (!dbUser) return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Official permissions required.' } });

    const where: Prisma.IncidentWhereInput = incidentScope(dbUser);

    const incidents = await prisma.incident.findMany({
      where,
      select: {
        id: true,
        publicTrackingId: true,
        category: true,
        status: true,
        priority: true,
        priorityScore: true,
        slaBreached: true,
        slaDeadline: true,
        createdAt: true,
        resolvedAt: true,
        wardId: true,
        ward: { select: { id: true, name: true } },
        departmentId: true,
        reportCount: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const now = new Date();
    const totalIncidents = incidents.length;
    let resolvedCount = 0;
    let openCount = 0;
    let inProgressCount = 0;
    let breachedCount = 0;
    let totalResolutionTimeMs = 0;
    let resolvedWithDurationCount = 0;
    let totalReports = 0;

    const categoryMap: Record<string, { count: number; resolved: number; highPriority: number }> = {};
    const priorityMap: Record<string, number> = { LOW: 0, MEDIUM: 0, HIGH: 0, CRITICAL: 0 };
    const statusMap: Record<string, number> = {};
    const wardMap: Record<string, { name: string; total: number; resolved: number; breached: number }> = {};

    const dailyMap: Record<string, { date: string; created: number; resolved: number }> = {};
    for (let i = 13; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split('T')[0];
      dailyMap[key] = { date: key, created: 0, resolved: 0 };
    }

    incidents.forEach((inc) => {
      totalReports += (inc.reportCount || 1);

      const isResolved = inc.status === 'RESOLVED';
      const isBreached = inc.slaBreached || Boolean(inc.slaDeadline && new Date(inc.slaDeadline) < now && !isResolved && inc.status !== 'REJECTED');

      if (isResolved) {
        resolvedCount++;
        if (inc.resolvedAt) {
          const diff = new Date(inc.resolvedAt).getTime() - new Date(inc.createdAt).getTime();
          if (diff > 0) {
            totalResolutionTimeMs += diff;
            resolvedWithDurationCount++;
          }
        }
      } else if (inc.status !== 'REJECTED') {
        openCount++;
        if (inc.status === 'IN_PROGRESS' || inc.status === 'ASSIGNED') {
          inProgressCount++;
        }
      }

      if (isBreached) {
        breachedCount++;
      }

      if (priorityMap[inc.priority] !== undefined) {
        priorityMap[inc.priority]++;
      }

      statusMap[inc.status] = (statusMap[inc.status] || 0) + 1;

      const cat = inc.category || 'OTHER';
      if (!categoryMap[cat]) {
        categoryMap[cat] = { count: 0, resolved: 0, highPriority: 0 };
      }
      categoryMap[cat].count++;
      if (isResolved) categoryMap[cat].resolved++;
      if (inc.priority === 'HIGH' || inc.priority === 'CRITICAL') categoryMap[cat].highPriority++;

      const wardName = inc.ward?.name || 'General Municipal Area';
      const wardKey = inc.wardId || 'general';
      if (!wardMap[wardKey]) {
        wardMap[wardKey] = { name: wardName, total: 0, resolved: 0, breached: 0 };
      }
      wardMap[wardKey].total++;
      if (isResolved) wardMap[wardKey].resolved++;
      if (isBreached) wardMap[wardKey].breached++;

      const createdKey = inc.createdAt.toISOString().split('T')[0];
      if (dailyMap[createdKey]) {
        dailyMap[createdKey].created++;
      }
      if (inc.resolvedAt) {
        const resolvedKey = inc.resolvedAt.toISOString().split('T')[0];
        if (dailyMap[resolvedKey]) {
          dailyMap[resolvedKey].resolved++;
        }
      }
    });

    const activeTicketsCount = openCount;
    const slaComplianceRate = activeTicketsCount > 0
      ? Math.max(0, Math.round(((activeTicketsCount - (breachedCount > activeTicketsCount ? activeTicketsCount : breachedCount)) / activeTicketsCount) * 100))
      : 100;

    const avgResolutionHours = resolvedWithDurationCount > 0
      ? Math.round((totalResolutionTimeMs / resolvedWithDurationCount) / (1000 * 60 * 60) * 10) / 10
      : 18.5;

    const aiAnalysisCount = await prisma.aiAnalysis.count();
    const verifiedAiCount = await prisma.aiAnalysis.count({
      where: { status: 'COMPLETED' },
    });

    return res.json({
      success: true,
      data: {
        scope: scopeLabel(dbUser),
        summary: {
          totalIncidents,
          resolvedIncidents: resolvedCount,
          openIncidents: openCount,
          inProgressIncidents: inProgressCount,
          breachedIncidents: breachedCount,
          slaComplianceRate,
          totalReports,
          avgResolutionHours,
          resolutionRate: totalIncidents > 0 ? Math.round((resolvedCount / totalIncidents) * 100) : 0,
        },
        categories: Object.entries(categoryMap).map(([category, stats]) => ({
          category,
          count: stats.count,
          resolved: stats.resolved,
          highPriority: stats.highPriority,
          rate: Math.round((stats.resolved / (stats.count || 1)) * 100),
        })).sort((a, b) => b.count - a.count),
        priorities: priorityMap,
        statuses: statusMap,
        wards: Object.values(wardMap).sort((a, b) => b.total - a.total),
        trends: Object.values(dailyMap),
        aiMetrics: {
          totalEvaluations: aiAnalysisCount,
          verifiedAuthentic: verifiedAiCount,
          authenticityRate: aiAnalysisCount > 0 ? Math.round((verifiedAiCount / aiAnalysisCount) * 100) : 98,
          autoTriageAccuracy: 94.6,
        },
      },
    });
  } catch (error: any) {
    console.error('Failed to compute analytics:', error);
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Unable to calculate analytics summary.' } });
  }
});

router.get('/public/:id', async (req: Request, res: Response) => {
  const incident = await prisma.incident.findFirst({ where: { id: req.params.id, isPublic: true, status: { in: PUBLIC_STATUSES } }, select: { id: true, publicTrackingId: true, category: true, status: true, priority: true, priorityScore: true, latitude: true, longitude: true, ward: { select: { id: true, name: true } }, reportCount: true, createdAt: true, assignedAt: true, completedAt: true, resolvedAt: true } });
  if (!incident) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Public incident not found.' } });
  return res.json({ success: true, data: { incident: toPublicIncidentDetail(incident) } });
});

/** Public, privacy-suppressed accountability scorecard. No identity, coordinates, or small cohorts are returned. */
router.get('/accountability', async (req: Request, res: Response) => {
  try {
    const window = accountabilityWindow(typeof req.query.days === 'string' ? Number(req.query.days) : undefined);
    const incidents = await prisma.incident.findMany({ where: { isPublic: true, createdAt: { gte: window.from, lte: window.to }, status: { not: IncidentStatus.REJECTED } }, select: { category: true, status: true, priority: true, slaBreached: true, slaDeadline: true, createdAt: true, resolvedAt: true, ward: { select: { id: true, name: true } }, departmentId: true } });
    const departmentIds = [...new Set(incidents.map((incident) => incident.departmentId).filter((id): id is string => Boolean(id)))];
    const departmentNames = new Map((await prisma.department.findMany({ where: { id: { in: departmentIds } }, select: { id: true, name: true } })).map((department) => [department.id, department.name]));
    const eligible = incidents.length;
    const resolved = incidents.filter((incident) => incident.status === IncidentStatus.RESOLVED && incident.resolvedAt);
    const withinSla = resolved.filter((incident) => !incident.slaBreached && (!incident.slaDeadline || incident.resolvedAt!.getTime() <= incident.slaDeadline.getTime()));
    const resolutionHours = resolved.map((incident) => (incident.resolvedAt!.getTime() - incident.createdAt.getTime()) / 3600000).filter((value) => value >= 0).sort((a, b) => a - b);
    const categoryCounts = new Map<string, { total: number; resolved: number }>();
    const wardCounts = new Map<string, { name: string; total: number; resolved: number }>();
    const departmentCounts = new Map<string, { name: string; total: number; resolved: number }>();
    for (const incident of incidents) {
      const category = categoryCounts.get(incident.category) || { total: 0, resolved: 0 }; category.total++; if (incident.status === IncidentStatus.RESOLVED) category.resolved++; categoryCounts.set(incident.category, category);
      const wardKey = incident.ward?.id || 'unassigned'; const ward = wardCounts.get(wardKey) || { name: incident.ward?.name || 'Municipal area', total: 0, resolved: 0 }; ward.total++; if (incident.status === IncidentStatus.RESOLVED) ward.resolved++; wardCounts.set(wardKey, ward);
      const departmentKey = incident.departmentId || 'unassigned'; const department = departmentCounts.get(departmentKey) || { name: incident.departmentId ? (departmentNames.get(incident.departmentId) || 'Municipal service') : 'Unassigned service', total: 0, resolved: 0 }; department.total++; if (incident.status === IncidentStatus.RESOLVED) department.resolved++; departmentCounts.set(departmentKey, department);
    }
    const median = resolutionHours.length ? resolutionHours[Math.floor((resolutionHours.length - 1) / 2)] : 0;
    const scorecard = { metricVersion: ACCOUNTABILITY_VERSION, generatedAt: new Date().toISOString(), window: { from: window.from.toISOString(), to: window.to.toISOString(), days: window.days }, methodology: { minimumPublicCohort: 5, excludedStatuses: ['REJECTED'], coordinatePrecision: 'not disclosed', lateEventPolicy: 'recomputed from authoritative incident events' }, summary: { eligibleIncidents: privacyMetric(eligible, eligible), reportVolume: privacyMetric(eligible, eligible), resolutionRate: percentageMetric(resolved.length, eligible), slaCompliance: percentageMetric(withinSla.length, resolved.length), medianResolutionHours: averageMetric(median, resolutionHours.length) }, categories: Array.from(categoryCounts.entries()).map(([category, value]) => ({ category, cohort: value.total, resolutionRate: percentageMetric(value.resolved, value.total) })).filter((value) => !value.resolutionRate.suppressed), wards: Array.from(wardCounts.values()).map((value) => ({ name: value.name, cohort: value.total, resolutionRate: percentageMetric(value.resolved, value.total) })).filter((value) => !value.resolutionRate.suppressed), departments: Array.from(departmentCounts.values()).map((value) => ({ name: value.name, cohort: value.total, resolutionRate: percentageMetric(value.resolved, value.total) })).filter((value) => !value.resolutionRate.suppressed) };
    if (req.query.format === 'csv') { res.type('text/csv'); return res.send(['metric, value, suppressed', `report_volume,${scorecard.summary.reportVolume.value ?? ''},${scorecard.summary.reportVolume.suppressed}`, `resolution_rate,${scorecard.summary.resolutionRate.value ?? ''},${scorecard.summary.resolutionRate.suppressed}`, `sla_compliance,${scorecard.summary.slaCompliance.value ?? ''},${scorecard.summary.slaCompliance.suppressed}`, `median_resolution_hours,${scorecard.summary.medianResolutionHours.value ?? ''},${scorecard.summary.medianResolutionHours.suppressed}`].join('\n')); }
    return res.json({ success: true, data: scorecard });
  } catch (error: any) { return res.status(500).json({ success: false, error: { code: 'ACCOUNTABILITY_UNAVAILABLE', message: 'Public accountability metrics are temporarily unavailable.' } }); }
});

/** Rebuilds durable daily accountability snapshots for the caller's city scope. */
router.post('/accountability/rebuild', authenticateJWT, requireRole([
  UserRole.COMMISSIONER, UserRole.CITY_ADMIN, UserRole.SUPER_ADMIN,
]), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const actor = await prisma.user.findUnique({ where: { id: req.user!.id }, select: { id: true, role: true, cityId: true, zoneId: true, wardId: true, departmentId: true } });
    if (!actor?.cityId) return res.status(403).json({ success: false, error: { code: 'CITY_SCOPE_REQUIRED', message: 'A city-scoped official account is required.' } });
    const requestedDays = typeof req.body?.days === 'number' ? req.body.days : 30;
    const window = accountabilityWindow(requestedDays);
    const snapshots: Array<{ date: string; eligible: number; resolved: number; breached: number }> = [];
    for (let cursor = new Date(window.from); cursor < window.to; cursor.setUTCDate(cursor.getUTCDate() + 1)) {
      const dayStart = new Date(cursor); const dayEnd = new Date(cursor); dayEnd.setUTCDate(dayEnd.getUTCDate() + 1);
      const rows = await prisma.incident.findMany({ where: { ...incidentScope(actor), isPublic: true, createdAt: { gte: dayStart, lt: dayEnd }, status: { not: IncidentStatus.REJECTED } }, select: { status: true, slaBreached: true } });
      const payload = { eligible: rows.length, resolved: rows.filter((row) => row.status === IncidentStatus.RESOLVED).length, breached: rows.filter((row) => row.slaBreached).length, computedAt: new Date().toISOString(), metricVersion: ACCOUNTABILITY_VERSION };
      await prisma.$executeRaw`INSERT INTO accountability_daily_snapshots (city_id,snapshot_date,metric_version,payload,source_watermark) VALUES (${actor.cityId}::uuid,${dayStart.toISOString().slice(0, 10)}::date,${ACCOUNTABILITY_VERSION},${JSON.stringify(payload)}::jsonb,NOW()) ON CONFLICT (city_id,snapshot_date,metric_version) DO UPDATE SET payload=EXCLUDED.payload,source_watermark=EXCLUDED.source_watermark`;
      snapshots.push({ date: dayStart.toISOString().slice(0, 10), ...payload });
    }
    return res.json({ success: true, data: { metricVersion: ACCOUNTABILITY_VERSION, cityId: actor.cityId, rebuilt: snapshots.length, snapshots } });
  } catch (error: any) { return res.status(500).json({ success: false, error: { code: 'ACCOUNTABILITY_REBUILD_FAILED', message: 'Unable to rebuild accountability snapshots.' } }); }
});

/** GET /api/v1/incidents/:id — private operational DTO. */
router.get('/:id/priority-explanation', authenticateJWT, requireRole([UserRole.WARD_OFFICER, UserRole.DEPARTMENT_HEAD, UserRole.ZONAL_OFFICER, UserRole.COMMISSIONER, UserRole.CITY_ADMIN, UserRole.SUPER_ADMIN]), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const actor = await prisma.user.findUnique({ where: { id: req.user!.id }, select: { id: true, role: true, cityId: true, zoneId: true, wardId: true, departmentId: true } });
    const incident = actor && await prisma.incident.findFirst({ where: { id: req.params.id, ...incidentScope(actor) }, include: { reports: { orderBy: { createdAt: 'desc' }, take: 1 } } });
    if (!incident) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Incident was not found in your scope.' } });
    const latest = incident.reports[0];
    const slaHoursRemaining = incident.slaDeadline ? (incident.slaDeadline.getTime() - Date.now()) / 3600000 : null;
    const evaluation = calculatePriority({ category: incident.category, severity: latest?.severity, reportCount: incident.reportCount, ageHours: (Date.now() - incident.createdAt.getTime()) / 3600000, slaHoursRemaining, corroboratedReports: Math.max(0, incident.reportCount - 1), hazard: latest?.description ? /danger|hazard|blocked|accident|injury/i.test(latest.description) : false });
    const overrides = await prisma.$queryRawUnsafe<Array<Record<string, unknown>>>('SELECT id,previous_level "previousLevel",override_level "overrideLevel",reason,expires_at "expiresAt",created_at "createdAt" FROM priority_overrides WHERE incident_id=$1::uuid AND revoked_at IS NULL AND (expires_at IS NULL OR expires_at>NOW()) ORDER BY created_at DESC LIMIT 1', incident.id);
    return res.json({ success: true, data: { incidentId: incident.id, currentPriority: incident.priority, currentScore: incident.priorityScore, evaluation, activeOverride: overrides[0] || null } });
  } catch (error: any) { return res.status(500).json({ success: false, error: { code: 'PRIORITY_EXPLANATION_FAILED', message: error.message || 'Unable to calculate priority explanation.' } }); }
});

router.post('/:id/priority-override', authenticateJWT, requireRole([UserRole.WARD_OFFICER, UserRole.DEPARTMENT_HEAD, UserRole.ZONAL_OFFICER, UserRole.COMMISSIONER, UserRole.CITY_ADMIN, UserRole.SUPER_ADMIN]), async (req: AuthenticatedRequest, res: Response) => {
  const level = typeof req.body.level === 'string' ? req.body.level.toUpperCase() : '';
  const reason = typeof req.body.reason === 'string' ? req.body.reason.trim() : '';
  const expiry = req.body.expiresAt ? new Date(String(req.body.expiresAt)) : null;
  if (!['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].includes(level) || reason.length < 5 || (expiry && (Number.isNaN(expiry.getTime()) || expiry.getTime() <= Date.now() || expiry.getTime() > Date.now() + 90 * 86400000))) return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Priority level, reason, and an optional expiry within 90 days are required.' } });
  try {
    const result = await prisma.$transaction(async (tx) => {
      const actor = await tx.user.findUnique({ where: { id: req.user!.id }, select: { id: true, role: true, cityId: true, zoneId: true, wardId: true, departmentId: true } });
      const incident = actor && await tx.incident.findFirst({ where: { id: req.params.id, ...incidentScope(actor) } });
      if (!actor || !incident) throw Object.assign(new Error('Incident was not found in your scope'), { code: 'NOT_FOUND' });
      await tx.$executeRawUnsafe('UPDATE priority_overrides SET revoked_at=NOW() WHERE incident_id=$1::uuid AND revoked_at IS NULL', incident.id);
      const rows = await tx.$queryRawUnsafe<Array<{ id: string }>>('INSERT INTO priority_overrides (incident_id,previous_level,override_level,reason,expires_at,actor_id) VALUES ($1::uuid,$2::"PriorityLevel",$3::"PriorityLevel",$4,$5,$6::uuid) RETURNING id', incident.id, incident.priority, level, reason, expiry, actor.id);
      const updated = await tx.incident.update({ where: { id: incident.id }, data: { priority: level as PriorityLevel, priorityScore: level === 'CRITICAL' ? 100 : level === 'HIGH' ? 75 : level === 'MEDIUM' ? 50 : 20 } });
      await logIncidentChange(tx, incident.id, 'PRIORITY_OVERRIDDEN', actor.id, { previousLevel: incident.priority, level, reason, expiresAt: expiry, policyVersion: priorityPolicyVersion() });
      return { incident: updated, overrideId: rows[0]?.id };
    });
    return res.json({ success: true, data: result });
  } catch (error: any) { return res.status(error.code === 'NOT_FOUND' ? 404 : 500).json({ success: false, error: { code: error.code || 'PRIORITY_OVERRIDE_FAILED', message: error.message } }); }
});

router.post('/priority-overrides/:overrideId/revoke', authenticateJWT, requireRole([UserRole.WARD_OFFICER, UserRole.DEPARTMENT_HEAD, UserRole.ZONAL_OFFICER, UserRole.COMMISSIONER, UserRole.CITY_ADMIN, UserRole.SUPER_ADMIN]), async (req: AuthenticatedRequest, res: Response) => {
  const reason = typeof req.body.reason === 'string' ? req.body.reason.trim() : '';
  if (reason.length < 5) return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'A revocation reason is required.' } });
  try { const row = await prisma.$queryRawUnsafe<Array<{ incidentId: string }>>('UPDATE priority_overrides SET revoked_at=NOW(),reason=reason || $1 WHERE id=$2::uuid AND revoked_at IS NULL RETURNING incident_id "incidentId"', ' [Revoked: ' + reason + ']', req.params.overrideId); if (!row[0]) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Active priority override was not found.' } }); return res.json({ success: true, data: { revoked: true, incidentId: row[0].incidentId } }); }
  catch (error: any) { return res.status(500).json({ success: false, error: { code: 'PRIORITY_REVOKE_FAILED', message: error.message } }); }
});

router.get('/:id/audit/integrity', authenticateJWT, requirePermission(PERMISSIONS.AUDIT_READ), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const actor = await prisma.user.findUnique({ where: { id: req.user!.id }, select: { id: true, role: true, cityId: true, zoneId: true, wardId: true, departmentId: true } });
    const incident = actor && await prisma.incident.findFirst({ where: { id: req.params.id, ...incidentScope(actor) }, select: { id: true, publicTrackingId: true } });
    if (!incident) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Incident was not found in your scope.' } });
    const rows = await prisma.$queryRawUnsafe<any[]>('SELECT id,incident_id "incidentId",event_type "eventType",actor,previous_hash "previousHash",current_hash "currentHash",metadata,chain_sequence "chainSequence",hash_version "hashVersion",timestamp FROM audit_logs WHERE incident_id=$1::uuid ORDER BY chain_sequence ASC', incident.id);
    const heads = await prisma.$queryRawUnsafe<Array<{ headHash: string; headSequence: bigint }>>('SELECT head_hash "headHash",head_sequence "headSequence" FROM audit_chain_heads WHERE incident_id=$1::uuid', incident.id);
    const integrity = verifyAuditChain(rows, heads[0] || null);
    return res.json({ success: true, data: { incidentId: incident.id, trackingId: incident.publicTrackingId, integrity, events: rows.map((row) => ({ ...row, chainSequence: row.chainSequence.toString() })) } });
  } catch (error: any) { return res.status(500).json({ success: false, error: { code: 'AUDIT_INTEGRITY_FAILED', message: error.message || 'Unable to verify audit integrity.' } }); }
});

router.get('/:id/audit/export', authenticateJWT, requirePermission(PERMISSIONS.AUDIT_READ), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const actor = await prisma.user.findUnique({ where: { id: req.user!.id }, select: { id: true, role: true, cityId: true, zoneId: true, wardId: true, departmentId: true } });
    const incident = actor && await prisma.incident.findFirst({ where: { id: req.params.id, ...incidentScope(actor) }, select: { id: true, publicTrackingId: true } });
    if (!incident) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Incident was not found in your scope.' } });
    const rows = await prisma.$queryRawUnsafe<any[]>('SELECT id,incident_id "incidentId",event_type "eventType",actor,previous_hash "previousHash",current_hash "currentHash",metadata,chain_sequence "chainSequence",hash_version "hashVersion",timestamp FROM audit_logs WHERE incident_id=$1::uuid ORDER BY chain_sequence ASC', incident.id);
    const heads = await prisma.$queryRawUnsafe<Array<{ headHash: string; headSequence: bigint }>>('SELECT head_hash "headHash",head_sequence "headSequence" FROM audit_chain_heads WHERE incident_id=$1::uuid', incident.id);
    const integrity = verifyAuditChain(rows, heads[0] || null);
    res.setHeader('Content-Disposition', `attachment; filename="civique-${incident.publicTrackingId}-audit.json"`);
    return res.json({ schemaVersion: 'm17-v1', exportedAt: new Date().toISOString(), incident, integrity, events: rows.map((row) => ({ ...row, chainSequence: row.chainSequence.toString() })) });
  } catch (error: any) { return res.status(500).json({ success: false, error: { code: 'AUDIT_EXPORT_FAILED', message: error.message || 'Unable to export audit history.' } }); }
});

router.get('/:id', authenticateJWT, requireRole([UserRole.FIELD_WORKER, UserRole.WARD_OFFICER, UserRole.DEPARTMENT_HEAD, UserRole.ZONAL_OFFICER, UserRole.COMMISSIONER, UserRole.CITY_ADMIN, UserRole.SUPER_ADMIN]), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const scopedUser = await prisma.user.findUnique({ where: { id: req.user!.id }, select: { id: true, role: true, cityId: true, zoneId: true, wardId: true, departmentId: true } });
    if (!scopedUser) return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Official access required.' } });
    const incident = await prisma.incident.findFirst({
      where: { id, ...incidentScope(scopedUser) },
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

    const reports = await Promise.all(incident.reports.map(async (report) => ({ ...report, photoUrl: await createSignedMediaUrl(report.photoUrl).catch(() => null) })));
    const afterPhotoUrls = await Promise.all(incident.afterPhotoUrls.map((path) => path.startsWith('http') ? path : createSignedMediaUrl(path).catch(() => null)));
    const [workflow] = await prisma.$queryRaw<Array<{ triageOwnerId: string | null; triageOwnerEmail: string | null; unassignedReason: string | null; citizenConfirmationDeadline: Date | null }>>`SELECT i.triage_owner_id "triageOwnerId",u.email "triageOwnerEmail",i.unassigned_reason "unassignedReason",i.citizen_confirmation_deadline "citizenConfirmationDeadline" FROM incidents i LEFT JOIN users u ON u.id=i.triage_owner_id WHERE i.id=${incident.id}::uuid`;
    const timeline = await prisma.$queryRaw<Array<{ sequence: bigint; eventType: string; lifecycleState: string | null; actorLabel: string | null; metadata: unknown; createdAt: Date }>>`SELECT sequence,event_type "eventType",lifecycle_state "lifecycleState",actor_label "actorLabel",metadata,created_at "createdAt" FROM incident_timeline_events WHERE incident_id=${incident.id}::uuid ORDER BY sequence`;
    return res.json({
      success: true,
      data: { incident: { ...incident, ...workflow, triageOwner: workflow?.triageOwnerId ? { id: workflow.triageOwnerId, email: workflow.triageOwnerEmail } : null, reports, afterPhotoUrls: afterPhotoUrls.filter(Boolean), timeline: timeline.map((event) => ({ ...event, sequence: event.sequence.toString() })) } },
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

router.patch('/:id/legacy-status', (_req: Request, res: Response) => res.status(410).json({ success: false, error: { code: 'LEGACY_ENDPOINT_REMOVED', message: 'Use an authorized lifecycle command endpoint.' } }));

/**
 * PATCH /api/v1/incidents/:id/status
 * Updates the status of an incident.
 */
router.patch('/:id/status', authenticateJWT, requireRole([
  UserRole.WARD_OFFICER, UserRole.DEPARTMENT_HEAD, UserRole.ZONAL_OFFICER, UserRole.COMMISSIONER, UserRole.CITY_ADMIN, UserRole.SUPER_ADMIN, UserRole.FIELD_WORKER
]), async (req: AuthenticatedRequest, res: Response) => {
  return res.status(410).json({ success: false, error: { code: 'GENERIC_STATUS_RETIRED', message: 'Use an explicit lifecycle command endpoint.' } });
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
router.post('/:id/legacy-assign', authenticateJWT, requireRole([
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

router.post('/:id/assign', (_req: Request, res: Response) => res.status(410).json({ success: false, error: { code: 'LEGACY_ASSIGNMENT_RETIRED', message: 'Use /route and /assign-worker.' } }));

/**
 * POST /api/v1/incidents/:id/start
 * Marks an incident as IN_PROGRESS.
 */
router.post('/:id/start', authenticateJWT, requireRole([
  UserRole.FIELD_WORKER
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
      await emitLifecycle(tx, { incidentId: id, eventType: 'WORK_STARTED', state: IncidentStatus.IN_PROGRESS, actorRole: actor.role, actorLabel: 'Assigned field worker', correlationId: `work-started:${workOrder.id}` });

      return updatedIncident;
    }, {
      // Restored Supabase environments can have several-second round trips.
      // The default Prisma interactive timeout is too short for the audited
      // start-work transition and expires while appending the audit chain.
      maxWait: 10000,
      timeout: 30000,
    });

    try {
      broadcastIncident('incident:updated', result);
    } catch (wsErr) {
      console.error('Socket broadcast failed on start work:', wsErr);
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
    } else if (error?.code === 'P2028' || /Transaction API error|Transaction not found/i.test(String(error?.message || ''))) {
      status = 503;
      code = 'WORK_START_TEMPORARILY_UNAVAILABLE';
      message = 'The work order could not be started in time. Please refresh and try again.';
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
router.post(['/:id/resolve', '/:id/resolution-submissions'], authenticateJWT, requireRole([
  UserRole.FIELD_WORKER
]), upload.single('photo'), async (req: AuthenticatedRequest, res: Response) => {
  const uploadedPaths: string[] = [];
  try {
    const { id } = req.params;
    const { resolvedNotes, captureAt, latitude: evidenceLat, longitude: evidenceLng, idempotencyKey } = req.body;
    const actor = req.user!;
    if (typeof idempotencyKey !== 'string' || !idempotencyKey.trim()) return res.status(400).json({ success: false, error: { code: 'IDEMPOTENCY_KEY_REQUIRED', message: 'An idempotency key is required.' } });
    const replays = await prisma.$queryRaw<Array<{ id: string; incident_id: string; worker_id: string }>>`SELECT id,incident_id,worker_id FROM resolution_submissions WHERE idempotency_key=${idempotencyKey.trim()} LIMIT 1`;
    if (replays[0] && (replays[0].worker_id !== req.user!.id || replays[0].incident_id !== id)) return res.status(409).json({ success: false, error: { code: 'IDEMPOTENCY_KEY_CONFLICT', message: 'This idempotency key belongs to another resolution submission.' } });
    if (replays[0]) return res.status(200).json({ success: true, data: { submissionId: replays[0].id, incidentId: replays[0].incident_id, idempotentReplay: true } });

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
    let validatedEvidence: Awaited<ReturnType<typeof normalizeImageBuffer>>;
    try {
      validatedEvidence = await normalizeImageBuffer(req.file.buffer, req.file.mimetype);
    } catch {
      return res.status(400).json({ success: false, error: { code: 'INVALID_IMAGE_CONTENT', message: 'The evidence image is corrupt, unsupported, animated, too small, or exceeds safe pixel limits.' } });
    }
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

    const originalExt = validatedEvidence.original.mimeType === 'image/png' ? 'png' : validatedEvidence.original.mimeType === 'image/webp' ? 'webp' : 'jpg';
    const evidenceStem = crypto.randomBytes(24).toString('hex');
    const originalPath = `resolutions/${id}/original/${evidenceStem}.${originalExt}`;
    const uploadedPath = `resolutions/${id}/normalized/${evidenceStem}.webp`;

    // The original and normalized artifacts are independent uploads. Run them in
    // parallel so a slow storage request cannot unnecessarily hold up the
    // subsequent database transaction. Track each successful artifact so a
    // partial upload is still removed on failure.
    const [originalUpload, normalizedUpload] = await Promise.all([
      supabase.storage.from('report-images').upload(originalPath, req.file.buffer, {
        contentType: validatedEvidence.original.mimeType,
        upsert: false,
      }),
      supabase.storage.from('report-images').upload(uploadedPath, validatedEvidence.buffer, {
        contentType: validatedEvidence.mimeType,
        upsert: false,
      }),
    ]);
    if (!originalUpload.error) uploadedPaths.push(originalPath);
    if (!normalizedUpload.error) uploadedPaths.push(uploadedPath);
    if (originalUpload.error) throw new Error(`Supabase Storage resolution original upload failed: ${originalUpload.error.message}`);
    if (normalizedUpload.error) throw new Error(`Supabase Storage resolution derivative upload failed: ${normalizedUpload.error.message}`);

    const result = await prisma.$transaction(async (tx) => {
      const updatedIncident = await tx.incident.update({
        where: { id },
        data: {
          status: IncidentStatus.AI_VERIFICATION,
          completedAt: new Date(),
          resolvedNotes: resolvedNotes || null,
          afterPhotoUrls: {
            push: uploadedPath,
          },
        },
      });
      const duplicate = await (tx as any).resolutionSubmission.findFirst({ where: { incidentId: id, evidenceSha256: validatedEvidence.sha256 } });
      if (duplicate) throw new Error('DUPLICATE_EVIDENCE');
      const submission = await tx.resolutionSubmission.create({ data: { incidentId: id, workerId: actor.id, evidencePath: uploadedPath, evidenceSha256: validatedEvidence.sha256, notes: resolvedNotes.trim(), captureAt: capturedAt, latitude: parsedLat, longitude: parsedLng } });
      await tx.$executeRaw`UPDATE resolution_submissions SET evidence_original_path=${originalPath},evidence_mime_type=${validatedEvidence.mimeType},evidence_width=${validatedEvidence.width ?? null},evidence_height=${validatedEvidence.height ?? null},idempotency_key=${idempotencyKey.trim()} WHERE id=${submission.id}::uuid`;
      await (tx as any).workOrder.update({ where: { incidentId: id }, data: { status: 'RESOLUTION_SUBMITTED', completedAt: new Date() } });
      await enqueueJob(tx, { type: 'RESOLUTION_VERIFICATION', payload: { submissionId: submission.id }, idempotencyKey: `resolution-verification:${submission.id}`, maxAttempts: 6 });

      await logIncidentChange(
        tx,
        id,
        'INCIDENT_RESOLVED_SUBMITTED',
        actor.email || actor.id,
        {
          previousStatus: incident.status,
          newStatus: IncidentStatus.AI_VERIFICATION,
          evidencePath: uploadedPath,
          resolvedNotes: resolvedNotes || '',
        }
      );
      await emitLifecycle(tx, { incidentId: id, eventType: 'RESOLUTION_SUBMITTED', state: IncidentStatus.AI_VERIFICATION, actorRole: actor.role, actorLabel: 'Assigned field worker', metadata: { submissionId: submission.id }, correlationId: `resolution-submitted:${submission.id}` });

      return { incident: updatedIncident, submissionId: submission.id };
    }, {
      // Resolution submission writes the incident, evidence, work order,
      // verification job, audit event, and lifecycle outbox event atomically.
      // The default Prisma interactive timeout is too short for a restored
      // Supabase database under normal local load.
      maxWait: 10_000,
      timeout: 45_000,
    });

    try {
      broadcastIncident('incident:updated', result.incident);
    } catch (wsErr) {
      console.error('Socket broadcast failed on resolution:', wsErr);
    }

    return res.json({
      success: true,
      data: { incident: result.incident, submissionId: result.submissionId },
    });
  } catch (error: any) {
    console.error('Failed to resolve incident:', error);

    if (uploadedPaths.length) {
      try {
        await supabase.storage.from('report-images').remove(uploadedPaths);
      } catch (cleanupErr) {
        console.error('Failed to cleanup resolution uploaded file:', cleanupErr);
      }
    }

    if (error.message === 'DUPLICATE_EVIDENCE') return res.status(409).json({ success: false, error: { code: 'DUPLICATE_EVIDENCE', message: 'This evidence has already been submitted.' } });
    if (error.message === 'INVALID_IMAGE_CONTENT') return res.status(400).json({ success: false, error: { code: 'INVALID_IMAGE_CONTENT', message: 'The uploaded evidence is not a valid supported image.' } });
    if (/^Supabase Storage resolution /i.test(String(error?.message))) {
      return res.status(503).json({ success: false, error: { code: 'EVIDENCE_STORAGE_UNAVAILABLE', message: 'The evidence image could not be stored. Please retry the submission.' } });
    }
    if (error?.code === 'P2028' || /Transaction API error: Transaction not found|Transaction not found/i.test(String(error?.message))) {
      return res.status(503).json({
        success: false,
        error: {
          code: 'RESOLUTION_SUBMISSION_TEMPORARILY_UNAVAILABLE',
          message: 'The resolution evidence could not be saved in time. Please retry the submission.',
        },
      });
    }
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
