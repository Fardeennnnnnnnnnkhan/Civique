import { getDistanceInMeters } from '../utils/duplicate';

export type DuplicateSignal = { key: string; value: number; explanation: string };
export type DuplicateScore = { score: number; band: 'LINK' | 'REVIEW' | 'SEPARATE'; signals: DuplicateSignal[] };

export function scoreDuplicateCandidate(input: { categoryMatch: boolean; distanceMeters: number; maxDistanceMeters?: number; visualSimilarity?: number | null; temporalDays?: number | null; hashMatch?: boolean }): DuplicateScore {
  const maxDistance = input.maxDistanceMeters ?? 250;
  const distanceScore = Math.max(0, 1 - input.distanceMeters / maxDistance);
  const signals: DuplicateSignal[] = [{ key: 'DISTANCE', value: distanceScore, explanation: `${Math.round(input.distanceMeters)}m from the existing incident` }];
  if (input.categoryMatch) signals.push({ key: 'CATEGORY', value: 1, explanation: 'Same civic taxonomy category' });
  if (input.visualSimilarity != null) signals.push({ key: 'VISUAL', value: Math.max(0, Math.min(1, input.visualSimilarity)), explanation: 'Visual evidence similarity signal' });
  if (input.temporalDays != null) signals.push({ key: 'TIME', value: Math.max(0, 1 - input.temporalDays / 30), explanation: `${Math.round(input.temporalDays)} days apart` });
  if (input.hashMatch) signals.push({ key: 'HASH', value: 1, explanation: 'Evidence content hash matches' });
  const weights = { DISTANCE: 0.35, CATEGORY: 0.25, VISUAL: 0.2, TIME: 0.1, HASH: 0.1 } as const;
  const score = signals.reduce((total, signal) => total + signal.value * (weights[signal.key as keyof typeof weights] || 0), 0);
  const band = input.hashMatch || score >= 0.82 ? 'LINK' : score >= 0.55 ? 'REVIEW' : 'SEPARATE';
  return { score: Number(score.toFixed(4)), band, signals };
}

export function duplicateDistanceMeters(a: { latitude: number; longitude: number }, b: { latitude: number; longitude: number }) { return getDistanceInMeters(a.latitude, a.longitude, b.latitude, b.longitude); }
