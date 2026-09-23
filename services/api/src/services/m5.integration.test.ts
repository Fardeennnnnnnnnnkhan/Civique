import assert from 'node:assert/strict';
import { IncidentStatus, PrismaClient, UserRole } from '@prisma/client';
import { findDuplicateIncident } from '../utils/duplicate';
import { assertTriageAccess } from './policies';
import { transitionIncident } from './incidentTransitions';

const prisma = new PrismaClient();
const ROLLBACK = new Error('M5_TEST_ROLLBACK');

async function main() {
  try {
    await prisma.$transaction(async (tx) => {
      const ward = await tx.ward.findFirst({ include: { zone: true } });
      assert.ok(ward, 'an imported ward is required');
      const actor = await tx.user.upsert({ where: { email: 'm5-scope-test@civique.test' }, update: { active: true, role: UserRole.CITY_ADMIN, cityId: ward.zone.cityId }, create: { email: 'm5-scope-test@civique.test', active: true, role: UserRole.CITY_ADMIN, cityId: ward.zone.cityId } });
      const incident = await tx.incident.create({ data: { publicTrackingId: `CIV-M5-${Date.now()}`, category: 'POTHOLE', status: IncidentStatus.OPEN, latitude: 22.7196, longitude: 75.8577, cityId: ward.zone.cityId, zoneId: ward.zoneId, wardId: ward.id, beforePhotoUrls: [] } });

      const first = await transitionIncident(tx, { incidentId: incident.id, to: IncidentStatus.ACKNOWLEDGED, actorId: actor.id, actorRole: actor.role, actorLabel: actor.id, idempotencyKey: `m5-transition-${incident.id}` });
      const replay = await transitionIncident(tx, { incidentId: incident.id, to: IncidentStatus.ACKNOWLEDGED, actorId: actor.id, actorRole: actor.role, actorLabel: actor.id, idempotencyKey: `m5-transition-${incident.id}` });
      assert.equal(first.status, IncidentStatus.ACKNOWLEDGED);
      assert.equal(first.idempotentReplay, false);
      assert.equal(replay.idempotentReplay, true);
      assert.equal(await tx.outboxEvent.count({ where: { idempotencyKey: `incident-transition:m5-transition-${incident.id}` } }), 1);

      const duplicate = await tx.incident.create({ data: { publicTrackingId: `CIV-M5-DUP-${Date.now()}`, category: 'POTHOLE', status: IncidentStatus.OPEN, latitude: 22.71961, longitude: 75.85771, cityId: ward.zone.cityId, zoneId: ward.zoneId, wardId: ward.id, beforePhotoUrls: [] } });
      const match = await findDuplicateIncident(tx, 'POTHOLE', duplicate.latitude, duplicate.longitude, 100);
      assert.ok(match, 'nearby active incident should be linked as a duplicate');

      assert.throws(() => assertTriageAccess({ id: 'other-city', role: UserRole.CITY_ADMIN, cityId: '00000000-0000-0000-0000-000000000001', zoneId: null, wardId: null, departmentId: null, active: true }, incident), /outside your triage scope/);
      throw ROLLBACK;
    });
  } catch (error) {
    if (error !== ROLLBACK) throw error;
  } finally {
    await prisma.$disconnect();
  }
  console.log('M5 transition, replay, duplicate-link, and scope integration checks passed');
}

void main();
