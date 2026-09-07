import { Prisma, PrismaClient } from '@prisma/client';

export const SUPPORTED_CATEGORIES = ['POTHOLE', 'GARBAGE', 'STREETLIGHT', 'WATER_LEAK', 'SEWAGE', 'OTHER', 'OTHERS'] as const;
export type RoutingDb = PrismaClient | Prisma.TransactionClient;

export function normalizeCategory(value: string): string {
  const key = value.trim().toUpperCase().replace(/[^A-Z0-9_]+/g, '_');
  return key === 'OTHERS' ? 'OTHER' : key;
}

export async function previewRouting(db: RoutingDb, input: { category: string; cityId?: string | null; wardId?: string | null }) {
  const client = db as any;
  const categoryKey = normalizeCategory(input.category);
  const now = new Date();
  const category = await client.category.findUnique({ where: { key: categoryKey } });
  const rules: any[] = category ? await client.routingRule.findMany({
    where: { categoryId: category.id, active: true, effectiveFrom: { lte: now }, OR: [{ effectiveUntil: null }, { effectiveUntil: { gt: now } }], cityId: input.cityId ? { in: [input.cityId, null] } : undefined, wardId: input.wardId ? { in: [input.wardId, null] } : undefined },
    include: { department: true },
  }) : [];
  rules.sort((a, b) => (Number(Boolean(b.wardId)) - Number(Boolean(a.wardId))) || (Number(Boolean(b.cityId)) - Number(Boolean(a.cityId))) || (b.priority - a.priority) || (b.effectiveFrom.getTime() - a.effectiveFrom.getTime()) || a.id.localeCompare(b.id));
  const selected = rules[0];
  return { categoryKey, rule: selected ?? null, department: selected?.department ?? null, reason: selected ? `Matched ${selected.wardId ? 'ward' : selected.cityId ? 'city' : 'global'} rule ${selected.id} (priority ${selected.priority}).` : 'No active routing rule matched; manual review required.' };
}

export async function recordRoutingDecision(db: RoutingDb, input: { incidentId: string; category: string; cityId?: string | null; wardId?: string | null; previousDepartmentId?: string | null }) {
  const result = await previewRouting(db, input);
  const decision = await (db as any).routingDecision.create({ data: { incidentId: input.incidentId, ruleId: result.rule?.id ?? null, categoryKey: result.categoryKey, departmentId: result.department?.id ?? null, previousDepartmentId: input.previousDepartmentId ?? null, reason: result.reason } });
  return { ...result, decision };
}
