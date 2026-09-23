import assert from 'node:assert/strict';
import { buildAdaptiveQuestions, evaluateModelCanary, getActiveAiModel, normalizeAiConfidence, privacyReview } from './aiIntakePolicy';

assert.equal(normalizeAiConfidence(0.8), 0.8);
assert.equal(normalizeAiConfidence(1.2), null);
assert.equal(normalizeAiConfidence('0.8'), null);
assert.ok(buildAdaptiveQuestions({ category: 'POTHOLE' }).some((question) => question.id === 'traffic_hazard'));
assert.ok(buildAdaptiveQuestions({ category: 'WATER_LEAK', evidenceQuality: 'LOW', authenticityVerdict: 'INCONCLUSIVE' }).length <= 3);
assert.equal(privacyReview(['visible license plate', 'road texture']).publicVisibility, 'REDACTED_DERIVATIVE_ONLY');
assert.equal(privacyReview(['visible license plate']).required, true);
const originalKey = process.env.GROQ_API_KEY;
const originalModel = process.env.GROQ_MODEL;
process.env.GROQ_API_KEY = 'test';
process.env.GROQ_MODEL = 'unsupported-test-model';
assert.equal(getActiveAiModel().status, 'DEGRADED');
assert.equal(evaluateModelCanary(getActiveAiModel()).passed, false);
if (originalKey === undefined) delete process.env.GROQ_API_KEY; else process.env.GROQ_API_KEY = originalKey;
if (originalModel === undefined) delete process.env.GROQ_MODEL; else process.env.GROQ_MODEL = originalModel;
console.log('AI intake policy tests passed.');
