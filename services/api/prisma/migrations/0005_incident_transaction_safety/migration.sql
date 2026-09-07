ALTER TABLE "reports" ADD COLUMN "idempotency_key" TEXT;
CREATE UNIQUE INDEX "reports_idempotency_key_key" ON "reports"("idempotency_key");
