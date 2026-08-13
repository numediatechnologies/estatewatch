CREATE TABLE IF NOT EXISTS ingestion_runs (
  ingestion_id VARCHAR(100) PRIMARY KEY,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP WITH TIME ZONE,
  status VARCHAR(30) NOT NULL,
  error TEXT
);
CREATE INDEX IF NOT EXISTS ingestion_runs_completed_idx ON ingestion_runs(completed_at DESC);

ALTER TABLE notifications ADD COLUMN IF NOT EXISTS last_attempt_at TIMESTAMP WITH TIME ZONE;
CREATE INDEX IF NOT EXISTS notifications_failed_retry_idx
  ON notifications(status, last_attempt_at)
  WHERE status = 'failed' AND channel = 'email';
