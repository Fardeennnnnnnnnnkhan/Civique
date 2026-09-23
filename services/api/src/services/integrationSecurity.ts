import crypto from 'crypto';

export function integrationSignature(payload: string, secret: string, timestamp: string): string {
  return `sha256=${crypto.createHmac('sha256', secret).update(`${timestamp}.${payload}`).digest('hex')}`;
}

export function verifyIntegrationSignature(payload: string, signature: string, secret: string, timestamp: string, now = Date.now()): boolean {
  if (!/^\d+$/.test(timestamp) || Math.abs(now - Number(timestamp) * 1000) > 5 * 60 * 1000) return false;
  const expected = integrationSignature(payload, secret, timestamp);
  const left = Buffer.from(expected); const right = Buffer.from(signature || '');
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

export function integrationSecret(provider: string): string | null {
  const key = `CIVIQUE_WEBHOOK_SECRET_${provider.toUpperCase().replace(/[^A-Z0-9]/g, '_')}`;
  return process.env[key] || process.env.CIVIQUE_WEBHOOK_SECRET || null;
}
