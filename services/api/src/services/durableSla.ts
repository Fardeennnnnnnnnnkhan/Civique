import { IncidentStatus, UserRole } from '@prisma/client';
import { prisma } from '../db';
import { logIncidentChange } from '../utils/audit';
import { addWorkingHours, workingMillisecondsBetween } from './slaCalendar';

const ACTIVE = [IncidentStatus.REPORTED, IncidentStatus.AI_REVIEW, IncidentStatus.OPEN, IncidentStatus.ACKNOWLEDGED, IncidentStatus.ASSIGNED, IncidentStatus.IN_PROGRESS, IncidentStatus.REOPENED, IncidentStatus.DISPUTED];

export function calculateSlaTier(elapsedWorkingHours: number, policy: { tier1Hours: number; tier2Hours: number; commissionerHours: number }): number {
  if (elapsedWorkingHours >= policy.commissionerHours) return 3;
  if (elapsedWorkingHours >= policy.tier2Hours) return 2;
  if (elapsedWorkingHours >= policy.tier1Hours) return 1;
  return 0;
}

export async function ensureIncidentSla(incidentId: string) {
  const incident = await prisma.incident.findUnique({ where: { id: incidentId } });
  if (!incident) throw new Error('INCIDENT_NOT_FOUND');
  const existing = await (prisma as any).incidentSla.findUnique({ where: { incidentId } });
  if (existing) return existing;
  let policy = await (prisma as any).slaPolicy.findFirst({ where: { active: true, OR: [{ cityId: incident.cityId }, { cityId: null }], effectiveFrom: { lte: new Date() }, AND: [{ OR: [{ effectiveUntil: null }, { effectiveUntil: { gt: new Date() } }] }] }, orderBy: [{ cityId: 'desc' }, { version: 'desc' }] });
  if (!policy) policy = await (prisma as any).slaPolicy.create({ data: { name: 'Civique Default Policy', cityId: incident.cityId, version: 1 } });
  const startedAt = incident.createdAt;
  const deadline = addWorkingHours(startedAt, policy.tier1Hours, policy.timezone, policy.workingCalendar);
  return (prisma as any).incidentSla.create({ data: { incidentId, policyId: policy.id, startedAt, deadlineAt: deadline } });
}

export async function evaluateDurableSla(): Promise<{ evaluated: number; escalated: number; events: number }> {
  const incidents = await prisma.incident.findMany({ where: { status: { in: ACTIVE }, slaBreached: false }, select: { id: true, cityId: true, wardId: true, zoneId: true, departmentId: true, assignedTo: true, publicTrackingId: true, category: true, status: true } });
  let escalated = 0; let events = 0;
  for (const incident of incidents) {
    try {
      const sla = await ensureIncidentSla(incident.id);
      const policy = await (prisma as any).slaPolicy.findUnique({ where: { id: sla.policyId } });
      if (!policy || sla.state !== 'ACTIVE') continue;
      const elapsed = workingMillisecondsBetween(sla.startedAt, new Date(), policy.timezone, policy.workingCalendar) / 3600000;
      const tier = calculateSlaTier(elapsed, policy);
      if (tier <= sla.currentTier) continue;
      await prisma.$transaction(async tx => {
        const event = await (tx as any).slaEscalationEvent.createMany({ data: Array.from({ length: tier - sla.currentTier }, (_, i) => ({ incidentId: incident.id, incidentSlaId: sla.id, tier: sla.currentTier + i + 1, eventType: `TIER_${sla.currentTier + i + 1}`, metadata: { policyId: policy.id, policyVersion: policy.version } })), skipDuplicates: true });
        const targetRole = tier >= 3 ? UserRole.COMMISSIONER : tier === 2 ? UserRole.ZONAL_OFFICER : UserRole.DEPARTMENT_HEAD;
        const target = await tx.user.findFirst({ where: { role: targetRole, active: true, ...(targetRole === UserRole.COMMISSIONER || targetRole === UserRole.ZONAL_OFFICER ? { cityId: incident.cityId } : { departmentId: incident.departmentId }) } });
        await (tx as any).incidentSla.update({ where: { id: sla.id }, data: { currentTier: tier, lastEvaluatedAt: new Date() } });
        if (tier >= 3) await tx.incident.update({ where: { id: incident.id }, data: { status: IncidentStatus.ESCALATED, slaBreached: true, assignedTo: target?.id ?? incident.assignedTo, assignedAt: target ? new Date() : undefined } });
        await logIncidentChange(tx, incident.id, 'SLA_TIER_ESCALATED', 'SLA_DAEMON_ENGINE', { tier, targetUserId: target?.id ?? null, policyId: policy.id, policyVersion: policy.version });
        events += event.count;
        if (tier >= 3) escalated++;
      });
    } catch (error) { console.error(`[SLA] Evaluation failed for ${incident.id}`, error); }
  }
  return { evaluated: incidents.length, escalated, events };
}

export async function pauseIncidentSla(incidentId: string, reason: string) {
  const sla = await (prisma as any).incidentSla.findUnique({ where: { incidentId } });
  if (!sla) throw new Error('SLA_NOT_FOUND');
  if (sla.state === 'PAUSED') return sla;
  return (prisma as any).incidentSla.update({ where: { id: sla.id }, data: { state: 'PAUSED', pausedAt: new Date(), pausedReason: reason.slice(0, 500), lastEvaluatedAt: new Date() } });
}

export async function resumeIncidentSla(incidentId: string) {
  const sla = await (prisma as any).incidentSla.findUnique({ where: { incidentId }, include: { policy: true } });
  if (!sla) throw new Error('SLA_NOT_FOUND');
  if (sla.state !== 'PAUSED' || !sla.pausedAt) return sla;
  const now = new Date();
  const pausedSeconds = Math.max(0, Math.floor((now.getTime() - sla.pausedAt.getTime()) / 1000));
  return (prisma as any).incidentSla.update({ where: { id: sla.id }, data: { state: 'ACTIVE', pausedAt: null, pausedReason: null, pausedSeconds: { increment: pausedSeconds }, startedAt: new Date(sla.startedAt.getTime() + pausedSeconds * 1000), deadlineAt: new Date(sla.deadlineAt.getTime() + pausedSeconds * 1000), lastEvaluatedAt: now } });
}

export function startDurableSlaJob() {
  const interval = Number(process.env.SLA_EVALUATION_INTERVAL_MS || 300000);
  let isRunning = false;
  const run = async () => {
    if (isRunning) return;
    isRunning = true;
    try {
      await evaluateDurableSla();
    } catch (error: any) {
      // Log concise error without dumping full stack during pool contention
      console.warn('[SLA] Background evaluation paused:', error?.message || error?.code || 'Connection busy');
    } finally {
      isRunning = false;
    }
  };
  // Delay initial background check by 30s to prioritize user requests
  setTimeout(run, 30000);
  return setInterval(run, Math.max(interval, 60000));
}
