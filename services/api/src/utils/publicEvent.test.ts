import assert from 'node:assert/strict';
import { toPublicEventPayload } from './publicIncident';

const payload = toPublicEventPayload({ id: 'i', publicTrackingId: 'CIV-1', latitude: 22.719612, longitude: 75.857789, priorityScore: 99, reports: [{ submitterRef: 'secret' }] }, 'i');
assert.equal((payload as { latitude?: number }).latitude, 22.72);
assert.equal('priorityScore' in payload, false);
assert.equal('reports' in payload, false);
console.log('Public realtime event redaction checks passed');
