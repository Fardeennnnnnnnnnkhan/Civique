import assert from 'node:assert/strict';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const ROLLBACK = new Error('M18_TEST_ROLLBACK');
async function main() {
  try {
    await prisma.$transaction(async (tx) => {
      const definitions = await tx.$queryRaw<Array<{ key: string; version: string }>>`SELECT key,version FROM accountability_metric_definitions WHERE version='m18-v1'`;
      assert.ok(definitions.length >= 4, 'M18 metric definitions must be seeded');
      await tx.$executeRaw`INSERT INTO accountability_daily_snapshots (city_id,snapshot_date,metric_version,payload,source_watermark) VALUES (NULL,CURRENT_DATE,'m18-v1','{"eligible":5}'::jsonb,NOW())`;
      const snapshots = await tx.$queryRaw<Array<{ count: bigint }>>`SELECT COUNT(*) count FROM accountability_daily_snapshots WHERE metric_version='m18-v1' AND snapshot_date=CURRENT_DATE`;
      assert.equal(Number(snapshots[0].count), 1);
      throw ROLLBACK;
    });
  } catch (error) { if (error !== ROLLBACK) throw error; }
  finally { await prisma.$disconnect(); }
  console.log('M18 metric definition and snapshot integration checks passed');
}
void main();
