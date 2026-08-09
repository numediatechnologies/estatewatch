ALTER TABLE estates ADD COLUMN IF NOT EXISTS id_number_hash VARCHAR(64);
ALTER TABLE alerts ADD COLUMN IF NOT EXISTS id_number_hash VARCHAR(64);
ALTER TABLE alerts ADD COLUMN IF NOT EXISTS id_number_match_masked VARCHAR(20);
CREATE INDEX IF NOT EXISTS estates_id_number_hash_idx ON estates (id_number_hash) WHERE id_number_hash IS NOT NULL;
CREATE INDEX IF NOT EXISTS alerts_id_number_hash_idx ON alerts (id_number_hash) WHERE id_number_hash IS NOT NULL;
