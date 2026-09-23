import assert from 'node:assert/strict';
import { calculateCivicHealth } from './civicHealthPolicy';
assert.equal(calculateCivicHealth({ eligible: 4, unresolved: 1, severityRisk: 20, slaCompliance: 80, recurrence: 10, resolutionQuality: 80, citizenConfirmation: 75 }).score, null);
const result = calculateCivicHealth({ eligible: 20, unresolved: 2, severityRisk: 20, slaCompliance: 90, recurrence: 10, resolutionQuality: 80, citizenConfirmation: 75 });
assert.equal(result.suppressed, false);
assert.equal(result.confidence, 1);
assert.ok((result.score || 0) > 70);
console.log('Civic health scoring and sparse-data policy tests passed.');
