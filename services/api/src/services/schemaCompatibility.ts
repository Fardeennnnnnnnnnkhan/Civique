import { prisma } from '../db';

let cachedAt = 0;
let cachedCompatible = false;
export async function isWorkflowSchemaCompatible(): Promise<boolean> {
  if (Date.now() - cachedAt < 30_000) return cachedCompatible;
  const rows = await prisma.$queryRaw<Array<{ count: bigint }>>`
    SELECT COUNT(*) count FROM information_schema.columns WHERE table_schema='public' AND
    (table_name,column_name) IN (('media_assets','kind'),('reports','title'),('incidents','triage_owner_id'),('resolution_submissions','verification_result'))`;
  cachedCompatible = Number(rows[0]?.count || 0) === 4;
  cachedAt = Date.now();
  return cachedCompatible;
}

