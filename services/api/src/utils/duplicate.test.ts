import assert from 'assert';
import { getDistanceInMeters } from './duplicate';

function runTests() {
  console.log('Running extracted duplicate detection helper tests...');

  // Test Case 1: Identical points
  const distZero = getDistanceInMeters(22.7196, 75.8577, 22.7196, 75.8577);
  assert.ok(Math.abs(distZero) < 0.1, 'Distance between identical points should be 0');

  // Test Case 2: Proximity point under 100 meters
  const distNearby = getDistanceInMeters(22.71468, 75.92018, 22.71438, 75.92018);
  console.log(`Nearby point distance: ${distNearby.toFixed(2)} meters`);
  assert.ok(distNearby > 30 && distNearby < 40, 'Distance should be roughly 33.3 meters');

  // Test Case 3: Point outside the 100-meter threshold
  const distOutsideLimit = getDistanceInMeters(22.71468, 75.92018, 22.71368, 75.92018);
  console.log(`Outside limit point distance: ${distOutsideLimit.toFixed(2)} meters`);
  assert.ok(distOutsideLimit > 100 && distOutsideLimit < 120, 'Distance should be roughly 111 meters');

  console.log('All duplicate detection helper tests passed successfully! ✅');
}

runTests();
