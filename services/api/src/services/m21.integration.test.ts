import assert from 'node:assert/strict';
import { PrismaClient } from '@prisma/client';
import { FORECAST_VERSION, forecastInterval } from './forecastPolicy';
const prisma = new PrismaClient(); const ROLLBACK = new Error('M21_TEST_ROLLBACK');
async function main() { try { await prisma.$transaction(async (tx) => {
  const city = await tx.$queryRaw<Array<{ id: string }>>`SELECT id FROM cities LIMIT 1`; assert.ok(city[0], 'a city is required'); const interval = forecastInterval(2, 28);
  const run = await tx.$queryRaw<Array<{ id: string }>>`INSERT INTO forecast_runs (city_id,model_version,algorithm,window_start,window_end,horizon_days,status,parameters) VALUES (${city[0].id}::uuid,${FORECAST_VERSION},'seasonal-28-day-baseline',NOW()-INTERVAL '28 days',NOW(),7,'COMPLETED','{"advisory":true}'::jsonb) RETURNING id`; assert.ok(run[0]);
  await tx.$executeRaw`INSERT INTO forecast_cells (run_id,category,forecast_date,predicted_count,lower_bound,upper_bound,confidence,features) VALUES (${run[0].id}::uuid,'POTHOLE',CURRENT_DATE,2,${interval.lower},${interval.upper},${interval.confidence},'{}'::jsonb)`;
  await tx.$executeRaw`INSERT INTO model_evaluations (run_id,baseline_name,mae,held_out_days,passed) VALUES (${run[0].id}::uuid,'baseline',0.5,7,true)`;
  const counts = await tx.$queryRaw<Array<{ cells: bigint; evaluations: bigint }>>`SELECT (SELECT COUNT(*) FROM forecast_cells WHERE run_id=${run[0].id}::uuid) cells,(SELECT COUNT(*) FROM model_evaluations WHERE run_id=${run[0].id}::uuid) evaluations`; assert.equal(Number(counts[0].cells), 1); assert.equal(Number(counts[0].evaluations), 1); throw ROLLBACK;
}); } catch (error) { if (error !== ROLLBACK) throw error; } finally { await prisma.$disconnect(); } console.log('M21 forecast run, cell, and evaluation integration checks passed'); }
void main();
