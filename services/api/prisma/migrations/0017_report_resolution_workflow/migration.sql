-- Civique authenticated report-to-resolution workflow (additive migration).
CREATE TYPE "TimelineVisibility" AS ENUM ('CITIZEN', 'OFFICIAL', 'INTERNAL');
CREATE TYPE "ResolutionDecisionAction" AS ENUM ('CONFIRM', 'DISPUTE');

ALTER TABLE "users" ADD COLUMN "oversight_notifications" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "reports"
  ADD COLUMN "title" TEXT NOT NULL DEFAULT 'Civic issue report',
  ADD COLUMN "consent_version" TEXT NOT NULL DEFAULT 'legacy-v0',
  ADD COLUMN "consented_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN "submission_status" TEXT NOT NULL DEFAULT 'RECEIVED';

ALTER TABLE "ai_analyses"
  ADD COLUMN "request_hash" TEXT,
  ADD COLUMN "latency_ms" INTEGER,
  ADD COLUMN "prompt_tokens" INTEGER,
  ADD COLUMN "completion_tokens" INTEGER,
  ADD COLUMN "failure_code" TEXT,
  ADD COLUMN "completed_at" TIMESTAMP(3);

ALTER TABLE "incidents"
  ADD COLUMN "triage_owner_id" UUID,
  ADD COLUMN "triage_assigned_at" TIMESTAMP(3),
  ADD COLUMN "triage_assignment_reason" TEXT,
  ADD COLUMN "triage_assignment_version" INTEGER,
  ADD COLUMN "unassigned_reason" TEXT,
  ADD COLUMN "citizen_confirmation_deadline" TIMESTAMP(3);
ALTER TABLE "incidents" ADD CONSTRAINT "incidents_triage_owner_id_fkey" FOREIGN KEY ("triage_owner_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "incidents_triage_owner_id_status_idx" ON "incidents"("triage_owner_id", "status");

ALTER TABLE "routing_decisions"
  ADD COLUMN "rule_version" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "fallback_used" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "actor_id" UUID;

ALTER TABLE "resolution_submissions"
  ADD COLUMN "verification_result" JSONB,
  ADD COLUMN "verified_at" TIMESTAMP(3),
  ADD COLUMN "idempotency_key" TEXT;
CREATE UNIQUE INDEX "resolution_submissions_idempotency_key_key" ON "resolution_submissions"("idempotency_key");

CREATE TABLE "triage_assignments" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "incident_id" UUID NOT NULL,
  "officer_id" UUID, "assigned_by_id" UUID, "reason" TEXT NOT NULL,
  "version" INTEGER NOT NULL DEFAULT 1, "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "triage_assignments_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "triage_assignments" ADD CONSTRAINT "triage_assignments_incident_id_fkey" FOREIGN KEY ("incident_id") REFERENCES "incidents"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "triage_assignments" ADD CONSTRAINT "triage_assignments_officer_id_fkey" FOREIGN KEY ("officer_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "triage_assignments" ADD CONSTRAINT "triage_assignments_assigned_by_id_fkey" FOREIGN KEY ("assigned_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "triage_assignments_incident_id_created_at_idx" ON "triage_assignments"("incident_id", "created_at");
CREATE INDEX "triage_assignments_officer_id_created_at_idx" ON "triage_assignments"("officer_id", "created_at");

CREATE SEQUENCE incident_timeline_events_sequence_seq;
CREATE TABLE "incident_timeline_events" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "sequence" BIGINT NOT NULL DEFAULT nextval('incident_timeline_events_sequence_seq'),
  "incident_id" UUID NOT NULL, "report_id" UUID, "event_type" TEXT NOT NULL,
  "lifecycle_state" "IncidentStatus", "actor_role" "UserRole", "actor_label" TEXT,
  "metadata" JSONB, "visibility" "TimelineVisibility" NOT NULL DEFAULT 'CITIZEN',
  "correlation_id" TEXT NOT NULL, "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "incident_timeline_events_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "incident_timeline_events_sequence_key" ON "incident_timeline_events"("sequence");
CREATE UNIQUE INDEX "incident_timeline_events_correlation_id_key" ON "incident_timeline_events"("correlation_id");
CREATE INDEX "incident_timeline_events_incident_id_sequence_idx" ON "incident_timeline_events"("incident_id", "sequence");
ALTER TABLE "incident_timeline_events" ADD CONSTRAINT "incident_timeline_events_incident_id_fkey" FOREIGN KEY ("incident_id") REFERENCES "incidents"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "incident_timeline_events" ADD CONSTRAINT "incident_timeline_events_report_id_fkey" FOREIGN KEY ("report_id") REFERENCES "reports"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "resolution_decisions" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "incident_id" UUID NOT NULL,
  "citizen_id" UUID NOT NULL, "action" "ResolutionDecisionAction" NOT NULL,
  "notes" TEXT, "idempotency_key" TEXT NOT NULL, "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "resolution_decisions_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "resolution_decisions_idempotency_key_key" ON "resolution_decisions"("idempotency_key");
CREATE INDEX "resolution_decisions_incident_id_created_at_idx" ON "resolution_decisions"("incident_id", "created_at");
ALTER TABLE "resolution_decisions" ADD CONSTRAINT "resolution_decisions_incident_id_fkey" FOREIGN KEY ("incident_id") REFERENCES "incidents"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "resolution_decisions" ADD CONSTRAINT "resolution_decisions_citizen_id_fkey" FOREIGN KEY ("citizen_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "service_heartbeats" (
  "service" TEXT NOT NULL, "instance" TEXT NOT NULL, "metadata" JSONB,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "service_heartbeats_pkey" PRIMARY KEY ("service")
);

CREATE TABLE "review_tasks" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "incident_id" UUID NOT NULL,
  "type" TEXT NOT NULL, "status" TEXT NOT NULL DEFAULT 'OPEN', "assigned_to_id" UUID,
  "due_at" TIMESTAMP(3) NOT NULL, "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completed_at" TIMESTAMP(3), CONSTRAINT "review_tasks_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "review_tasks_incident_id_type_key" ON "review_tasks"("incident_id", "type");
CREATE INDEX "review_tasks_status_due_at_idx" ON "review_tasks"("status", "due_at");
ALTER TABLE "review_tasks" ADD CONSTRAINT "review_tasks_incident_id_fkey" FOREIGN KEY ("incident_id") REFERENCES "incidents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "realtime_events" ADD COLUMN "audience_user_id" UUID;
ALTER TABLE "realtime_events" ADD COLUMN "is_public" BOOLEAN NOT NULL DEFAULT false;
CREATE INDEX "realtime_events_audience_user_id_sequence_idx" ON "realtime_events"("audience_user_id", "sequence");
