CREATE TABLE "ai_analyses" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "report_id" UUID NOT NULL, "provider" TEXT NOT NULL, "model" TEXT NOT NULL,
  "prompt_version" TEXT NOT NULL, "schema_version" TEXT NOT NULL, "category" TEXT, "confidence" DECIMAL(5,4), "result" JSONB NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDING', "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ai_analyses_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ai_analyses_report_id_created_at_idx" ON "ai_analyses"("report_id", "created_at");
ALTER TABLE "ai_analyses" ADD CONSTRAINT "ai_analyses_report_id_fkey" FOREIGN KEY ("report_id") REFERENCES "reports"("id") ON DELETE CASCADE ON UPDATE CASCADE;
