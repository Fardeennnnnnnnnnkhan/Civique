import assert from 'node:assert/strict';
import { generalizedCoordinate, redactSocioText } from './socioPolicy';
assert.equal(redactSocioText('Call +91 98765 43210 or a@b.com'), 'Call [contact hidden] or [contact hidden]');
assert.equal(generalizedCoordinate(22.71961), 22.72);
console.log('Socio redaction and coordinate privacy tests passed.');
