import assert from 'node:assert/strict';
import { IncidentStatus, PrismaClient, UserRole } from '@prisma/client';
import { canAdministrativeClose, isWithinAppealWindow } from './resolutionVerificationPolicy';

// Requires the restored database plus migration 0024. All records are rolled back.
const prisma = new PrismaClient();
const ROLLBACK = new Error('M16_TEST_ROLLBACK');

async function main() {
  try {
    await prisma.$transaction(async (tx) => {
      const ward = await tx.ward.findFirst({ include: { zone: true } });
      const department = await tx.department.findFirst();
      assert.ok(ward && department, 'an imported ward and department are required');
      const citizen = await tx.user.upsert({ where: { email: 'm16-citizen@civique.test' }, update: { active: true, role: UserRole.CITIZEN, cityId: ward.zone.cityId }, create: { email: 'm16-citizen@civique.test', active: true, role: UserRole.CITIZEN, cityId: ward.zone.cityId } });
      const worker = await tx.user.upsert({ where: { email: 'm16-worker@civique.test' }, update: { active: true, role: UserRole.FIELD_WORKER, cityId: ward.zone.cityId, wardId: ward.id, departmentId: department.id }, create: { email: 'm16-worker@civique.test', active: true, role: UserRole.FIELD_WORKER, cityId: ward.zone.cityId, wardId: ward.id, departmentId: department.id } });
      const incident = await tx.incident.create({ data: { publicTrackingId: `CIV-M16-${Date.now()}`, category: 'POTHOLE', status: IncidentStatus.AI_VERIFICATION, latitude: 22.7196, longitude: 75.8577, cityId: ward.zone.cityId, zoneId: ward.zoneId, wardId: ward.id, departmentId: department.id, beforePhotoUrls: [] } });
      await tx.report.create({ data: { incidentId: incident.id, submitterRef: citizen.id, photoUrl: 'private/m16-before.jpg', title: 'M16 verification fixture', description: 'fixture', latitude: incident.latitude, longitude: incident.longitude, consentVersion: 'test-v1', consentedAt: new Date() } });
      const submission = await tx.resolutionSubmission.create({ data: { incidentId: incident.id, workerId: worker.id, evidencePath: 'private/m16-after.jpg', evidenceSha256: `m16-${Date.now()}`, notes: 'fixture repair evidence', captureAt: new Date(), verificationStatus: 'PENDING' } });

      await tx.resolutionSubmission.update({ where: { id: submission.id }, data: { verificationStatus: 'VERIFIED_BY_OFFICIAL', verificationResult: { manual: true }, verifiedAt: new Date() } });
      const deadline = new Date(Date.now() - 60_000);
      const awaitingCitizen = await tx.incident.update({ where: { id: incident.id }, data: { status: IncidentStatus.CITIZEN_CONFIRMATION, citizenConfirmationDeadline: deadline } });
      assert.equal(canAdministrativeClose({ status: awaitingCitizen.status, confirmationDeadline: awaitingCitizen.citizenConfirmationDeadline, verificationStatus: 'VERIFIED_BY_OFFICIAL' }), true);

      const resolvedAt = new Date();
      const resolved = await tx.incident.update({ where: { id: incident.id }, data: { status: IncidentStatus.RESOLVED, resolvedAt, citizenConfirmationDeadline: null } });
      assert.equal(isWithinAppealWindow(resolved.resolvedAt), true);
      const appeal = await tx.$queryRaw<Array<{ id: string }>>`INSERT INTO resolution_appeals (incident_id,citizen_id,reason) VALUES (${incident.id}::uuid,${citizen.id}::uuid,'Fixture appeal for M16 verification') RETURNING id`;
      assert.ok(appeal[0]?.id);
      const reopened = await tx.incident.update({ where: { id: incident.id }, data: { status: IncidentStatus.REOPENED, resolvedAt: null } });
      assert.equal(reopened.status, IncidentStatus.REOPENED);
      throw ROLLBACK;
    });
  } catch (error) {
    if (error !== ROLLBACK) throw error;
  } finally {
    await prisma.$disconnect();
  }
  console.log('M16 verification, citizen confirmation, administrative closure, appeal, and reopen integration checks passed');
}

void main();
