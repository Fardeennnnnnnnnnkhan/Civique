ALTER TABLE "notifications" ADD COLUMN "idempotency_key" TEXT;
CREATE UNIQUE INDEX "notifications_idempotency_key_key" ON "notifications"("idempotency_key");
CREATE TABLE "notification_preferences" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "user_id" UUID NOT NULL, "in_app" BOOLEAN NOT NULL DEFAULT true,
  "email" BOOLEAN NOT NULL DEFAULT false, "sms" BOOLEAN NOT NULL DEFAULT false, "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "notification_preferences_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "notification_preferences_user_id_key" ON "notification_preferences"("user_id");
ALTER TABLE "notification_preferences" ADD CONSTRAINT "notification_preferences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE TABLE "delivery_attempts" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "notification_id" UUID NOT NULL, "channel" TEXT NOT NULL, "status" TEXT NOT NULL DEFAULT 'QUEUED',
  "attempt_count" INTEGER NOT NULL DEFAULT 0, "last_error" TEXT, "sent_at" TIMESTAMP(3), "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "delivery_attempts_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "delivery_attempts_notification_id_channel_key" ON "delivery_attempts"("notification_id", "channel");
ALTER TABLE "delivery_attempts" ADD CONSTRAINT "delivery_attempts_notification_id_fkey" FOREIGN KEY ("notification_id") REFERENCES "notifications"("id") ON DELETE CASCADE ON UPDATE CASCADE;
