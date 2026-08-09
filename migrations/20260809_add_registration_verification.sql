ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS phone_number VARCHAR(30);
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS phone_verified_at TIMESTAMP WITH TIME ZONE;
CREATE TABLE IF NOT EXISTS registration_verifications (
  id UUID PRIMARY KEY, email VARCHAR(255) NOT NULL, phone_number VARCHAR(30) NOT NULL,
  code_hash VARCHAR(64) NOT NULL, expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  attempts INT NOT NULL DEFAULT 0, used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS registration_verifications_email_idx ON registration_verifications(email, created_at DESC);
