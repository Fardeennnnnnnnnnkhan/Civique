import assert from 'assert';

function getDistanceInMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3; // Earth's radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function runTests() {
  console.log('Running proximity matching distance tests...');

  // Test Case 1: Identical points
  const distZero = getDistanceInMeters(22.7196, 75.8577, 22.7196, 75.8577);
  assert.ok(Math.abs(distZero) < 0.1, 'Distance between identical points should be 0');

  // Test Case 2: Proximity point under 100 meters (e.g. roughly 33.3 meters change)
  const distNearby = getDistanceInMeters(22.71468, 75.92018, 22.71438, 75.92018);
  console.log(`Nearby test distance (approx 33.3m): ${distNearby.toFixed(2)} meters`);
  assert.ok(distNearby > 30 && distNearby < 40, 'Distance should be roughly 33.3 meters');

  // Test Case 3: Point outside the 100-meter threshold (approx 111 meters change)
  const distOutsideLimit = getDistanceInMeters(22.71468, 75.92018, 22.71368, 75.92018);
  console.log(`Outside limit test distance (approx 111m): ${distOutsideLimit.toFixed(2)} meters`);
  assert.ok(distOutsideLimit > 100 && distOutsideLimit < 120, 'Distance should be roughly 111 meters');

  console.log('All proximity matching distance tests passed successfully! ✅');
}

runTests();
