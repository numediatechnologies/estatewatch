ALTER TABLE pipeline ADD COLUMN IF NOT EXISTS owner_id VARCHAR(255);
CREATE INDEX IF NOT EXISTS pipeline_owner_updated_idx ON pipeline(owner_id, updated_at DESC);
