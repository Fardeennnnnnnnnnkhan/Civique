import crypto from 'crypto';

const TOTP_STEP_SECONDS = 30;
const TOTP_DIGITS = 6;

export function createMfaEnrollment(email: string): { secret: string; otpauthUrl: string } {
  const secret = base32Encode(crypto.randomBytes(20));
  const label = encodeURIComponent(`Civique:${email}`);
  const issuer = encodeURIComponent('Civique');
  return {
    secret,
    otpauthUrl: `otpauth://totp/${label}?secret=${secret}&issuer=${issuer}&algorithm=SHA1&digits=${TOTP_DIGITS}&period=${TOTP_STEP_SECONDS}`,
  };
}

export function verifyTotpCode(secret: string, code: string, nowMs = Date.now()): boolean {
  if (!/^\d{6}$/.test(code)) return false;
  const normalized = code.padStart(TOTP_DIGITS, '0');
  const counter = Math.floor(nowMs / 1000 / TOTP_STEP_SECONDS);
  for (const offset of [-1, 0, 1]) {
    const expected = hotp(secret, counter + offset);
    if (crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(normalized))) return true;
  }
  return false;
}

export function getCurrentTotpCode(secret: string, nowMs = Date.now()): string {
  return hotp(secret, Math.floor(nowMs / 1000 / TOTP_STEP_SECONDS));
}

export function encryptMfaSecret(secret: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(secret, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv.toString('base64url'), tag.toString('base64url'), encrypted.toString('base64url')].join('.');
}

export function decryptMfaSecret(payload: string): string {
  const [ivEncoded, tagEncoded, ciphertextEncoded] = payload.split('.');
  if (!ivEncoded || !tagEncoded || !ciphertextEncoded) throw new Error('INVALID_MFA_SECRET');
  const decipher = crypto.createDecipheriv('aes-256-gcm', encryptionKey(), Buffer.from(ivEncoded, 'base64url'));
  decipher.setAuthTag(Buffer.from(tagEncoded, 'base64url'));
  return Buffer.concat([decipher.update(Buffer.from(ciphertextEncoded, 'base64url')), decipher.final()]).toString('utf8');
}

function hotp(secret: string, counter: number): string {
  const key = base32Decode(secret);
  const counterBuffer = Buffer.alloc(8);
  counterBuffer.writeBigUInt64BE(BigInt(Math.max(0, counter)));
  const digest = crypto.createHmac('sha1', key).update(counterBuffer).digest();
  const offset = digest[digest.length - 1] & 0x0f;
  const value = ((digest[offset] & 0x7f) << 24)
    | ((digest[offset + 1] & 0xff) << 16)
    | ((digest[offset + 2] & 0xff) << 8)
    | (digest[offset + 3] & 0xff);
  return String(value % 10 ** TOTP_DIGITS).padStart(TOTP_DIGITS, '0');
}

function encryptionKey(): Buffer {
  const configured = process.env.MFA_ENCRYPTION_KEY;
  if (configured) {
    const hex = /^[0-9a-f]{64}$/i.test(configured) ? Buffer.from(configured, 'hex') : Buffer.from(configured, 'base64');
    if (hex.length === 32) return hex;
    throw new Error('MFA_ENCRYPTION_KEY must encode exactly 32 bytes');
  }
  const fallback = process.env.JWT_ACCESS_SECRET;
  if (!fallback) throw new Error('MFA_ENCRYPTION_KEY or JWT_ACCESS_SECRET is required');
  return crypto.createHash('sha256').update(fallback).digest();
}

function base32Encode(input: Buffer): string {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let bits = 0;
  let value = 0;
  let output = '';
  for (const byte of input) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      output += alphabet[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) output += alphabet[(value << (5 - bits)) & 31];
  return output;
}

function base32Decode(input: string): Buffer {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let bits = 0;
  let value = 0;
  const output: number[] = [];
  for (const character of input.toUpperCase().replace(/=+$/, '')) {
    const index = alphabet.indexOf(character);
    if (index < 0) throw new Error('INVALID_MFA_SECRET');
    value = (value << 5) | index;
    bits += 5;
    if (bits >= 8) {
      output.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(output);
}
