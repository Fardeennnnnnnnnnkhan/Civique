import assert from 'node:assert/strict';
import { isValidRealtimeRoom, parseRealtimeCursor } from './socket';

assert.equal(parseRealtimeCursor('42'), 42n);
assert.equal(parseRealtimeCursor('not-a-cursor'), 0n);
assert.equal(parseRealtimeCursor('-1', 7n), 7n);
assert.equal(isValidRealtimeRoom('public'), true);
assert.equal(isValidRealtimeRoom('city:123e4567-e89b-12d3-a456-426614174000'), true);
assert.equal(isValidRealtimeRoom('incident:not-an-id'), false);
assert.equal(isValidRealtimeRoom('user:../../private'), false);
console.log('Realtime protocol validation tests passed.');
