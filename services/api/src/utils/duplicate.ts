/**
 * Calculates distance in meters between two coordinate pairs using the Haversine formula.
 */
export function getDistanceInMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
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

/**
 * Checks for a nearby active incident in the database of the same category.
 * If one is found within the specified threshold (default 100 meters), returns it.
 * @param tx The database transaction context (or prisma client)
 * @param category The incident category (e.g. 'POTHOLE', 'GARBAGE')
 * @param latitude The report's latitude
 * @param longitude The report's longitude
 * @param thresholdMeters Proximity threshold in meters (defaults to 100)
 */
export async function findDuplicateIncident(
  tx: any,
  category: string,
  latitude: number,
  longitude: number,
  thresholdMeters: number = 100
) {
  // Keep the duplicate lookup bounded. Loading every active incident into the
  // transaction made report submissions progressively slower as the city grew,
  // eventually causing Prisma's interactive transaction to expire (P2028).
  // A small geographic bounding box is a safe pre-filter; the Haversine check
  // below remains the final decision.
  const latDelta = thresholdMeters / 111_320;
  const cosLatitude = Math.max(Math.cos((latitude * Math.PI) / 180), 0.1);
  const lngDelta = thresholdMeters / (111_320 * cosLatitude);

  const activeIncidents = await tx.incident.findMany({
    where: {
      category,
      status: {
        notIn: ['RESOLVED', 'REJECTED'],
      },
      latitude: { gte: latitude - latDelta, lte: latitude + latDelta },
      longitude: { gte: longitude - lngDelta, lte: longitude + lngDelta },
    },
    // The closest candidates are all that can be relevant for a 100m check.
    // Ordering also makes this deterministic when a city has a dense backlog.
    orderBy: { createdAt: 'desc' },
    take: 250,
  });

  // Find if any incident lies within thresholdMeters
  for (const incident of activeIncidents) {
    const distance = getDistanceInMeters(latitude, longitude, incident.latitude, incident.longitude);
    if (distance < thresholdMeters) {
      return incident;
    }
  }

  return null;
}
