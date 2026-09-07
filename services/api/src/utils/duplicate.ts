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
  // Proximity duplicate check: Find active incidents of the same category in the database
  const activeIncidents = await tx.incident.findMany({
    where: {
      category,
      status: {
        notIn: ['RESOLVED', 'REJECTED'],
      },
    },
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
