CREATE TYPE "GeographyImportStatus" AS ENUM ('VALIDATING', 'ACTIVE', 'FAILED');
CREATE TABLE "geography_datasets" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "source" TEXT NOT NULL, "version" TEXT NOT NULL,
  "checksum" TEXT NOT NULL, "effective_date" TIMESTAMP(3), "status" "GeographyImportStatus" NOT NULL DEFAULT 'VALIDATING',
  "imported_at" TIMESTAMP(3), "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "geography_datasets_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "geography_datasets_checksum_key" ON "geography_datasets"("checksum");
CREATE UNIQUE INDEX "geography_datasets_source_version_key" ON "geography_datasets"("source", "version");
ALTER TABLE "wards" ADD COLUMN "source_code" TEXT;
ALTER TABLE "wards" ADD COLUMN "dataset_id" UUID;
CREATE INDEX "wards_zone_id_idx" ON "wards"("zone_id");
CREATE INDEX "wards_dataset_id_idx" ON "wards"("dataset_id");
ALTER TABLE "wards" ADD CONSTRAINT "wards_dataset_id_fkey" FOREIGN KEY ("dataset_id") REFERENCES "geography_datasets"("id") ON DELETE SET NULL ON UPDATE CASCADE;
