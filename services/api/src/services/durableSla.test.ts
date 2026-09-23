import assert from 'node:assert/strict';
import { calculateSlaTier } from './durableSla';
const policy = { tier1Hours: 4, tier2Hours: 8, commissionerHours: 24 };
assert.equal(calculateSlaTier(3.99, policy), 0);
assert.equal(calculateSlaTier(4, policy), 1);
assert.equal(calculateSlaTier(8, policy), 2);
assert.equal(calculateSlaTier(24, policy), 3);
console.log('SLA escalation tier tests passed.');
