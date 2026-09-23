CREATE TABLE IF NOT EXISTS "asset_types" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "city_id" UUID NOT NULL, "key" TEXT NOT NULL, "label" TEXT NOT NULL,
  "public_fields" JSONB NOT NULL DEFAULT '[]', "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "asset_types_pkey" PRIMARY KEY ("id"), CONSTRAINT "asset_types_city_fk" FOREIGN KEY ("city_id") REFERENCES cities(id) ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "asset_types_city_key" ON asset_types(city_id,key);
CREATE TABLE IF NOT EXISTS "asset_import_runs" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "city_id" UUID NOT NULL, "source" TEXT NOT NULL, "format" TEXT NOT NULL, "checksum" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PREVIEW', "row_count" INTEGER NOT NULL DEFAULT 0, "error_count" INTEGER NOT NULL DEFAULT 0,
  "errors" JSONB NOT NULL DEFAULT '[]', "created_asset_ids" JSONB NOT NULL DEFAULT '[]', "created_by" UUID NOT NULL, "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "applied_at" TIMESTAMP(3), "rolled_back_at" TIMESTAMP(3),
  CONSTRAINT "asset_import_runs_pkey" PRIMARY KEY ("id"), CONSTRAINT "asset_import_runs_city_fk" FOREIGN KEY ("city_id") REFERENCES cities(id) ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "asset_import_runs_city_checksum" ON asset_import_runs(city_id,checksum);
CREATE TABLE IF NOT EXISTS "civic_assets" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "city_id" UUID NOT NULL, "asset_type_id" UUID NOT NULL, "external_id" TEXT NOT NULL, "name" TEXT NOT NULL,
  "owner_department_id" UUID, "ward_id" UUID, "zone_id" UUID, "latitude" DOUBLE PRECISION, "longitude" DOUBLE PRECISION, "geometry" JSONB,
  "condition" TEXT NOT NULL DEFAULT 'UNKNOWN', "lifecycle_state" TEXT NOT NULL DEFAULT 'ACTIVE', "installed_at" TIMESTAMP(3), "retired_at" TIMESTAMP(3),
  "public" BOOLEAN NOT NULL DEFAULT true, "version" INTEGER NOT NULL DEFAULT 1, "import_run_id" UUID, "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "civic_assets_pkey" PRIMARY KEY ("id"), CONSTRAINT "civic_assets_city_fk" FOREIGN KEY ("city_id") REFERENCES cities(id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "civic_assets_type_fk" FOREIGN KEY ("asset_type_id") REFERENCES asset_types(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "civic_assets_import_fk" FOREIGN KEY ("import_run_id") REFERENCES asset_import_runs(id) ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "civic_assets_city_type_external" ON civic_assets(city_id,asset_type_id,external_id);
CREATE INDEX IF NOT EXISTS "civic_assets_geo_idx" ON civic_assets(city_id,ward_id,asset_type_id);
CREATE TABLE IF NOT EXISTS "asset_incident_links" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "asset_id" UUID NOT NULL, "incident_id" UUID NOT NULL, "confidence" DECIMAL(5,4) NOT NULL DEFAULT 0, "method" TEXT NOT NULL, "confirmed" BOOLEAN NOT NULL DEFAULT false, "created_by" UUID, "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "unlinked_at" TIMESTAMP(3),
  CONSTRAINT "asset_incident_links_pkey" PRIMARY KEY ("id"), CONSTRAINT "asset_link_asset_fk" FOREIGN KEY ("asset_id") REFERENCES civic_assets(id) ON DELETE CASCADE ON UPDATE CASCADE, CONSTRAINT "asset_link_incident_fk" FOREIGN KEY ("incident_id") REFERENCES incidents(id) ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "asset_incident_active_link" ON asset_incident_links(asset_id,incident_id) WHERE unlinked_at IS NULL;
CREATE TABLE IF NOT EXISTS "asset_maintenance_events" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "asset_id" UUID NOT NULL, "event_type" TEXT NOT NULL, "notes" TEXT NOT NULL, "condition_after" TEXT, "performed_by" UUID, "occurred_at" TIMESTAMP(3) NOT NULL, "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "asset_maintenance_events_pkey" PRIMARY KEY ("id"), CONSTRAINT "asset_maintenance_asset_fk" FOREIGN KEY ("asset_id") REFERENCES civic_assets(id) ON DELETE CASCADE ON UPDATE CASCADE
);
