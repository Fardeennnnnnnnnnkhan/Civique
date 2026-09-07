CREATE TABLE "sla_policies" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "name" TEXT NOT NULL, "city_id" UUID, "version" INTEGER NOT NULL DEFAULT 1,
  "timezone" TEXT NOT NULL DEFAULT 'Asia/Kolkata', "warning_hours" INTEGER NOT NULL DEFAULT 4, "tier1_hours" INTEGER NOT NULL DEFAULT 24,
  "tier2_hours" INTEGER NOT NULL DEFAULT 48, "commissioner_hours" INTEGER NOT NULL DEFAULT 72, "working_calendar" JSONB,
  "active" BOOLEAN NOT NULL DEFAULT true, "effective_from" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "effective_until" TIMESTAMP(3), "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "sla_policies_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "sla_policies_city_id_version_key" ON "sla_policies"("city_id", "version");
CREATE INDEX "sla_policies_city_id_active_effective_from_idx" ON "sla_policies"("city_id", "active", "effective_from");
CREATE TABLE "incident_sla" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "incident_id" UUID NOT NULL, "policy_id" UUID NOT NULL, "state" TEXT NOT NULL DEFAULT 'ACTIVE',
  "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "deadline_at" TIMESTAMP(3) NOT NULL, "paused_at" TIMESTAMP(3), "paused_reason" TEXT,
  "current_tier" INTEGER NOT NULL DEFAULT 0, "last_evaluated_at" TIMESTAMP(3), "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "incident_sla_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "incident_sla_incident_id_key" ON "incident_sla"("incident_id");
CREATE INDEX "incident_sla_state_deadline_at_idx" ON "incident_sla"("state", "deadline_at");
ALTER TABLE "incident_sla" ADD CONSTRAINT "incident_sla_incident_id_fkey" FOREIGN KEY ("incident_id") REFERENCES "incidents"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "incident_sla" ADD CONSTRAINT "incident_sla_policy_id_fkey" FOREIGN KEY ("policy_id") REFERENCES "sla_policies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE TABLE "sla_escalation_events" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "incident_id" UUID NOT NULL, "incident_sla_id" UUID NOT NULL, "tier" INTEGER NOT NULL,
  "event_type" TEXT NOT NULL, "fired_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "target_user_id" UUID, "metadata" JSONB,
  CONSTRAINT "sla_escalation_events_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "sla_escalation_events_incident_id_tier_key" ON "sla_escalation_events"("incident_id", "tier");
CREATE INDEX "sla_escalation_events_incident_sla_id_tier_idx" ON "sla_escalation_events"("incident_sla_id", "tier");
ALTER TABLE "sla_escalation_events" ADD CONSTRAINT "sla_escalation_events_incident_id_fkey" FOREIGN KEY ("incident_id") REFERENCES "incidents"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "sla_escalation_events" ADD CONSTRAINT "sla_escalation_events_incident_sla_id_fkey" FOREIGN KEY ("incident_sla_id") REFERENCES "incident_sla"("id") ON DELETE CASCADE ON UPDATE CASCADE;
