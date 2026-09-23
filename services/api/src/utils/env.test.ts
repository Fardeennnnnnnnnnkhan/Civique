import { strict as assert } from 'assert';
import { getAllowedOrigins, isConfigured, validateEnvironment } from './env';

const original = { ...process.env };

function reset(overrides: NodeJS.ProcessEnv) {
  for (const key of Object.keys(process.env)) delete process.env[key];
  Object.assign(process.env, overrides);
}

try {
  reset({ NODE_ENV: 'development', DATABASE_URL: 'postgresql://localhost/civique', CORS_ORIGINS: 'http://localhost:3000, http://127.0.0.1:3000' });
  validateEnvironment();
  assert.deepEqual(getAllowedOrigins(), ['http://localhost:3000', 'http://127.0.0.1:3000']);
  assert.equal(isConfigured('DATABASE_URL'), true);

  reset({ NODE_ENV: 'development', DATABASE_URL: 'not-a-url' });
  assert.throws(validateEnvironment, /valid URL/);

  reset({
    NODE_ENV: 'production',
    DATABASE_URL: 'postgresql://localhost/civique',
    DIRECT_URL: 'postgresql://localhost/civique',
    JWT_ACCESS_SECRET: 'a'.repeat(40),
    JWT_REFRESH_SECRET: 'b'.repeat(40),
    MFA_ENCRYPTION_KEY: 'c'.repeat(64),
    SUPABASE_URL: 'https://example.supabase.co',
    SUPABASE_SERVICE_ROLE_KEY: 'service-role-placeholder-but-configured',
    CORS_ORIGINS: 'https://civique.example',
  });
  validateEnvironment();

  process.env.CORS_ORIGINS = '*';
  assert.throws(validateEnvironment, /wildcard/);

  process.env.CORS_ORIGINS = 'https://civique.example';
  process.env.JWT_REFRESH_SECRET = process.env.JWT_ACCESS_SECRET;
  assert.throws(validateEnvironment, /must be different/);

  process.env.JWT_REFRESH_SECRET = 'b'.repeat(40);
  process.env.MFA_ENCRYPTION_KEY = 'not-a-32-byte-key';
  assert.throws(validateEnvironment, /MFA_ENCRYPTION_KEY/);
} finally {
  reset(original);
}

console.log('environment validation tests passed');
