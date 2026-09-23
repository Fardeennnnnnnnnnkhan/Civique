import assert from 'node:assert/strict';
import { IncidentStatus, PrismaClient, UserRole } from '@prisma/client';
import { assignLeastLoadedWardOfficer } from './triageAssignment';
import { emitLifecycle } from './workflowEvents';

const prisma = new PrismaClient();
const ROLLBACK = new Error('TEST_ROLLBACK');
async function main() {
  try {
    await prisma.$transaction(async (tx) => {
      const ward = await tx.ward.findFirst({ include: { zone: true } });
      const department = await tx.department.findFirst();
      assert.ok(ward && department);
      await Promise.all(['a', 'b'].map((suffix) => tx.user.upsert({ where: { email: `workflow-${suffix}@civique.test` }, update: { active: true, role: UserRole.WARD_OFFICER, wardId: ward.id, zoneId: ward.zoneId, cityId: ward.zone.cityId }, create: { email: `workflow-${suffix}@civique.test`, active: true, role: UserRole.WARD_OFFICER, wardId: ward.id, zoneId: ward.zoneId, cityId: ward.zone.cityId } })));
      const officers = await tx.user.findMany({ where: { role: UserRole.WARD_OFFICER, wardId: ward.id, active: true } });
      const makeIncident = (suffix: string) => tx.incident.create({ data: { publicTrackingId: `CIV-TEST-${Date.now()}-${suffix}`, category: 'POTHOLE', status: IncidentStatus.AI_REVIEW, latitude: 22.7, longitude: 75.8, cityId: ward.zone.cityId, zoneId: ward.zoneId, wardId: ward.id, departmentId: department.id, beforePhotoUrls: [] } });
      const first = await makeIncident('A'); const firstAssignment = await assignLeastLoadedWardOfficer(tx, { incidentId: first.id, wardId: ward.id });
      const second = await makeIncident('B'); const secondAssignment = await assignLeastLoadedWardOfficer(tx, { incidentId: second.id, wardId: ward.id });
      assert.ok(officers.some((officer) => officer.id === firstAssignment.officerId));
      assert.ok(officers.some((officer) => officer.id === secondAssignment.officerId));
      assert.notEqual(firstAssignment.officerId, secondAssignment.officerId, 'least-loaded selection should balance consecutive incidents');
      await emitLifecycle(tx, { incidentId: first.id, eventType: 'REPORT_RECEIVED', state: IncidentStatus.AI_REVIEW, actorRole: UserRole.CITIZEN, actorLabel: 'Citizen', correlationId: `workflow-test:${first.id}` });
      const [timeline, outbox] = await Promise.all([tx.$queryRaw<Array<{ count: bigint }>>`SELECT COUNT(*) count FROM incident_timeline_events WHERE incident_id=${first.id}::uuid`, tx.outboxEvent.count({ where: { idempotencyKey: `notify:workflow-test:${first.id}` } })]);
      assert.equal(Number(timeline[0].count), 1); assert.equal(outbox, 1);
      throw ROLLBACK;
    });
  } catch (error) { if (error !== ROLLBACK) throw error; }
  console.log('Transactional ward assignment, timeline, and outbox integration tests passed');
}
main().finally(() => prisma.$disconnect());
