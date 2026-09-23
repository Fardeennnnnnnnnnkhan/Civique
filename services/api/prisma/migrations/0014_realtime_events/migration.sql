CREATE SEQUENCE IF NOT EXISTS realtime_events_sequence_seq;

CREATE TABLE IF NOT EXISTS realtime_events (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    sequence BIGINT NOT NULL DEFAULT nextval('realtime_events_sequence_seq'),
    event_type TEXT NOT NULL,
    entity_id UUID NOT NULL,
    payload JSONB NOT NULL,
    created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT realtime_events_pkey PRIMARY KEY (id),
    CONSTRAINT realtime_events_sequence_key UNIQUE (sequence)
);

CREATE INDEX IF NOT EXISTS realtime_events_created_at_idx ON realtime_events(created_at);
CREATE INDEX IF NOT EXISTS realtime_events_entity_id_sequence_idx ON realtime_events(entity_id, sequence);
