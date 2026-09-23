ALTER TABLE notifications ADD COLUMN IF NOT EXISTS idempotency_key TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS notifications_idempotency_key_key ON notifications(idempotency_key);
ALTER TABLE delivery_attempts ADD COLUMN IF NOT EXISTS next_attempt_at TIMESTAMP(3);
ALTER TABLE delivery_attempts ADD COLUMN IF NOT EXISTS provider_message_id TEXT;
