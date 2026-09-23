import assert from 'node:assert/strict';
import { calculatePriority } from './priorityEngine';

const critical = calculatePriority({ category: 'SEWAGE', severity: 'CRITICAL', hazard: true, sensitiveLocation: true, reportCount: 8, corroboratedReports: 5, slaHoursRemaining: 0 });
assert.equal(critical.level, 'CRITICAL');
assert.ok(critical.signals.some((signal) => signal.key === 'PUBLIC_HAZARD'));
const ordinary = calculatePriority({ category: 'GARBAGE', severity: 'LOW' });
assert.equal(ordinary.level, 'LOW');
const same = calculatePriority({ category: 'POTHOLE', severity: 'HIGH', reportCount: 2, corroboratedReports: 1 });
assert.deepEqual(same, calculatePriority({ category: 'POTHOLE', severity: 'HIGH', reportCount: 2, corroboratedReports: 1 }));
console.log('Priority engine policy tests passed.');
