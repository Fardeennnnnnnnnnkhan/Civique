CREATE TABLE IF NOT EXISTS "integration_adapters" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "city_id" UUID NOT NULL, "provider" TEXT NOT NULL, "channel" TEXT NOT NULL, "status" TEXT NOT NULL DEFAULT 'DISABLED', "config" JSONB NOT NULL DEFAULT '{}'::jsonb, "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "integration_adapters_pkey" PRIMARY KEY ("id"), CONSTRAINT "integration_adapters_city_fk" FOREIGN KEY ("city_id") REFERENCES cities(id) ON DELETE CASCADE ON UPDATE CASCADE, CONSTRAINT "integration_adapters_unique" UNIQUE (city_id,provider,channel)
);
CREATE TABLE IF NOT EXISTS "integration_inbox_events" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "provider" TEXT NOT NULL, "event_id" TEXT NOT NULL, "event_type" TEXT NOT NULL, "event_sequence" BIGINT, "payload_hash" TEXT NOT NULL, "payload" JSONB NOT NULL, "status" TEXT NOT NULL DEFAULT 'RECEIVED', "received_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "processed_at" TIMESTAMP(3), "error" TEXT,
  CONSTRAINT "integration_inbox_events_pkey" PRIMARY KEY ("id"), CONSTRAINT "integration_inbox_events_unique" UNIQUE (provider,event_id)
);
CREATE INDEX IF NOT EXISTS "integration_inbox_order_idx" ON integration_inbox_events(provider,event_sequence DESC);
CREATE INDEX IF NOT EXISTS "integration_inbox_status_idx" ON integration_inbox_events(status,received_at ASC);
CREATE TABLE IF NOT EXISTS "external_references" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "provider" TEXT NOT NULL, "external_id" TEXT NOT NULL, "report_id" UUID, "incident_id" UUID, "external_status" TEXT, "payload_hash" TEXT NOT NULL, "last_seen_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "metadata" JSONB NOT NULL DEFAULT '{}'::jsonb,
  CONSTRAINT "external_references_pkey" PRIMARY KEY ("id"), CONSTRAINT "external_references_unique" UNIQUE (provider,external_id), CONSTRAINT "external_refs_report_fk" FOREIGN KEY ("report_id") REFERENCES reports(id) ON DELETE SET NULL ON UPDATE CASCADE, CONSTRAINT "external_refs_incident_fk" FOREIGN KEY ("incident_id") REFERENCES incidents(id) ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "external_references_incident_idx" ON external_references(incident_id,provider);
CREATE TABLE IF NOT EXISTS "integration_deliveries" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "provider" TEXT NOT NULL, "event_type" TEXT NOT NULL, "aggregate_id" UUID NOT NULL, "idempotency_key" TEXT NOT NULL, "payload" JSONB NOT NULL, "status" TEXT NOT NULL DEFAULT 'PENDING', "attempts" INTEGER NOT NULL DEFAULT 0, "next_attempt_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "response_code" INTEGER, "response_body" TEXT, "external_id" TEXT, "delivered_at" TIMESTAMP(3), "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "integration_deliveries_pkey" PRIMARY KEY ("id"), CONSTRAINT "integration_deliveries_unique" UNIQUE (idempotency_key)
);
CREATE INDEX IF NOT EXISTS "integration_deliveries_queue_idx" ON integration_deliveries(status,next_attempt_at ASC);
CREATE TABLE IF NOT EXISTS "integration_conflicts" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "external_reference_id" UUID NOT NULL, "kind" TEXT NOT NULL, "details" JSONB NOT NULL DEFAULT '{}'::jsonb, "status" TEXT NOT NULL DEFAULT 'OPEN', "resolved_by" UUID, "resolved_at" TIMESTAMP(3), "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "integration_conflicts_pkey" PRIMARY KEY ("id"), CONSTRAINT "integration_conflicts_ref_fk" FOREIGN KEY ("external_reference_id") REFERENCES external_references(id) ON DELETE CASCADE ON UPDATE CASCADE, CONSTRAINT "integration_conflicts_user_fk" FOREIGN KEY ("resolved_by") REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE
);
