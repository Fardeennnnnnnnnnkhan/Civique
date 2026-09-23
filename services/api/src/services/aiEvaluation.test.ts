import assert from 'node:assert/strict';
import { evaluateLabelledIntake } from './aiEvaluation';

const result = evaluateLabelledIntake([
  { id: 'pothole-clear', expectedCategory: 'POTHOLE', predictedCategory: 'POTHOLE', confidence: 0.92, expectedReview: 'AUTO_ACCEPT' },
  { id: 'waste-clear', expectedCategory: 'GARBAGE', predictedCategory: 'GARBAGE', confidence: 0.88, expectedReview: 'AUTO_ACCEPT' },
  { id: 'ambiguous', expectedCategory: 'OTHER', predictedCategory: 'OTHER', confidence: null, expectedReview: 'HUMAN_REVIEW' },
  { id: 'suspicious', expectedCategory: 'POTHOLE', predictedCategory: 'POTHOLE', confidence: 0.41, expectedReview: 'HUMAN_REVIEW' },
  { id: 'leak', expectedCategory: 'WATER_LEAK', predictedCategory: 'WATER_LEAK', confidence: 0.79, expectedReview: 'AUTO_ACCEPT' },
]);
assert.equal(result.passed, true);
assert.equal(result.categoryAccuracy, 1);
console.log('Labelled AI intake evaluation checks passed.');
