CREATE TABLE "media_assets" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "report_id" UUID NOT NULL, "storage_path" TEXT NOT NULL,
  "sha256" TEXT NOT NULL, "mime_type" TEXT NOT NULL, "byte_size" INTEGER NOT NULL, "width" INTEGER, "height" INTEGER,
  "is_private" BOOLEAN NOT NULL DEFAULT true, "retention_until" TIMESTAMP(3), "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "media_assets_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "media_assets_report_id_idx" ON "media_assets"("report_id");
CREATE INDEX "media_assets_sha256_idx" ON "media_assets"("sha256");
ALTER TABLE "media_assets" ADD CONSTRAINT "media_assets_report_id_fkey" FOREIGN KEY ("report_id") REFERENCES "reports"("id") ON DELETE CASCADE ON UPDATE CASCADE;
