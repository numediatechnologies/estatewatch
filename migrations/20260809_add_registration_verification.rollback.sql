DROP INDEX IF EXISTS registration_verifications_email_idx;
DROP TABLE IF EXISTS registration_verifications;
ALTER TABLE user_profiles DROP COLUMN IF EXISTS phone_verified_at;
ALTER TABLE user_profiles DROP COLUMN IF EXISTS phone_number;
