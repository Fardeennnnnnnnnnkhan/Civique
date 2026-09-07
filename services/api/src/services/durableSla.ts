import { IncidentStatus, UserRole } from '@prisma/client';
import { prisma } from '../db';
import { logIncidentChange } from '../utils/audit';

const ACTIVE = [IncidentStatus.REPORTED, IncidentStatus.AI_REVIEW, IncidentStatus.OPEN, IncidentStatus.ACKNOWLEDGED, IncidentStatus.ASSIGNED, IncidentStatus.IN_PROGRESS, IncidentStatus.REOPENED, IncidentStatus.DISPUTED];

export async function ensureIncidentSla(incidentId: string) {
  const incident = await prisma.incident.findUnique({ where: { id: incidentId } });
  if (!incident) throw new Error('INCIDENT_NOT_FOUND');
  const existing = await (prisma as any).incidentSla.findUnique({ where: { incidentId } });
  if (existing) return existing;
  let policy = await (prisma as any).slaPolicy.findFirst({ where: { active: true, OR: [{ cityId: incident.cityId }, { cityId: null }], effectiveFrom: { lte: new Date() }, AND: [{ OR: [{ effectiveUntil: null }, { effectiveUntil: { gt: new Date() } }] }] }, orderBy: [{ cityId: 'desc' }, { version: 'desc' }] });
  if (!policy) policy = await (prisma as any).slaPolicy.create({ data: { name: 'Civique Default Policy', cityId: incident.cityId, version: 1 } });
  const deadline = new Date(incident.createdAt.getTime() + policy.tier1Hours * 3600000);
  return (prisma as any).incidentSla.create({ data: { incidentId, policyId: policy.id, deadlineAt: deadline } });
}

export async function evaluateDurableSla(): Promise<{ evaluated: number; escalated: number; events: number }> {
  const incidents = await prisma.incident.findMany({ where: { status: { in: ACTIVE }, slaBreached: false }, select: { id: true, cityId: true, wardId: true, zoneId: true, departmentId: true, assignedTo: true, publicTrackingId: true, category: true, status: true } });
  let escalated = 0; let events = 0;
  for (const incident of incidents) {
    try {
      const sla = await ensureIncidentSla(incident.id);
      const policy = await (prisma as any).slaPolicy.findUnique({ where: { id: sla.policyId } });
      if (!policy || sla.state !== 'ACTIVE') continue;
      const elapsed = (Date.now() - sla.startedAt.getTime()) / 3600000;
      const tier = elapsed >= policy.commissionerHours ? 3 : elapsed >= policy.tier2Hours ? 2 : elapsed >= policy.tier1Hours ? 1 : 0;
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

export function startDurableSlaJob() {
  const interval = Number(process.env.SLA_EVALUATION_INTERVAL_MS || 60000);
  const run = () => evaluateDurableSla().catch(error => console.error('[SLA] Durable evaluation failed', error));
  run();
  return setInterval(run, Math.max(interval, 10000));
}
