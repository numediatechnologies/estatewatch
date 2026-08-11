CREATE EXTENSION IF NOT EXISTS pgcrypto;
ALTER TABLE alerts ADD COLUMN IF NOT EXISTS owner_id VARCHAR(255);
ALTER TABLE alerts ADD COLUMN IF NOT EXISTS delivery_state VARCHAR(30) NOT NULL DEFAULT 'paused';
CREATE INDEX IF NOT EXISTS alerts_owner_idx ON alerts(owner_id, created_at DESC);

CREATE TABLE IF NOT EXISTS audit_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type VARCHAR(100) NOT NULL,
  actor_id VARCHAR(255),
  actor_email VARCHAR(255),
  actor_role VARCHAR(30),
  user_id VARCHAR(255),
  channel VARCHAR(50),
  status VARCHAR(50),
  subject_type VARCHAR(100),
  subject_id VARCHAR(255),
  idempotency_key VARCHAR(255) UNIQUE,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS audit_events_user_idx ON audit_events(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS audit_events_type_idx ON audit_events(event_type, created_at DESC);

CREATE INDEX IF NOT EXISTS registration_verifications_phone_idx ON registration_verifications(phone_number, created_at DESC);
