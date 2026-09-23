import { IncidentStatus, Prisma, UserRole } from '@prisma/client';

const ACTIVE_STATES: IncidentStatus[] = [IncidentStatus.AI_REVIEW, IncidentStatus.OPEN, IncidentStatus.ACKNOWLEDGED, IncidentStatus.ASSIGNED, IncidentStatus.IN_PROGRESS, IncidentStatus.RESOLUTION_SUBMITTED, IncidentStatus.AI_VERIFICATION, IncidentStatus.CITIZEN_CONFIRMATION, IncidentStatus.ESCALATED, IncidentStatus.DISPUTED, IncidentStatus.REOPENED];

export async function assignLeastLoadedWardOfficer(tx: Prisma.TransactionClient, input: { incidentId: string; wardId: string; assignedById?: string | null }) {
  // Serialize selection within the ward so simultaneous reports cannot select from the same stale load snapshot.
  await tx.$queryRaw`SELECT id FROM wards WHERE id=${input.wardId}::uuid FOR UPDATE`;
  const officers = await tx.user.findMany({
    where: { role: UserRole.WARD_OFFICER, wardId: input.wardId, active: true },
    select: { id: true }, orderBy: { id: 'asc' },
  });
  if (!officers.length) {
    const reason = 'NO_ACTIVE_WARD_OFFICER';
    await tx.$executeRaw`UPDATE incidents SET triage_owner_id=NULL,triage_assigned_at=NULL,triage_assignment_reason=NULL,triage_assignment_version=1,unassigned_reason=${reason} WHERE id=${input.incidentId}::uuid`;
    await tx.$executeRaw`INSERT INTO triage_assignments (incident_id,officer_id,assigned_by_id,reason,version) VALUES (${input.incidentId}::uuid,NULL,${input.assignedById || null}::uuid,${reason},1)`;
    return { officerId: null, reason };
  }
  const ids = officers.map((officer) => officer.id);
  const loads = await tx.$queryRaw<Array<{ officer_id: string; load: bigint }>>`SELECT triage_owner_id officer_id,COUNT(*) load FROM incidents WHERE triage_owner_id=ANY(${ids}::uuid[]) AND status=ANY(${ACTIVE_STATES}::"IncidentStatus"[]) GROUP BY triage_owner_id`;
  const lastAssignments = await tx.$queryRaw<Array<{ officer_id: string; last_at: Date }>>`SELECT officer_id,MAX(created_at) last_at FROM triage_assignments WHERE officer_id=ANY(${ids}::uuid[]) GROUP BY officer_id`;
  const loadMap = new Map(loads.map((row) => [row.officer_id, Number(row.load)]));
  const lastMap = new Map(lastAssignments.map((row) => [row.officer_id, row.last_at?.getTime() || 0]));
  ids.sort((a, b) => (loadMap.get(a) || 0) - (loadMap.get(b) || 0) || (lastMap.get(a) || 0) - (lastMap.get(b) || 0) || a.localeCompare(b));
  const officerId = ids[0];
  const reason = `LEAST_LOADED_ACTIVE_WARD_OFFICER:load=${loadMap.get(officerId) || 0}`;
  await tx.$executeRaw`UPDATE incidents SET triage_owner_id=${officerId}::uuid,triage_assigned_at=NOW(),triage_assignment_reason=${reason},triage_assignment_version=1,unassigned_reason=NULL WHERE id=${input.incidentId}::uuid`;
  await tx.$executeRaw`INSERT INTO triage_assignments (incident_id,officer_id,assigned_by_id,reason,version) VALUES (${input.incidentId}::uuid,${officerId}::uuid,${input.assignedById || null}::uuid,${reason},1)`;
  return { officerId, reason };
}
