CREATE TABLE IF NOT EXISTS "civic_health_policies" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "city_id" UUID NOT NULL,
  "version" TEXT NOT NULL,
  "weights" JSONB NOT NULL,
  "minimum_cohort" INTEGER NOT NULL DEFAULT 5,
  "active" BOOLEAN NOT NULL DEFAULT false,
  "created_by" UUID,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "activated_at" TIMESTAMP(3),
  CONSTRAINT "civic_health_policies_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "civic_health_policies_city_fk" FOREIGN KEY ("city_id") REFERENCES "cities"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "civic_health_policies_city_version_key" ON civic_health_policies(city_id,version);
CREATE TABLE IF NOT EXISTS "civic_health_snapshots" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "city_id" UUID NOT NULL,
  "ward_id" UUID NOT NULL,
  "policy_id" UUID NOT NULL,
  "snapshot_date" DATE NOT NULL,
  "source_watermark" TIMESTAMP(3) NOT NULL,
  "score" DECIMAL(5,1),
  "confidence" DECIMAL(4,3) NOT NULL,
  "completeness" DECIMAL(4,3) NOT NULL,
  "suppressed" BOOLEAN NOT NULL DEFAULT false,
  "components" JSONB NOT NULL,
  "explanation" JSONB NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "civic_health_snapshots_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "civic_health_snapshots_city_fk" FOREIGN KEY ("city_id") REFERENCES "cities"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "civic_health_snapshots_ward_fk" FOREIGN KEY ("ward_id") REFERENCES "wards"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "civic_health_snapshots_policy_fk" FOREIGN KEY ("policy_id") REFERENCES civic_health_policies(id) ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "civic_health_snapshots_ward_date_policy_key" ON civic_health_snapshots(ward_id,snapshot_date,policy_id);

-- Provision the pilot policy for already-imported cities so the public route is usable immediately.
INSERT INTO civic_health_policies (city_id,version,weights,minimum_cohort,active,activated_at)
SELECT id,'m19-v1','{"unresolvedBurden":0.2,"severityRisk":0.15,"slaCompliance":0.2,"recurrence":0.15,"resolutionQuality":0.2,"citizenConfirmation":0.1}'::jsonb,5,true,NOW()
FROM cities
ON CONFLICT (city_id,version) DO NOTHING;
