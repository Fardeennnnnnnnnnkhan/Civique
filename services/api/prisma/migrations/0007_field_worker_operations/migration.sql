CREATE TABLE "work_orders" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "incident_id" UUID NOT NULL, "worker_id" UUID NOT NULL,
  "assigned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "started_at" TIMESTAMP(3), "completed_at" TIMESTAMP(3),
  "status" TEXT NOT NULL DEFAULT 'ASSIGNED', "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "work_orders_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "work_orders_incident_id_key" ON "work_orders"("incident_id");
CREATE INDEX "work_orders_worker_id_status_idx" ON "work_orders"("worker_id", "status");
ALTER TABLE "work_orders" ADD CONSTRAINT "work_orders_incident_id_fkey" FOREIGN KEY ("incident_id") REFERENCES "incidents"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "work_orders" ADD CONSTRAINT "work_orders_worker_id_fkey" FOREIGN KEY ("worker_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "assignment_history" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "incident_id" UUID NOT NULL, "worker_id" UUID, "department_id" UUID,
  "action" TEXT NOT NULL, "reason" TEXT, "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "assignment_history_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "assignment_history_incident_id_created_at_idx" ON "assignment_history"("incident_id", "created_at");
ALTER TABLE "assignment_history" ADD CONSTRAINT "assignment_history_incident_id_fkey" FOREIGN KEY ("incident_id") REFERENCES "incidents"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "assignment_history" ADD CONSTRAINT "assignment_history_worker_id_fkey" FOREIGN KEY ("worker_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "resolution_submissions" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "incident_id" UUID NOT NULL, "worker_id" UUID NOT NULL,
  "evidence_path" TEXT NOT NULL, "evidence_sha256" TEXT NOT NULL, "notes" TEXT NOT NULL, "capture_at" TIMESTAMP(3) NOT NULL,
  "latitude" DOUBLE PRECISION, "longitude" DOUBLE PRECISION, "submitted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "verification_status" TEXT NOT NULL DEFAULT 'PENDING', CONSTRAINT "resolution_submissions_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "resolution_submissions_incident_id_submitted_at_idx" ON "resolution_submissions"("incident_id", "submitted_at");
CREATE UNIQUE INDEX "resolution_submissions_incident_id_evidence_sha256_key" ON "resolution_submissions"("incident_id", "evidence_sha256");
ALTER TABLE "resolution_submissions" ADD CONSTRAINT "resolution_submissions_incident_id_fkey" FOREIGN KEY ("incident_id") REFERENCES "incidents"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "resolution_submissions" ADD CONSTRAINT "resolution_submissions_worker_id_fkey" FOREIGN KEY ("worker_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
