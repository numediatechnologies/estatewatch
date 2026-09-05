-- Gazette titles and Master-office text are source data, not bounded labels.
-- Widen them instead of truncating authoritative notice provenance.
ALTER TABLE estates ALTER COLUMN source_id TYPE TEXT;
ALTER TABLE estates ALTER COLUMN district TYPE TEXT;
ALTER TABLE estates ALTER COLUMN master_office TYPE TEXT;
ALTER TABLE estates ALTER COLUMN gazette_number TYPE TEXT;
ALTER TABLE estate_quarantine ALTER COLUMN source_id TYPE TEXT;
