export type GeoFeature = { type: 'Feature'; properties?: Record<string, unknown>; geometry: { type: string; coordinates: unknown } };
export type GeoCollection = { type: 'FeatureCollection'; features: GeoFeature[] };

function coordinateValid(pair: unknown): pair is [number, number] {
  return Array.isArray(pair) && pair.length >= 2 && Number.isFinite(pair[0]) && Number.isFinite(pair[1]) && pair[0] >= -180 && pair[0] <= 180 && pair[1] >= -90 && pair[1] <= 90;
}
function validateRing(ring: unknown, path: string): string[] {
  if (!Array.isArray(ring) || ring.length < 4) return [`${path} must contain at least four coordinates`];
  const errors = ring.flatMap((p, i) => coordinateValid(p) ? [] : [`${path}[${i}] is not a valid [longitude, latitude] pair`]);
  const first = ring[0] as number[]; const last = ring[ring.length - 1] as number[];
  if (coordinateValid(first) && coordinateValid(last) && (first[0] !== last[0] || first[1] !== last[1])) errors.push(`${path} is not closed`);
  return errors;
}
export function validateGeoJSON(input: unknown): { valid: true; collection: GeoCollection } | { valid: false; errors: string[] } {
  const collection = input as GeoCollection;
  if (!collection || collection.type !== 'FeatureCollection' || !Array.isArray(collection.features)) return { valid: false, errors: ['Expected a GeoJSON FeatureCollection'] };
  const errors: string[] = []; const identities = new Set<string>();
  collection.features.forEach((feature, i) => {
    if (!feature || feature.type !== 'Feature' || !feature.geometry) { errors.push(`features[${i}] is missing a Feature geometry`); return; }
    if (!['Polygon', 'MultiPolygon'].includes(feature.geometry.type)) { errors.push(`features[${i}] has unsupported geometry type`); return; }
    const polygons = feature.geometry.type === 'Polygon' ? [feature.geometry.coordinates] : feature.geometry.coordinates as unknown[];
    if (!Array.isArray(polygons)) { errors.push(`features[${i}] has invalid coordinates`); return; }
    polygons.forEach((polygon, p) => { if (!Array.isArray(polygon)) errors.push(`features[${i}].geometry polygon ${p} is invalid`); else (polygon as unknown[]).forEach((ring, r) => errors.push(...validateRing(ring, `features[${i}].geometry polygon ${p} ring ${r}`))); });
    const props = feature.properties || {}; const identity = String(props.ward_lgd_code || props.sourcewardcode || props.ward_name || props.name || i);
    if (identities.has(identity)) errors.push(`Duplicate ward identity: ${identity}`); identities.add(identity);
  });
  return errors.length ? { valid: false, errors } : { valid: true, collection };
}
