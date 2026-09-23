import assert from 'assert';
import { canonicalChecksum, validateWardInputs } from './geographyImport';

const fixture = [{ sourceCode: 'IND-01', name: 'Ward 1', zoneName: 'Zone 1', boundary: { type: 'Polygon' as const, coordinates: [[[75, 22], [76, 22], [76, 23], [75, 22]]] } }];
assert.strictEqual(canonicalChecksum(fixture), canonicalChecksum(fixture), 'same input must hash deterministically');
assert.deepStrictEqual(validateWardInputs(fixture), []);
assert.ok(validateWardInputs([{ ...fixture[0], sourceCode: '' }]).length > 0);
assert.ok(validateWardInputs([{ ...fixture[0], boundary: { type: 'LineString', coordinates: [] } as never }]).length > 0);
console.log('Geography import validation checks passed');
