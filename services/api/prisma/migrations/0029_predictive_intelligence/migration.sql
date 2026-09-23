CREATE TABLE IF NOT EXISTS "forecast_runs" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "city_id" UUID NOT NULL, "model_version" TEXT NOT NULL, "algorithm" TEXT NOT NULL,
  "window_start" TIMESTAMP(3) NOT NULL, "window_end" TIMESTAMP(3) NOT NULL, "horizon_days" INTEGER NOT NULL, "status" TEXT NOT NULL DEFAULT 'QUEUED',
  "parameters" JSONB NOT NULL, "artifact_checksum" TEXT, "failure_reason" TEXT, "created_by" UUID, "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "completed_at" TIMESTAMP(3),
  CONSTRAINT "forecast_runs_pkey" PRIMARY KEY ("id"), CONSTRAINT "forecast_runs_city_fk" FOREIGN KEY ("city_id") REFERENCES cities(id) ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "forecast_runs_city_created" ON forecast_runs(city_id,created_at DESC);
ALTER TABLE forecast_runs ADD COLUMN IF NOT EXISTS "attempts" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE forecast_runs ADD COLUMN IF NOT EXISTS "lease_owner" TEXT;
ALTER TABLE forecast_runs ADD COLUMN IF NOT EXISTS "lease_expires_at" TIMESTAMP(3);
ALTER TABLE forecast_runs ADD COLUMN IF NOT EXISTS "drift_status" TEXT NOT NULL DEFAULT 'UNKNOWN';
CREATE TABLE IF NOT EXISTS "forecast_cells" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "run_id" UUID NOT NULL, "ward_id" UUID, "category" TEXT NOT NULL, "forecast_date" DATE NOT NULL,
  "predicted_count" DECIMAL(8,2) NOT NULL, "lower_bound" DECIMAL(8,2) NOT NULL, "upper_bound" DECIMAL(8,2) NOT NULL, "observed_count" INTEGER, "confidence" DECIMAL(4,3) NOT NULL, "features" JSONB NOT NULL,
  CONSTRAINT "forecast_cells_pkey" PRIMARY KEY ("id"), CONSTRAINT "forecast_cells_run_fk" FOREIGN KEY ("run_id") REFERENCES forecast_runs(id) ON DELETE CASCADE, CONSTRAINT "forecast_cells_ward_fk" FOREIGN KEY ("ward_id") REFERENCES wards(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS "forecast_cells_run_date" ON forecast_cells(run_id,forecast_date);
CREATE TABLE IF NOT EXISTS "model_evaluations" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "run_id" UUID NOT NULL, "baseline_name" TEXT NOT NULL, "mae" DECIMAL(8,3) NOT NULL, "mape" DECIMAL(8,3), "held_out_days" INTEGER NOT NULL, "passed" BOOLEAN NOT NULL, "drift_status" TEXT NOT NULL DEFAULT 'UNKNOWN', "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "model_evaluations_pkey" PRIMARY KEY ("id"), CONSTRAINT "model_evaluations_run_fk" FOREIGN KEY ("run_id") REFERENCES forecast_runs(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS "operator_forecast_feedback" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "run_id" UUID NOT NULL, "ward_id" UUID, "feedback" TEXT NOT NULL, "notes" TEXT, "created_by" UUID NOT NULL, "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "operator_forecast_feedback_pkey" PRIMARY KEY ("id"), CONSTRAINT "operator_forecast_feedback_run_fk" FOREIGN KEY ("run_id") REFERENCES forecast_runs(id) ON DELETE CASCADE
);
