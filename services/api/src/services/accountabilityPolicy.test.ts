import assert from 'node:assert/strict';
import { averageMetric, accountabilityWindow, percentageMetric, privacyMetric } from './accountabilityPolicy';
assert.deepEqual(privacyMetric(4, 3), { value: null, suppressed: true, reason: 'COHORT_TOO_SMALL' });
assert.equal(percentageMetric(4, 10).value, 40);
assert.equal(averageMetric(25, 5).value, 5);
assert.equal(accountabilityWindow(999).days, 365);
console.log('Accountability privacy and metric policy tests passed.');
