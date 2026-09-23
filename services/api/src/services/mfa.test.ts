import { strict as assert } from 'assert';
import { createMfaEnrollment, decryptMfaSecret, encryptMfaSecret, getCurrentTotpCode, verifyTotpCode } from './mfa';

process.env.JWT_ACCESS_SECRET = 'mfa-test-access-secret-with-enough-entropy';
const enrollment = createMfaEnrollment('official@example.invalid');
assert.match(enrollment.secret, /^[A-Z2-7]+$/);
assert.match(enrollment.otpauthUrl, /^otpauth:\/\/totp\//);
assert.equal(decryptMfaSecret(encryptMfaSecret(enrollment.secret)), enrollment.secret);

// RFC 6238 SHA-1 vector at Unix time 59; the six-digit suffix is 287082.
assert.equal(verifyTotpCode('GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ', '287082', 59_000), true);
assert.equal(verifyTotpCode('GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ', '000000', 59_000), false);
assert.equal(verifyTotpCode(enrollment.secret, getCurrentTotpCode(enrollment.secret)), true);

console.log('MFA TOTP and secret-protection tests passed');
