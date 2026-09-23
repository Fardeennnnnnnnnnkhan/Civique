import { Prisma, PrismaClient } from '@prisma/client';

export const SUPPORTED_CATEGORIES = ['POTHOLE', 'GARBAGE', 'STREETLIGHT', 'WATER_LEAK', 'SEWAGE', 'OTHER', 'OTHERS'] as const;
export type RoutingDb = PrismaClient | Prisma.TransactionClient;

export function normalizeCategory(value: string): string {
  const key = value.trim().toUpperCase().replace(/[^A-Z0-9_]+/g, '_');
  return key === 'OTHERS' ? 'OTHER' : key;
}

export function compareRoutingRules(a: any, b: any): number {
  return (Number(Boolean(b.wardId)) - Number(Boolean(a.wardId))) ||
    (Number(Boolean(b.cityId)) - Number(Boolean(a.cityId))) ||
    ((b.priority ?? 0) - (a.priority ?? 0)) ||
    (new Date(b.effectiveFrom).getTime() - new Date(a.effectiveFrom).getTime()) ||
    String(a.id).localeCompare(String(b.id));
}

export function routingScopeError(input: { cityId?: string | null; departmentCityId?: string | null; wardCityId?: string | null; wardId?: string | null; ruleCityId?: string | null }): string | null {
  if (input.departmentCityId && input.cityId && input.departmentCityId !== input.cityId) return 'Department is outside the incident city.';
  if (input.wardId && input.wardCityId && input.cityId && input.wardCityId !== input.cityId) return 'Ward is outside the incident city.';
  if (input.ruleCityId && input.cityId && input.ruleCityId !== input.cityId) return 'Routing rule is outside the selected city.';
  return null;
}

export async function previewRouting(db: RoutingDb, input: { category: string; cityId?: string | null; wardId?: string | null }) {
  const client = db as any;
  const categoryKey = normalizeCategory(input.category);
  const now = new Date();
  const category = await client.category.findUnique({ where: { key: categoryKey } });
  const scopeClauses: Prisma.RoutingRuleWhereInput[] = [];
  scopeClauses.push(input.cityId ? { OR: [{ cityId: input.cityId }, { cityId: null }] } : { cityId: null });
  scopeClauses.push(input.wardId ? { OR: [{ wardId: input.wardId }, { wardId: null }] } : { wardId: null });
  const rules: any[] = category ? await client.routingRule.findMany({
    where: { categoryId: category.id, active: true, effectiveFrom: { lte: now }, AND: [{ OR: [{ effectiveUntil: null }, { effectiveUntil: { gt: now } }] }, ...scopeClauses] },
    include: { department: true },
  }) : [];
  rules.sort(compareRoutingRules);
  const selected = rules[0];
  return { categoryKey, rule: selected ?? null, department: selected?.department ?? null, reason: selected ? `Matched ${selected.wardId ? 'ward' : selected.cityId ? 'city' : 'global'} rule ${selected.id} (priority ${selected.priority}).` : 'No active routing rule matched; manual review required.' };
}

export async function recordRoutingDecision(
  db: RoutingDb,
  input: { incidentId: string; category: string; cityId?: string | null; wardId?: string | null; previousDepartmentId?: string | null },
  resolved?: Awaited<ReturnType<typeof previewRouting>>,
) {
  // Report creation already previews routing to calculate the department. Reuse
  // that result instead of issuing the same category/rule queries again inside
  // the transaction.
  const result = resolved ?? await previewRouting(db, input);
  const decision = await (db as any).routingDecision.create({ data: { incidentId: input.incidentId, ruleId: result.rule?.id ?? null, categoryKey: result.categoryKey, departmentId: result.department?.id ?? null, previousDepartmentId: input.previousDepartmentId ?? null, reason: result.reason } });
  return { ...result, decision };
}
