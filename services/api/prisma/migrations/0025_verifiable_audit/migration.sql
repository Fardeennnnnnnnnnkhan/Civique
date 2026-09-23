-- M17: deterministic per-incident audit ordering and hash versioning.
CREATE SEQUENCE IF NOT EXISTS audit_logs_chain_sequence_seq;
ALTER TABLE "audit_logs" ADD COLUMN IF NOT EXISTS "chain_sequence" BIGINT;
ALTER TABLE "audit_logs" ADD COLUMN IF NOT EXISTS "hash_version" TEXT NOT NULL DEFAULT 'legacy-v1';

WITH ordered AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY incident_id ORDER BY timestamp ASC, id ASC) AS position
  FROM audit_logs
)
UPDATE audit_logs a SET chain_sequence = nextval('audit_logs_chain_sequence_seq') FROM ordered o WHERE a.id = o.id AND a.chain_sequence IS NULL;

ALTER TABLE "audit_logs" ALTER COLUMN "chain_sequence" SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "audit_logs_incident_chain_sequence_key" ON "audit_logs"("incident_id", "chain_sequence");
CREATE INDEX IF NOT EXISTS "audit_logs_incident_chain_sequence_idx" ON "audit_logs"("incident_id", "chain_sequence");

CREATE TABLE IF NOT EXISTS "audit_chain_heads" (
  "incident_id" UUID NOT NULL,
  "head_hash" TEXT NOT NULL,
  "head_sequence" BIGINT NOT NULL,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "audit_chain_heads_pkey" PRIMARY KEY ("incident_id"),
  CONSTRAINT "audit_chain_heads_incident_id_fkey" FOREIGN KEY ("incident_id") REFERENCES "incidents"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

INSERT INTO "audit_chain_heads" (incident_id, head_hash, head_sequence)
SELECT DISTINCT ON (incident_id) incident_id, current_hash, chain_sequence
FROM audit_logs
ORDER BY incident_id, chain_sequence DESC
ON CONFLICT (incident_id) DO NOTHING;
