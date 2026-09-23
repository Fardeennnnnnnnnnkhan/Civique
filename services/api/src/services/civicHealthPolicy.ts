export const CIVIC_HEALTH_VERSION = 'm19-v1';
export const DEFAULT_HEALTH_WEIGHTS = { unresolvedBurden: 0.2, severityRisk: 0.15, slaCompliance: 0.2, recurrence: 0.15, resolutionQuality: 0.2, citizenConfirmation: 0.1 } as const;
export type HealthWeights = Record<keyof typeof DEFAULT_HEALTH_WEIGHTS, number>;
export type HealthInput = { eligible: number; unresolved: number; severityRisk: number; slaCompliance: number; recurrence: number; resolutionQuality: number; citizenConfirmation: number };
export type HealthResult = { score: number | null; confidence: number; completeness: number; suppressed: boolean; components: Record<string, number>; explanation: string[] };

const clamp = (value: number) => Math.max(0, Math.min(100, value));
export function calculateCivicHealth(input: HealthInput, weights: HealthWeights = DEFAULT_HEALTH_WEIGHTS): HealthResult {
  const completeness = Math.min(1, input.eligible / 20);
  const confidence = Math.round(completeness * 100) / 100;
  const components = { unresolvedBurden: clamp(100 - (input.unresolved / Math.max(1, input.eligible)) * 100), severityRisk: clamp(100 - input.severityRisk), slaCompliance: clamp(input.slaCompliance), recurrence: clamp(100 - input.recurrence), resolutionQuality: clamp(input.resolutionQuality), citizenConfirmation: clamp(input.citizenConfirmation) };
  if (input.eligible < 5) return { score: null, confidence, completeness, suppressed: true, components, explanation: ['At least five eligible incidents are required before publishing a ward score.'] };
  const score = Math.round((components.unresolvedBurden * weights.unresolvedBurden + components.severityRisk * weights.severityRisk + components.slaCompliance * weights.slaCompliance + components.recurrence * weights.recurrence + components.resolutionQuality * weights.resolutionQuality + components.citizenConfirmation * weights.citizenConfirmation) * 10) / 10;
  return { score, confidence, completeness, suppressed: false, components, explanation: ['Higher scores indicate lower unresolved burden, stronger SLA compliance, better resolution quality, and fewer recurring/severe issues.', `Confidence is based on ${input.eligible} eligible incidents in the source window.`] };
}
