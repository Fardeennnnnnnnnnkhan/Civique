import assert from 'node:assert/strict';
import { scoreDuplicateCandidate } from './duplicateIntelligence';

const strong = scoreDuplicateCandidate({ categoryMatch: true, distanceMeters: 8, visualSimilarity: 0.9, temporalDays: 1 });
assert.equal(strong.band, 'LINK');
assert.ok(strong.signals.some((signal) => signal.key === 'DISTANCE'));
const review = scoreDuplicateCandidate({ categoryMatch: true, distanceMeters: 80, visualSimilarity: 0.6, temporalDays: 10 });
assert.equal(review.band, 'REVIEW');
const separate = scoreDuplicateCandidate({ categoryMatch: false, distanceMeters: 240, temporalDays: 90 });
assert.equal(separate.band, 'SEPARATE');
console.log('Duplicate intelligence scoring tests passed.');
