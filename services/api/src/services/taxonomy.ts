import { PrismaClient, Prisma } from '@prisma/client';

export const CIVIQUE_TAXONOMY: Record<string, string> = {
  POTHOLE: 'Road pothole',
  GARBAGE: 'Solid waste',
  STREETLIGHT: 'Streetlight',
  WATER_LEAK: 'Water leak',
  SEWAGE: 'Sewage overflow',
  TRAFFIC_SIGN: 'Traffic and signs',
  OTHER: 'Other civic hazard',
};

type TaxonomyDb = PrismaClient | Prisma.TransactionClient;

/** Ensures the small, protected citizen taxonomy exists after a database restore. */
export async function ensureTaxonomyCategory(db: TaxonomyDb, key: string) {
  const normalized = key.trim().toUpperCase() === 'OTHERS' ? 'OTHER' : key.trim().toUpperCase();
  const name = CIVIQUE_TAXONOMY[normalized];
  if (!name) return null;
  return db.category.upsert({
    where: { key: normalized },
    update: { active: true, name },
    create: { key: normalized, name, description: `Civique citizen reporting category: ${name}`, active: true },
  });
}
