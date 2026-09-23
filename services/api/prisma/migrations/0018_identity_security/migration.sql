-- M2: official MFA state and durable authentication security events.
CREATE TYPE "SecurityEventType" AS ENUM (
  'LOGIN_SUCCESS',
  'LOGIN_FAILURE',
  'MFA_ENROLLMENT_STARTED',
  'MFA_ENROLLMENT_COMPLETED',
  'MFA_FAILURE',
  'MFA_SUCCESS',
  'REFRESH_REPLAY',
  'LOGOUT',
  'PASSWORD_RESET',
  'ACCOUNT_SUSPENDED'
);

ALTER TABLE "users"
  ADD COLUMN "mfa_secret_encrypted" TEXT,
  ADD COLUMN "mfa_enabled" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "mfa_enrolled_at" TIMESTAMP(3);

CREATE TABLE "security_events" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "user_id" UUID,
  "type" "SecurityEventType" NOT NULL,
  "success" BOOLEAN NOT NULL DEFAULT false,
  "ip_address" TEXT,
  "user_agent" TEXT,
  "request_id" TEXT,
  "metadata" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "security_events_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "security_events_user_id_created_at_idx" ON "security_events"("user_id", "created_at");
CREATE INDEX "security_events_type_created_at_idx" ON "security_events"("type", "created_at");
ALTER TABLE "security_events" ADD CONSTRAINT "security_events_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
