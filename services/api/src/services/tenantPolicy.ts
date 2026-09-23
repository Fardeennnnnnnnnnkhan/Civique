export function validTenantSlug(value: string): boolean { return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value) && value.length <= 63; }
export function boundedRollout(enabled: boolean, value: unknown): number { const numeric = Number(value); if (!Number.isFinite(numeric)) return enabled ? 100 : 0; return Math.min(100, Math.max(0, Math.round(numeric))); }
export function canAccessTenant(actor: { role: string; cityId?: string | null }, cityId: string): boolean { return actor.role === 'SUPER_ADMIN' || actor.cityId === cityId; }
