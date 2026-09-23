import assert from 'node:assert/strict';
import { PrismaClient } from '@prisma/client';
import { calculateCivicHealth } from './civicHealthPolicy';
const prisma = new PrismaClient(); const ROLLBACK = new Error('M19_TEST_ROLLBACK');
async function main() {
  try { await prisma.$transaction(async (tx) => {
    const wards = await tx.$queryRaw<Array<{ id: string }>>`SELECT id FROM wards LIMIT 1`; assert.ok(wards[0], 'an imported ward is required');
    const city = await tx.$queryRaw<Array<{ id: string }>>`SELECT city_id id FROM zones WHERE id=(SELECT zone_id FROM wards WHERE id=${wards[0].id}::uuid)`; assert.ok(city[0]);
    const policies = await tx.$queryRaw<Array<{ id: string }>>`INSERT INTO civic_health_policies (city_id,version,weights,active) VALUES (${city[0].id}::uuid,'m19-test','{"unresolvedBurden":0.2,"severityRisk":0.15,"slaCompliance":0.2,"recurrence":0.15,"resolutionQuality":0.2,"citizenConfirmation":0.1}'::jsonb,true) RETURNING id`; assert.ok(policies[0]);
    const result = calculateCivicHealth({ eligible: 5, unresolved: 1, severityRisk: 20, slaCompliance: 80, recurrence: 10, resolutionQuality: 75, citizenConfirmation: 80 }); assert.equal(result.suppressed, false);
    await tx.$executeRaw`INSERT INTO civic_health_snapshots (city_id,ward_id,policy_id,snapshot_date,source_watermark,score,confidence,completeness,suppressed,components,explanation) VALUES (${city[0].id}::uuid,${wards[0].id}::uuid,${policies[0].id}::uuid,CURRENT_DATE,NOW(),${result.score},${result.confidence},${result.completeness},${result.suppressed},${JSON.stringify(result.components)}::jsonb,${JSON.stringify(result.explanation)}::jsonb)`;
    await tx.$executeRaw`INSERT INTO civic_health_snapshots (city_id,ward_id,policy_id,snapshot_date,source_watermark,score,confidence,completeness,suppressed,components,explanation) VALUES (${city[0].id}::uuid,${wards[0].id}::uuid,${policies[0].id}::uuid,CURRENT_DATE,NOW(),${result.score},${result.confidence},${result.completeness},${result.suppressed},${JSON.stringify(result.components)}::jsonb,${JSON.stringify(result.explanation)}::jsonb) ON CONFLICT (ward_id,snapshot_date,policy_id) DO UPDATE SET source_watermark=EXCLUDED.source_watermark`;
    const count = await tx.$queryRaw<Array<{ count: bigint }>>`SELECT COUNT(*) count FROM civic_health_snapshots WHERE policy_id=${policies[0].id}::uuid`; assert.equal(Number(count[0].count), 1); throw ROLLBACK;
  }); } catch (error) { if (error !== ROLLBACK) throw error; } finally { await prisma.$disconnect(); } console.log('M19 policy, score, and snapshot integration checks passed');
}
void main();
