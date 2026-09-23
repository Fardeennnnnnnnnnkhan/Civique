import assert from 'node:assert/strict';
import { baselineEvaluation, boundedHorizon, forecastInterval } from './forecastPolicy';
assert.equal(boundedHorizon(99), 30); assert.equal(boundedHorizon(-1), 1); assert.ok(forecastInterval(4, 28).upper > 4); assert.equal(baselineEvaluation([1, 2], [1, 3]).mae, 0.5); console.log('Forecast policy and baseline tests passed.');
