CREATE TABLE "priority_overrides" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "incident_id" UUID NOT NULL,
  "previous_level" "PriorityLevel" NOT NULL,
  "override_level" "PriorityLevel" NOT NULL,
  "reason" TEXT NOT NULL,
  "expires_at" TIMESTAMP(3),
  "revoked_at" TIMESTAMP(3),
  "actor_id" UUID NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "priority_overrides_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "priority_overrides_incident_fkey" FOREIGN KEY ("incident_id") REFERENCES "incidents"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "priority_overrides_actor_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "priority_overrides_incident_active_idx" ON "priority_overrides"("incident_id", "revoked_at", "expires_at");
CREATE TABLE "priority_evaluations" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "incident_id" UUID NOT NULL,
  "policy_version" TEXT NOT NULL,
  "score" INTEGER NOT NULL,
  "level" "PriorityLevel" NOT NULL,
  "signals" JSONB NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "priority_evaluations_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "priority_evaluations_incident_fkey" FOREIGN KEY ("incident_id") REFERENCES "incidents"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "priority_evaluations_incident_created_idx" ON "priority_evaluations"("incident_id", "created_at" DESC);
