import assert from 'node:assert/strict';
import { integrationSignature, verifyIntegrationSignature } from './integrationSecurity';

const payload = '{"event":"incident.updated"}'; const timestamp = String(Math.floor(Date.now() / 1000)); const signature = integrationSignature(payload, 'test-secret', timestamp);
assert.equal(verifyIntegrationSignature(payload, signature, 'test-secret', timestamp), true);
assert.equal(verifyIntegrationSignature(payload, signature, 'wrong-secret', timestamp), false);
assert.equal(verifyIntegrationSignature(payload, signature, 'test-secret', String(Number(timestamp) - 601)), false);
console.log('Integration signature replay and timing-safe verification tests passed.');
