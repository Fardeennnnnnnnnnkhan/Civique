import assert from 'node:assert/strict';
import { compareRoutingRules, normalizeCategory, routingScopeError } from './routing';

assert.equal(normalizeCategory(' street-light '), 'STREET_LIGHT');
const city = { id: 'city', cityId: 'city', wardId: null, priority: 100, effectiveFrom: new Date('2026-01-01') };
const ward = { id: 'ward', cityId: 'city', wardId: 'ward-1', priority: 0, effectiveFrom: new Date('2025-01-01') };
assert.ok(compareRoutingRules(ward, city) < 0, 'ward-specific rule must outrank city rule');
assert.equal(routingScopeError({ cityId: 'city', departmentCityId: 'other' }), 'Department is outside the incident city.');
assert.equal(routingScopeError({ cityId: 'city', departmentCityId: 'city' }), null);
console.log('Routing precedence and scope tests passed.');
