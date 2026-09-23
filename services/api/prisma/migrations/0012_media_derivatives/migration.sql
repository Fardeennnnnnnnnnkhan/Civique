-- M4: distinguish immutable originals from metadata-free normalized derivatives.
CREATE TYPE "MediaAssetKind" AS ENUM ('ORIGINAL', 'NORMALIZED', 'RESOLUTION_ORIGINAL', 'RESOLUTION_NORMALIZED');
ALTER TABLE "media_assets" ADD COLUMN "kind" "MediaAssetKind" NOT NULL DEFAULT 'ORIGINAL';
ALTER TABLE "media_assets" ADD COLUMN "source_asset_id" UUID;
ALTER TABLE "media_assets" ADD COLUMN "normalized_at" TIMESTAMP(3);
ALTER TABLE "media_assets" ADD CONSTRAINT "media_assets_source_asset_id_fkey" FOREIGN KEY ("source_asset_id") REFERENCES "media_assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "media_assets_report_id_kind_idx" ON "media_assets"("report_id", "kind");
CREATE INDEX "media_assets_source_asset_id_idx" ON "media_assets"("source_asset_id");
