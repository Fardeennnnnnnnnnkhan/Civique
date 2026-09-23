export type PriorityLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type PrioritySignal = { key: string; points: number; explanation: string };
export type PriorityEvaluation = { policyVersion: string; score: number; level: PriorityLevel; signals: PrioritySignal[] };

const POLICY_VERSION = 'm15-v1';
const CATEGORY_WEIGHTS: Record<string, number> = { WATER_LEAK: 18, SEWAGE: 22, STORM_DRAIN: 20, POTHOLE: 12, TRAFFIC_SIGN: 14, STREETLIGHT: 10, GARBAGE: 10, TREE_FALL: 22, ILLEGAL_PARKING: 8, OTHER: 5, OTHERS: 5 };

export function calculatePriority(input: { category: string; severity?: string | null; hazard?: boolean; sensitiveLocation?: boolean; reportCount?: number; corroboratedReports?: number; ageHours?: number; slaHoursRemaining?: number | null; aiConfidence?: number | null; }): PriorityEvaluation {
  const signals: PrioritySignal[] = [];
  const categoryPoints = CATEGORY_WEIGHTS[input.category.toUpperCase()] ?? 5;
  signals.push({ key: 'CATEGORY_RISK', points: categoryPoints, explanation: `${input.category} has a configured civic-risk weight` });
  const severityPoints = ({ LOW: 0, MEDIUM: 8, HIGH: 16, CRITICAL: 25 } as Record<string, number>)[String(input.severity || 'MEDIUM').toUpperCase()] ?? 8;
  signals.push({ key: 'OBSERVED_SEVERITY', points: severityPoints, explanation: `Reported severity contributes ${severityPoints} points` });
  if (input.hazard) signals.push({ key: 'PUBLIC_HAZARD', points: 20, explanation: 'A bounded public-safety hazard was reported' });
  if (input.sensitiveLocation) signals.push({ key: 'SENSITIVE_LOCATION', points: 12, explanation: 'The location is covered by an elevated-protection policy' });
  const corroboration = Math.min(15, Math.max(0, (input.corroboratedReports ?? Math.max(0, (input.reportCount ?? 1) - 1)) * 3));
  if (corroboration > 0) signals.push({ key: 'CORROBORATION', points: corroboration, explanation: `${Math.max(0, input.corroboratedReports ?? 0)} corroborating report(s), bounded at 15 points` });
  const age = Math.min(10, Math.max(0, Math.floor((input.ageHours ?? 0) / 24) * 2));
  if (age > 0) signals.push({ key: 'AGE', points: age, explanation: 'Unresolved age increases urgency gradually' });
  if (input.slaHoursRemaining != null && input.slaHoursRemaining <= 4) signals.push({ key: 'SLA_PROXIMITY', points: input.slaHoursRemaining <= 0 ? 18 : 10, explanation: input.slaHoursRemaining <= 0 ? 'SLA deadline has passed' : 'SLA deadline is within four hours' });
  const aiPoints = input.aiConfidence != null && input.aiConfidence >= 0.8 ? 5 : 0;
  if (aiPoints) signals.push({ key: 'AI_CONFIDENCE_BONUS', points: aiPoints, explanation: 'High-confidence AI evidence is a bounded input, not an authority' });
  const score = Math.min(100, signals.reduce((total, signal) => total + signal.points, 0));
  const level: PriorityLevel = score >= 75 ? 'CRITICAL' : score >= 50 ? 'HIGH' : score >= 25 ? 'MEDIUM' : 'LOW';
  return { policyVersion: POLICY_VERSION, score, level, signals };
}

export function priorityPolicyVersion() { return POLICY_VERSION; }
