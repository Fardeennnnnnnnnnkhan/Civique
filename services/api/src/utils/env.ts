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
    required.push('JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET');
  }
  const missing = required.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}

export function isConfigured(name: string): boolean {
  const value = process.env[name];
  return Boolean(value && !value.startsWith('your_') && !value.includes('change_me'));
}
