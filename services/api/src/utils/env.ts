import dotenv from 'dotenv';
import path from 'path';

// Load env from monorepo root immediately during module evaluation
dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });

export function getAllowedOrigins(): string[] {
  return (process.env.CORS_ORIGINS || 'http://localhost:3000')
    .split(',').map((origin) => origin.trim()).filter(Boolean);
}

export function validateEnvironment(): void {
  const required = ['DATABASE_URL'];
  if (process.env.NODE_ENV === 'production') {
    required.push('DIRECT_URL', 'JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET', 'MFA_ENCRYPTION_KEY', 'SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'CORS_ORIGINS');
  }
  const missing = required.filter((key) => !isConfigured(key));
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
  validateUrl('DATABASE_URL', process.env.DATABASE_URL);
  if (process.env.DIRECT_URL) validateUrl('DIRECT_URL', process.env.DIRECT_URL);
  if (process.env.ML_SERVICE_URL) validateUrl('ML_SERVICE_URL', process.env.ML_SERVICE_URL, ['http:', 'https:']);
  if (process.env.SUPABASE_URL) validateUrl('SUPABASE_URL', process.env.SUPABASE_URL, ['https:', ...(process.env.NODE_ENV === 'production' ? [] : ['http:'])]);

  if (process.env.NODE_ENV === 'production') {
    if (getAllowedOrigins().some((origin) => origin === '*')) throw new Error('CORS_ORIGINS cannot contain a wildcard in production');
    for (const origin of getAllowedOrigins()) validateUrl('CORS_ORIGINS', origin, ['https:']);
    validateSecret('JWT_ACCESS_SECRET', process.env.JWT_ACCESS_SECRET);
    validateSecret('JWT_REFRESH_SECRET', process.env.JWT_REFRESH_SECRET);
    validateMfaKey(process.env.MFA_ENCRYPTION_KEY);
    if (process.env.JWT_ACCESS_SECRET === process.env.JWT_REFRESH_SECRET) throw new Error('JWT access and refresh secrets must be different');
  }
}

export function isConfigured(name: string): boolean {
  const value = process.env[name];
  return Boolean(value && !value.startsWith('your_') && !value.includes('change_me') && !value.includes('replace_with'));
}

function validateUrl(name: string, value: string | undefined, protocols: string[] = ['postgres:', 'postgresql:']): void {
  if (!value) return;
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error(`${name} must be a valid URL`);
  }
  if (!protocols.includes(parsed.protocol)) throw new Error(`${name} must use one of: ${protocols.join(', ')}`);
}

function validateSecret(name: string, value: string | undefined): void {
  if (!value || value.length < 32) throw new Error(`${name} must contain at least 32 characters in production`);
}

function validateMfaKey(value: string | undefined): void {
  if (!value) throw new Error('MFA_ENCRYPTION_KEY is required in production');
  const decoded = /^[0-9a-f]{64}$/i.test(value) ? Buffer.from(value, 'hex') : Buffer.from(value, 'base64');
  if (decoded.length !== 32) throw new Error('MFA_ENCRYPTION_KEY must encode exactly 32 bytes');
}
