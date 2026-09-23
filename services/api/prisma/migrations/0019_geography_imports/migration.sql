-- M3 geography import metadata is additive; existing ward boundaries remain intact.
CREATE INDEX IF NOT EXISTS "geography_datasets_status_idx" ON "geography_datasets"("status");
CREATE INDEX IF NOT EXISTS "geography_datasets_effective_date_idx" ON "geography_datasets"("effective_date");
