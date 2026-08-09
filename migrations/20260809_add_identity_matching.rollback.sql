DROP INDEX IF EXISTS alerts_id_number_hash_idx;
DROP INDEX IF EXISTS estates_id_number_hash_idx;
ALTER TABLE alerts DROP COLUMN IF EXISTS id_number_match_masked;
ALTER TABLE alerts DROP COLUMN IF EXISTS id_number_hash;
ALTER TABLE estates DROP COLUMN IF EXISTS id_number_hash;
