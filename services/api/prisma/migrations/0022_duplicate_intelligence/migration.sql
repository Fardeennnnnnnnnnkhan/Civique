CREATE TABLE "duplicate_candidates" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "report_id" UUID NOT NULL,
  "incident_id" UUID NOT NULL,
  "score" DECIMAL(6,5) NOT NULL,
  "band" TEXT NOT NULL,
  "signals" JSONB NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "reviewed_by" UUID,
  "review_reason" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "reviewed_at" TIMESTAMP(3),
  CONSTRAINT "duplicate_candidates_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "duplicate_candidates_report_id_fkey" FOREIGN KEY ("report_id") REFERENCES "reports"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "duplicate_candidates_incident_id_fkey" FOREIGN KEY ("incident_id") REFERENCES "incidents"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "duplicate_candidates_reviewer_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "duplicate_candidates_report_incident_key" ON "duplicate_candidates"("report_id", "incident_id");
CREATE INDEX "duplicate_candidates_status_score_idx" ON "duplicate_candidates"("status", "score" DESC);
CREATE TABLE "duplicate_decisions" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "report_id" UUID NOT NULL,
  "source_incident_id" UUID NOT NULL,
  "incident_id" UUID NOT NULL,
  "decision" TEXT NOT NULL,
  "reason" TEXT NOT NULL,
  "actor_id" UUID NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "duplicate_decisions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "duplicate_decisions_report_id_fkey" FOREIGN KEY ("report_id") REFERENCES "reports"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "duplicate_decisions_source_incident_id_fkey" FOREIGN KEY ("source_incident_id") REFERENCES "incidents"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "duplicate_decisions_incident_id_fkey" FOREIGN KEY ("incident_id") REFERENCES "incidents"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "duplicate_decisions_actor_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "duplicate_decisions_report_created_idx" ON "duplicate_decisions"("report_id", "created_at" DESC);
