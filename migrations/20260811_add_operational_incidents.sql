CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS operational_incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_type VARCHAR(40) NOT NULL CHECK (incident_type IN ('cron_failure', 'alert_delivery_failure', 'provider_failure')),
  severity VARCHAR(20) NOT NULL DEFAULT 'high',
  status VARCHAR(20) NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'resolved')),
  fingerprint VARCHAR(255) NOT NULL,
  summary VARCHAR(500) NOT NULL,
  detail TEXT NOT NULL,
  alert_id VARCHAR(100),
  estate_id VARCHAR(100),
  notification_id VARCHAR(100),
  ingestion_id VARCHAR(100),
  provider VARCHAR(40),
  provider_attempts JSONB NOT NULL DEFAULT '[]'::jsonb,
  email_status VARCHAR(30),
  occurrence_count INT NOT NULL DEFAULT 1,
  first_occurred_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_occurred_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  resolved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS operational_incidents_fingerprint_status_idx ON operational_incidents(fingerprint, status);
CREATE INDEX IF NOT EXISTS operational_incidents_status_idx ON operational_incidents(status, last_occurred_at DESC);
CREATE INDEX IF NOT EXISTS operational_incidents_alert_idx ON operational_incidents(alert_id, last_occurred_at DESC);
