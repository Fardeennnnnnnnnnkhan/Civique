-- Restore notification idempotency after the historical timestamped migration.
ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "idempotency_key" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "notifications_idempotency_key_key" ON "notifications"("idempotency_key");
