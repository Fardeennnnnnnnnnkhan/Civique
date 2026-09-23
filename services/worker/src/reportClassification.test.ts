import assert from 'assert';
import { parseReportClassificationPayload } from './reportClassification';

const id = '123e4567-e89b-42d3-a456-426614174000';
assert.deepStrictEqual(parseReportClassificationPayload({ reportId: id }), { reportId: id });
for (const payload of [null, {}, { reportId: '' }, { reportId: '../evidence' }, { reportId: 42 }]) {
  assert.throws(() => parseReportClassificationPayload(payload), /INVALID_REPORT_CLASSIFICATION_PAYLOAD/);
}
console.log('Report classification worker contract checks passed.');
