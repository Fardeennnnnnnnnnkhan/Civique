import assert from 'assert';
import { isPointInGeometry } from './geofence';

function runTests() {
  console.log('Running geofencing geometry checks (Polygon & MultiPolygon)...');

  // Test Case 1: Standard Polygon boundary (box coordinates)
  const mockPolygon = {
    type: 'Polygon',
    coordinates: [
      [
        [10.0, 20.0],
        [11.0, 20.0],
        [11.0, 21.0],
        [10.0, 21.0],
        [10.0, 20.0],
      ],
    ],
  };

  assert.strictEqual(
    isPointInGeometry(20.5, 10.5, mockPolygon),
    true,
    'Point inside Polygon should resolve to true'
  );

  assert.strictEqual(
    isPointInGeometry(25.0, 15.0, mockPolygon),
    false,
    'Point outside Polygon should resolve to false'
  );

  // Test Case 2: MultiPolygon boundary (two disjoint box coordinates)
  const mockMultiPolygon = {
    type: 'MultiPolygon',
    coordinates: [
      // First box: Longitudes 10.0 to 11.0, Latitudes 20.0 to 21.0
      [
        [
          [10.0, 20.0],
          [11.0, 20.0],
          [11.0, 21.0],
          [10.0, 21.0],
          [10.0, 20.0],
        ],
      ],
      // Second box: Longitudes 30.0 to 31.0, Latitudes 40.0 to 41.0
      [
        [
          [30.0, 40.0],
          [31.0, 40.0],
          [31.0, 41.0],
          [30.0, 41.0],
          [30.0, 40.0],
        ],
      ],
    ],
  };

  // Test point in first polygon
  assert.strictEqual(
    isPointInGeometry(20.5, 10.5, mockMultiPolygon),
    true,
    'Point inside first MultiPolygon ring should resolve to true'
  );

  // Test point in second polygon
  assert.strictEqual(
    isPointInGeometry(40.5, 30.5, mockMultiPolygon),
    true,
    'Point inside second MultiPolygon ring should resolve to true'
  );

  // Test point completely outside
  assert.strictEqual(
    isPointInGeometry(30.0, 20.0, mockMultiPolygon),
    false,
    'Point outside both MultiPolygon rings should resolve to false'
  );

  console.log('All geofencing boundary geometry tests passed successfully! ✅');
}

runTests();
