CREATE TABLE IF NOT EXISTS "accountability_metric_definitions" (
  "key" TEXT NOT NULL,
  "version" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "formula" TEXT NOT NULL,
  "public" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "accountability_metric_definitions_pkey" PRIMARY KEY ("key", "version")
);

INSERT INTO accountability_metric_definitions (key,version,label,description,formula)
VALUES
('resolution_rate','m18-v1','Resolution rate','Resolved public incidents divided by eligible incidents.','resolved / eligible * 100'),
('sla_compliance','m18-v1','SLA compliance','Eligible incidents completed without an SLA breach.','within_sla / eligible * 100'),
('median_resolution_hours','m18-v1','Median resolution time','Median elapsed hours from report creation to resolution.','median(resolved_at - created_at)'),
('report_volume','m18-v1','Report volume','Public incidents created during the selected period.','count(public incidents)')
ON CONFLICT (key,version) DO NOTHING;

CREATE TABLE IF NOT EXISTS "accountability_daily_snapshots" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "city_id" UUID,
  "snapshot_date" DATE NOT NULL,
  "metric_version" TEXT NOT NULL,
  "payload" JSONB NOT NULL,
  "source_watermark" TIMESTAMP(3) NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "accountability_daily_snapshots_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "accountability_daily_snapshots_city_fk" FOREIGN KEY ("city_id") REFERENCES "cities"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "accountability_daily_snapshots_city_date_version_key" ON accountability_daily_snapshots(city_id,snapshot_date,metric_version);
