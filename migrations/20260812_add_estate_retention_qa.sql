ALTER TABLE estates ADD COLUMN IF NOT EXISTS canonical_estate_number VARCHAR(100);

CREATE TABLE IF NOT EXISTS estate_quarantine (
  id VARCHAR(100) PRIMARY KEY,
  original_id VARCHAR(100) NOT NULL UNIQUE,
  source_id VARCHAR(100),
  estate_number VARCHAR(100),
  canonical_estate_number VARCHAR(100),
  gazette_date VARCHAR(50),
  reason VARCHAR(100) NOT NULL,
  record JSONB NOT NULL,
  source_url TEXT,
  parser_version VARCHAR(50),
  original_created_at TIMESTAMP WITH TIME ZONE,
  quarantined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS estate_quarantine_canonical_number_idx
  ON estate_quarantine(canonical_estate_number) WHERE canonical_estate_number IS NOT NULL;
CREATE INDEX IF NOT EXISTS estate_quarantine_date_idx ON estate_quarantine(gazette_date);

CREATE TABLE IF NOT EXISTS estate_retention_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cutoff_date DATE NOT NULL,
  quarantined_count INT NOT NULL DEFAULT 0,
  duplicate_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE gazette_issues ADD COLUMN IF NOT EXISTS records_detected INT NOT NULL DEFAULT 0;
ALTER TABLE gazette_issues ADD COLUMN IF NOT EXISTS duplicates_skipped INT NOT NULL DEFAULT 0;
ALTER TABLE gazette_issues ADD COLUMN IF NOT EXISTS missing_required INT NOT NULL DEFAULT 0;
ALTER TABLE gazette_issues ADD COLUMN IF NOT EXISTS records_review INT NOT NULL DEFAULT 0;
ALTER TABLE gazette_issues ADD COLUMN IF NOT EXISTS parser_version VARCHAR(50);
ALTER TABLE gazette_issues ADD COLUMN IF NOT EXISTS quality_status VARCHAR(30) NOT NULL DEFAULT 'pending';
ALTER TABLE gazette_issues ADD COLUMN IF NOT EXISTS quality_detail TEXT;

UPDATE gazette_issues
SET records_detected = COALESCE(records_accepted, 0) + COALESCE(records_rejected, 0),
    parser_version = COALESCE(parser_version, 'j193-v1'),
    quality_status = CASE
      WHEN status = 'failed' THEN 'failed'
      WHEN COALESCE(records_accepted, 0) = 0 OR (COALESCE(records_accepted, 0) + COALESCE(records_rejected, 0) > 0 AND COALESCE(records_rejected, 0)::numeric / (COALESCE(records_accepted, 0) + COALESCE(records_rejected, 0)) > 0.8) THEN 'warning'
      ELSE 'passed'
    END,
    quality_detail = CASE
      WHEN status = 'failed' THEN COALESCE(error, 'Gazette issue processing failed')
      WHEN COALESCE(records_accepted, 0) = 0 OR (COALESCE(records_accepted, 0) + COALESCE(records_rejected, 0) > 0 AND COALESCE(records_rejected, 0)::numeric / (COALESCE(records_accepted, 0) + COALESCE(records_rejected, 0)) > 0.8) THEN 'Zero accepted records or rejection rate above 80%'
      ELSE NULL
    END;

UPDATE estates
SET canonical_estate_number = NULLIF(upper(regexp_replace(trim(estate_number), '\s+', ' ', 'g')), '')
WHERE canonical_estate_number IS NULL;

WITH legacy AS (
  SELECT e.*,
         CASE
           WHEN e.gazette_date !~ '^\d{4}-\d{2}-\d{2}$' THEN 'invalid_gazette_date'
           WHEN e.gazette_date::date < CURRENT_DATE - INTERVAL '4 months' THEN 'outside_four_month_window'
           WHEN e.gazette_date::date > CURRENT_DATE THEN 'future_gazette_date'
           WHEN e.deceased_name IS NULL OR trim(e.deceased_name) = '' THEN 'missing_deceased_name'
           WHEN e.estate_number IS NULL OR trim(e.estate_number) = '' THEN 'missing_estate_number'
           WHEN e.source_url IS NULL OR trim(e.source_url) = '' OR e.parser_version IS NULL OR trim(e.parser_version) = '' THEN 'missing_provenance'
         END AS quarantine_reason
  FROM estates e
), moved AS (
  INSERT INTO estate_quarantine (id, original_id, source_id, estate_number, canonical_estate_number, gazette_date, reason, record, source_url, parser_version, original_created_at)
  SELECT 'quarantine-' || l.id, l.id, l.source_id, l.estate_number, l.canonical_estate_number, l.gazette_date, l.quarantine_reason, to_jsonb(l), l.source_url, l.parser_version, l.created_at
  FROM legacy l
  WHERE l.quarantine_reason IS NOT NULL
  ON CONFLICT (original_id) DO NOTHING
  RETURNING original_id
)
DELETE FROM estates e USING moved m WHERE e.id = m.original_id;

CREATE UNIQUE INDEX IF NOT EXISTS estates_canonical_estate_number_idx
  ON estates(canonical_estate_number) WHERE canonical_estate_number IS NOT NULL;
