-- M10: retain private original and normalized resolution evidence provenance.
ALTER TABLE "resolution_submissions" ADD COLUMN "evidence_original_path" TEXT;
ALTER TABLE "resolution_submissions" ADD COLUMN "evidence_mime_type" TEXT;
ALTER TABLE "resolution_submissions" ADD COLUMN "evidence_width" INTEGER;
ALTER TABLE "resolution_submissions" ADD COLUMN "evidence_height" INTEGER;
