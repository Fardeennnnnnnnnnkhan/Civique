import assert from 'node:assert/strict';
import { clusterPublicIncidents } from './publicIncident';

const clusters = clusterPublicIncidents([
  { latitude: 22.71961, longitude: 75.85771, category: 'POTHOLE', status: 'OPEN' },
  { latitude: 22.71962, longitude: 75.85772, category: 'GARBAGE', status: 'RESOLVED' },
  { latitude: 22.7301, longitude: 75.8701, category: 'POTHOLE', status: 'OPEN' },
]);
assert.equal(clusters.length, 2);
assert.equal(clusters.find((cluster) => cluster.count === 2)?.categories.length, 2);
console.log('Public incident clustering checks passed');
