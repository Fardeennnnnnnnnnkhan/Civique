import { strict as assert } from 'assert';
import { normalizeRequestId } from './requestContext';

assert.equal(normalizeRequestId('req-12345678'), 'req-12345678');
assert.notEqual(normalizeRequestId('short'), 'short');
assert.notEqual(normalizeRequestId('bad request id'), 'bad request id');
assert.match(normalizeRequestId(undefined), /^[0-9a-f-]{36}$/);

console.log('request context tests passed');
