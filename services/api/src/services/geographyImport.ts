import crypto from 'crypto';

export type GeographyGeometry = {
  type: 'Polygon' | 'MultiPolygon';
  coordinates: unknown;
};

export type GeographyWardInput = {
  sourceCode: string;
  name: string;
  zoneName: string;
  boundary: GeographyGeometry;
};

export function canonicalChecksum(input: unknown): string {
  return crypto.createHash('sha256').update(JSON.stringify(input)).digest('hex');
}

export function isSupportedGeometry(value: unknown): value is GeographyGeometry {
  if (!value || typeof value !== 'object') return false;
  const geometry = value as { type?: unknown; coordinates?: unknown };
  return (geometry.type === 'Polygon' || geometry.type === 'MultiPolygon') && Array.isArray(geometry.coordinates);
}

export function validateWardInputs(wards: GeographyWardInput[]): string[] {
  const errors: string[] = [];
  const sourceCodes = new Set<string>();
  for (const [index, ward] of wards.entries()) {
    if (!ward || typeof ward.name !== 'string' || ward.name.trim().length < 2) errors.push(`wards[${index}].name is required`);
    if (!ward || typeof ward.zoneName !== 'string' || ward.zoneName.trim().length < 2) errors.push(`wards[${index}].zoneName is required`);
    if (!ward || typeof ward.sourceCode !== 'string' || ward.sourceCode.trim().length < 1) errors.push(`wards[${index}].sourceCode is required`);
    if (ward?.sourceCode && sourceCodes.has(ward.sourceCode)) errors.push(`wards[${index}].sourceCode is duplicated`);
    if (ward?.sourceCode) sourceCodes.add(ward.sourceCode);
    if (!isSupportedGeometry(ward?.boundary)) errors.push(`wards[${index}].boundary must be a Polygon or MultiPolygon`);
  }
  return errors;
}
