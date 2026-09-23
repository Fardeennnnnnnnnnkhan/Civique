export const ACCOUNTABILITY_VERSION = 'm18-v1';
export const MIN_PUBLIC_COHORT = 5;

export type PublicMetric = { value: number | null; suppressed: boolean; reason?: string };

export function privacyMetric(value: number, cohort: number, minCohort = MIN_PUBLIC_COHORT): PublicMetric {
  if (cohort < minCohort) return { value: null, suppressed: true, reason: 'COHORT_TOO_SMALL' };
  return { value, suppressed: false };
}

export function percentageMetric(numerator: number, denominator: number, minCohort = MIN_PUBLIC_COHORT): PublicMetric {
  if (denominator < minCohort) return { value: null, suppressed: true, reason: 'COHORT_TOO_SMALL' };
  return { value: denominator === 0 ? 0 : Math.round((numerator / denominator) * 1000) / 10, suppressed: false };
}

export function averageMetric(total: number, count: number, minCohort = MIN_PUBLIC_COHORT): PublicMetric {
  if (count < minCohort) return { value: null, suppressed: true, reason: 'COHORT_TOO_SMALL' };
  return { value: count === 0 ? 0 : Math.round((total / count) * 10) / 10, suppressed: false };
}

export function accountabilityWindow(days: number | undefined, now = new Date()): { from: Date; to: Date; days: number } {
  const bounded = Number.isFinite(days) ? Math.min(Math.max(Math.trunc(days as number), 7), 365) : 30;
  const from = new Date(now.getTime() - bounded * 24 * 60 * 60 * 1000);
  return { from, to: now, days: bounded };
}
