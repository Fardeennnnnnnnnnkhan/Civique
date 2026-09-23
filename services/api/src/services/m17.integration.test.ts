import assert from 'node:assert/strict';
import { IncidentStatus, PrismaClient } from '@prisma/client';
import { logIncidentChange, verifyAuditChain } from '../utils/audit';

const prisma = new PrismaClient();
const ROLLBACK = new Error('M17_TEST_ROLLBACK');

async function main() {
  try {
    await prisma.$transaction(async (tx) => {
      const ward = await tx.ward.findFirst({ include: { zone: true } });
      assert.ok(ward, 'an imported ward is required');
      const incident = await tx.incident.create({ data: { publicTrackingId: `CIV-M17-${Date.now()}`, category: 'POTHOLE', status: IncidentStatus.OPEN, latitude: 22.7196, longitude: 75.8577, cityId: ward.zone.cityId, zoneId: ward.zoneId, wardId: ward.id, beforePhotoUrls: [] } });
      await logIncidentChange(tx, incident.id, 'OPENED', 'M17_TEST', { source: 'integration' });
      await logIncidentChange(tx, incident.id, 'REVIEWED', 'M17_TEST', { reason: 'fixture' });
      const rows = await tx.$queryRaw<any[]>`SELECT id,incident_id "incidentId",event_type "eventType",actor,previous_hash "previousHash",current_hash "currentHash",metadata,chain_sequence "chainSequence",hash_version "hashVersion" FROM audit_logs WHERE incident_id=${incident.id}::uuid ORDER BY chain_sequence`;
      assert.equal(verifyAuditChain(rows).valid, true);
      await tx.$executeRaw`UPDATE audit_logs SET metadata='{"tampered":true}'::jsonb WHERE incident_id=${incident.id}::uuid AND event_type='REVIEWED'`;
      const tampered = await tx.$queryRaw<any[]>`SELECT id,incident_id "incidentId",event_type "eventType",actor,previous_hash "previousHash",current_hash "currentHash",metadata,chain_sequence "chainSequence",hash_version "hashVersion" FROM audit_logs WHERE incident_id=${incident.id}::uuid ORDER BY chain_sequence`;
      assert.equal(verifyAuditChain(tampered).valid, false);
      throw ROLLBACK;
    });
  } catch (error) {
    if (error !== ROLLBACK) throw error;
  } finally {
    await prisma.$disconnect();
  }
  console.log('M17 audit append, chain verification, and tamper detection integration checks passed');
}

void main();
