import { normalizeAiConfidence } from './aiIntakePolicy';

export type LabelledAiCase = { id: string; expectedCategory: string; predictedCategory: string | null; confidence: number | null; expectedReview: 'AUTO_ACCEPT' | 'HUMAN_REVIEW' };
export type AiEvaluation = { total: number; categoryAccuracy: number; confidenceCoverage: number; reviewAccuracy: number; passed: boolean };

/** Deterministic offline gate for a labelled evaluation set. It never calls a provider. */
export function evaluateLabelledIntake(cases: LabelledAiCase[]): AiEvaluation {
  if (!cases.length) return { total: 0, categoryAccuracy: 0, confidenceCoverage: 0, reviewAccuracy: 0, passed: false };
  const categoryCorrect = cases.filter((item) => item.predictedCategory?.toUpperCase() === item.expectedCategory.toUpperCase()).length;
  const confidencePresent = cases.filter((item) => normalizeAiConfidence(item.confidence) !== null).length;
  const reviewCorrect = cases.filter((item) => {
    const confidence = normalizeAiConfidence(item.confidence);
    const predictedReview = confidence === null || confidence < 0.7 ? 'HUMAN_REVIEW' : 'AUTO_ACCEPT';
    return predictedReview === item.expectedReview;
  }).length;
  const categoryAccuracy = categoryCorrect / cases.length;
  const confidenceCoverage = confidencePresent / cases.length;
  const reviewAccuracy = reviewCorrect / cases.length;
  return { total: cases.length, categoryAccuracy, confidenceCoverage, reviewAccuracy, passed: categoryAccuracy >= 0.8 && confidenceCoverage >= 0.8 && reviewAccuracy >= 0.8 };
}
