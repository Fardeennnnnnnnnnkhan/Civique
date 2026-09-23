export const AI_INTAKE_SCHEMA_VERSION = 'm13-v2';
export const DEFAULT_AI_MODEL_REGISTRY = ['qwen/qwen3.8-27b'] as const;

export type AiModelDescriptor = {
  provider: 'groq' | 'local' | 'unavailable';
  model: string;
  schemaVersion: string;
  status: 'ACTIVE' | 'DEGRADED' | 'NOT_CONFIGURED';
  advisoryOnly: true;
};

export type AdaptiveQuestion = {
  id: string;
  prompt: string;
  input: 'BOOLEAN' | 'CHOICE' | 'TEXT';
  options?: string[];
  required: boolean;
  reason: string;
};

export type CivicVisionDecision = 'ACCEPT' | 'REJECT' | 'REVIEW_REQUIRED';
export type CivicRelevanceStatus = 'CIVIC_ISSUE_VISIBLE' | 'NO_CIVIC_ISSUE_VISIBLE' | 'AMBIGUOUS';

export function normalizeAiQuestions(value: unknown, decision: CivicVisionDecision): AdaptiveQuestion[] {
  if (decision === 'REJECT' || !Array.isArray(value)) return [];
  return value.filter((question): question is Record<string, unknown> => Boolean(question && typeof question === 'object'))
    .slice(0, 5)
    .map((question, index) => ({
      id: typeof question.id === 'string' && question.id.trim() ? question.id.trim() : `image_question_${index + 1}`,
      prompt: typeof question.prompt === 'string' ? question.prompt.trim() : '',
      input: (question.input === 'BOOLEAN' || question.input === 'CHOICE' || question.input === 'TEXT' ? question.input : 'TEXT') as AdaptiveQuestion['input'],
      options: Array.isArray(question.options) ? question.options.filter((option): option is string => typeof option === 'string').slice(0, 3) : undefined,
      required: question.required === true,
      reason: typeof question.reason === 'string' ? question.reason.trim() : 'This answer improves civic triage.',
    }))
    .filter((question) => question.prompt.length >= 10 && question.options?.length === 3)
    .map((question) => ({ ...question, input: 'CHOICE' as const }));
}

export function evaluateModelCanary(model: AiModelDescriptor): { passed: boolean; checks: string[] } {
  const checks: string[] = [];
  if (model.advisoryOnly === true) checks.push('ADVISORY_ONLY');
  if (model.schemaVersion === AI_INTAKE_SCHEMA_VERSION) checks.push('SCHEMA_COMPATIBLE');
  if (model.status === 'ACTIVE') checks.push('PROVIDER_CONFIGURED');
  return { passed: checks.includes('ADVISORY_ONLY') && checks.includes('SCHEMA_COMPATIBLE') && model.status !== 'DEGRADED', checks };
}

export function getActiveAiModel(): AiModelDescriptor {
  const apiKey = Boolean(process.env.GROQ_API_KEY);
  const configuredModel = process.env.GROQ_MODEL?.trim() || 'qwen/qwen3.8-27b';
  const allowed = new Set((process.env.CIVIQUE_ALLOWED_AI_MODELS || DEFAULT_AI_MODEL_REGISTRY.join(',')).split(',').map((model) => model.trim()).filter(Boolean));
  const compatible = allowed.has(configuredModel);
  return {
    provider: apiKey ? 'groq' : 'unavailable',
    model: configuredModel,
    schemaVersion: AI_INTAKE_SCHEMA_VERSION,
    status: !apiKey ? 'NOT_CONFIGURED' : compatible ? 'ACTIVE' : 'DEGRADED',
    advisoryOnly: true,
  };
}

export function privacyReview(signals: unknown): { required: boolean; publicVisibility: 'REDACTED_DERIVATIVE_ONLY' | 'PRIVATE_ONLY'; signals: string[] } {
  const values = Array.isArray(signals) ? signals.filter((value): value is string => typeof value === 'string') : [];
  const sensitive = values.filter((value) => /face|person|license|plate|number plate|document|address|phone|identity/i.test(value));
  return { required: sensitive.length > 0, publicVisibility: sensitive.length > 0 ? 'REDACTED_DERIVATIVE_ONLY' : 'REDACTED_DERIVATIVE_ONLY', signals: sensitive.slice(0, 10) };
}

export function buildAdaptiveQuestions(input: {
  category?: string | null;
  severity?: string | null;
  evidenceQuality?: string | null;
  authenticityVerdict?: string | null;
  decision?: CivicVisionDecision | null;
}): AdaptiveQuestion[] {
  const questions: AdaptiveQuestion[] = [];
  if (input.decision === 'REJECT') return questions;
  const category = input.category?.toUpperCase();
  if (category === 'POTHOLE' || category === 'TRAFFIC_SIGN') {
    questions.push({ id: 'traffic_hazard', prompt: 'What is the most visible safety impact of this issue?', input: 'CHOICE', options: ['Blocks or endangers traffic', 'Affects pedestrians or accessibility', 'No immediate danger visible'], required: true, reason: 'Helps the municipal triage team assess public-safety risk.' });
  }
  if (category === 'WATER_LEAK' || category === 'SEWAGE' || category === 'STORM_DRAIN') {
    questions.push({ id: 'duration', prompt: 'How long has the leakage, overflow, or blockage been visible?', input: 'CHOICE', options: ['Less than 6 hours', '6–24 hours', 'More than 24 hours'], required: true, reason: 'Supports response urgency and crew preparation.' });
  }
  if (category === 'GARBAGE') {
    questions.push({ id: 'collection_obstruction', prompt: 'Where is the waste creating the clearest obstruction?', input: 'CHOICE', options: ['Road or vehicle lane', 'Footpath or entrance', 'Drain or waterway'], required: true, reason: 'Identifies access and sanitation impact.' });
  }
  if (input.evidenceQuality?.toUpperCase() === 'LOW' || input.authenticityVerdict?.toUpperCase() === 'INCONCLUSIVE') {
    questions.push({ id: 'evidence_context', prompt: 'Which description best matches what the image shows?', input: 'CHOICE', options: ['A visible public defect', 'A possible defect but partly obstructed', 'The issue is difficult to identify'], required: true, reason: 'AI could not safely infer enough context from the image alone.' });
  }
  if (input.severity?.toUpperCase() === 'HIGH' || input.severity?.toUpperCase() === 'CRITICAL') {
    questions.push({ id: 'affected_people', prompt: 'What level of public activity is affected?', input: 'CHOICE', options: ['One property or small area', 'A street or local stretch', 'A busy public area or many people'], required: false, reason: 'Provides a bounded impact estimate for human triage.' });
  }
  return questions.slice(0, 3);
}

export function normalizeAiConfidence(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 1 ? value : null;
}
