import assert from 'node:assert/strict';
import { toPublicIncidentSummary } from './publicIncident';

const dto = toPublicIncidentSummary({ id: 'incident', publicTrackingId: 'CIV-IND-1', category: 'POTHOLE', status: 'OPEN', priority: 'MEDIUM', latitude: 22.7196123, longitude: 75.8577891, ward: { id: 'ward', name: 'Ward 1' }, reportCount: 2, createdAt: new Date() });
assert.equal(dto.latitude, 22.72);
assert.equal(dto.longitude, 75.858);
assert.equal(dto.locationPrecision, 'APPROXIMATE_100M');
assert.equal('priorityScore' in dto, false);
console.log('Public incident privacy DTO checks passed');
