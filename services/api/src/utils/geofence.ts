import { prisma } from '../db';

/**
 * Checks if a coordinate point (latitude, longitude) is inside a single polygon ring boundary.
 * Uses the standard Ray-Casting algorithm.
 * @param latitude The latitude of the point to check.
 * @param longitude The longitude of the point to check.
 * @param polygonCoords An array of [longitude, latitude] coordinates forming the polygon outer boundary ring.
 */
export function isPointInPolygon(
  latitude: number,
  longitude: number,
  polygonCoords: [number, number][]
): boolean {
  let inside = false;
  const x = longitude;
  const y = latitude;

  for (let i = 0, j = polygonCoords.length - 1; i < polygonCoords.length; j = i++) {
    const xi = polygonCoords[i][0]; // Longitude
    const yi = polygonCoords[i][1]; // Latitude
    const xj = polygonCoords[j][0]; // Longitude
    const yj = polygonCoords[j][1]; // Latitude

    const intersect =
      yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }

  return inside;
}

/**
 * Checks if a coordinate point is inside a GeoJSON geometry.
 * Supports both standard "Polygon" and "MultiPolygon" boundary geometry shapes.
 */
export function isPointInGeometry(
  latitude: number,
  longitude: number,
  geometry: { type: string; coordinates: any }
): boolean {
  if (!geometry || !geometry.coordinates) {
    return false;
  }

  if (geometry.type === 'Polygon') {
    // GeoJSON Polygon coordinates format: [ [ [lng, lat], [lng, lat], ... ] ]
    const outerRing = geometry.coordinates[0] as [number, number][];
    return isPointInPolygon(latitude, longitude, outerRing) && !(geometry.coordinates.slice(1) as [number, number][][]).some((ring) => isPointInPolygon(latitude, longitude, ring));
  }

  if (geometry.type === 'MultiPolygon') {
    // GeoJSON MultiPolygon coordinates format: [ [ [ [lng, lat], ... ] ], [ [ [lng, lat], ... ] ] ]
    const polygons = geometry.coordinates as [number, number][][][];
    for (const polygon of polygons) {
      if (polygon[0]) {
        const outerRing = polygon[0];
        if (isPointInPolygon(latitude, longitude, outerRing) && !(polygon.slice(1) as [number, number][][]).some((ring) => isPointInPolygon(latitude, longitude, ring))) {
          return true;
        }
      }
    }
  }

  return false;
}

export function clearGeofenceCache(): void { cachedWards = null; cachedWardsPromise = null; }

let cachedWards: any[] | null = null;
let cachedWardsPromise: Promise<any[]> | null = null;

/**
 * Resolves a coordinate pair (latitude, longitude) to its corresponding Ward, Zone, City, and State.
 * Iterates through all wards in the database and performs a geofence collision test.
 * @returns An object containing the mapped geographic entities, or null if no geofence matched.
 */
export async function resolveLocationToWard(latitude: number, longitude: number) {
  if (!cachedWards) {
    if (!cachedWardsPromise) {
      console.log('[Geofence Cache] Cache miss. Fetching Indore boundaries from Supabase...');
      cachedWardsPromise = prisma.ward.findMany({
        include: {
          zone: {
            include: {
              city: {
                include: {
                  state: true,
                },
              },
            },
          },
        },
      }).then((wards) => {
        cachedWards = wards;
        console.log(`[Geofence Cache] Loaded and cached ${wards.length} ward boundaries.`);
        return wards;
      }).catch((err) => {
        cachedWardsPromise = null;
        throw err;
      });
    }
    await cachedWardsPromise;
  }

  const wards = cachedWards || [];
  for (const ward of wards) {
    try {
      const boundaryObj = ward.boundary as any;
      if (!boundaryObj) {
        continue;
      }

      if (isPointInGeometry(latitude, longitude, boundaryObj)) {
        return {
          wardId: ward.id,
          wardName: ward.name,
          zoneId: ward.zone.id,
          zoneName: ward.zone.name,
          cityId: ward.zone.city.id,
          cityName: ward.zone.city.name,
          stateId: ward.zone.city.state?.id || null,
          stateName: ward.zone.city.state?.name || null,
        };
      }
    } catch (e) {
      console.error(`Error resolving geofence for ward ${ward.name}:`, e);
    }
  }

  return null;
}
