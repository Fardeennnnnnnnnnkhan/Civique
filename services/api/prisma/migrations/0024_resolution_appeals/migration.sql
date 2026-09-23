CREATE TABLE "resolution_appeals" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "incident_id" UUID NOT NULL,
  "citizen_id" UUID NOT NULL,
  "reason" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'OPEN',
  "reviewed_by" UUID,
  "review_reason" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "reviewed_at" TIMESTAMP(3),
  CONSTRAINT "resolution_appeals_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "resolution_appeals_incident_fkey" FOREIGN KEY ("incident_id") REFERENCES "incidents"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "resolution_appeals_citizen_fkey" FOREIGN KEY ("citizen_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "resolution_appeals_reviewer_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX "resolution_appeals_incident_status_idx" ON "resolution_appeals"("incident_id", "status", "created_at" DESC);
