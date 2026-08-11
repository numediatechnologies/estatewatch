ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS first_name VARCHAR(120);
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS surname VARCHAR(120);
UPDATE user_profiles
SET first_name = NULLIF(split_part(trim(display_name), ' ', 1), ''),
    surname = NULLIF(regexp_replace(trim(display_name), '^\S+\s*', ''), '')
WHERE (first_name IS NULL OR surname IS NULL) AND display_name IS NOT NULL;
