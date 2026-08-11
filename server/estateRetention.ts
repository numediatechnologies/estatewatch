import { query } from './db.js';

export const PARSER_VERSION = 'j193-v1';
export const liveEstatePredicate = (alias = 'e') => `
  ${alias}.gazette_date ~ '^\\d{4}-\\d{2}-\\d{2}$'
  AND CASE WHEN ${alias}.gazette_date ~ '^\\d{4}-\\d{2}-\\d{2}$' THEN ${alias}.gazette_date::date END >= CURRENT_DATE - INTERVAL '4 months'
  AND CASE WHEN ${alias}.gazette_date ~ '^\\d{4}-\\d{2}-\\d{2}$' THEN ${alias}.gazette_date::date END <= CURRENT_DATE
  AND ${alias}.deceased_name IS NOT NULL AND trim(${alias}.deceased_name) <> ''
  AND ${alias}.estate_number IS NOT NULL AND trim(${alias}.estate_number) <> ''
  AND ${alias}.source_url IS NOT NULL AND trim(${alias}.source_url) <> ''
  AND ${alias}.parser_version IS NOT NULL AND trim(${alias}.parser_version) <> ''`;

export function canonicalEstateNumber(value: string | null | undefined): string | null {
  const normalized = String(value || '').trim().replace(/\s+/g, ' ').toUpperCase();
  return normalized || null;
}

export function isWithinLiveWindow(gazetteDate: string, now = new Date()): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(gazetteDate)) return false;
  const date = new Date(`${gazetteDate}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) return false;
  const cutoff = new Date(now);
  cutoff.setUTCMonth(cutoff.getUTCMonth() - 4);
  const today = new Date(now);
  const todayDate = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
  return date >= new Date(Date.UTC(cutoff.getUTCFullYear(), cutoff.getUTCMonth(), cutoff.getUTCDate())) && date <= todayDate;
}

export interface RetentionResult { cutoffDate: string; quarantinedCount: number; duplicateCount: number; }

export async function runRetentionMaintenance(): Promise<RetentionResult> {
  const moved = await query(`
    WITH candidates AS (
      SELECT e.*,
        CASE
          WHEN e.gazette_date !~ '^\\d{4}-\\d{2}-\\d{2}$' THEN 'invalid_gazette_date'
          WHEN e.gazette_date::date < CURRENT_DATE - INTERVAL '4 months' THEN 'outside_four_month_window'
          WHEN e.gazette_date::date > CURRENT_DATE THEN 'future_gazette_date'
          WHEN e.deceased_name IS NULL OR trim(e.deceased_name) = '' THEN 'missing_deceased_name'
          WHEN e.estate_number IS NULL OR trim(e.estate_number) = '' THEN 'missing_estate_number'
          WHEN e.source_url IS NULL OR trim(e.source_url) = '' OR e.parser_version IS NULL OR trim(e.parser_version) = '' THEN 'missing_provenance'
        END AS quarantine_reason
      FROM estates e
    ), archived AS (
      INSERT INTO estate_quarantine (id, original_id, source_id, estate_number, canonical_estate_number, gazette_date, reason, record, source_url, parser_version, original_created_at)
      SELECT 'quarantine-' || c.id, c.id, c.source_id, c.estate_number,
        NULLIF(upper(regexp_replace(trim(c.estate_number), '\\s+', ' ', 'g')), ''),
        c.gazette_date, c.quarantine_reason, to_jsonb(c), c.source_url, c.parser_version, c.created_at
      FROM candidates c WHERE c.quarantine_reason IS NOT NULL
      ON CONFLICT (original_id) DO NOTHING
      RETURNING original_id
    ), deleted AS (
      DELETE FROM estates e USING archived a WHERE e.id = a.original_id RETURNING e.id
    )
    SELECT count(*)::int AS quarantined_count FROM deleted`, []);
  const duplicate = await query(`
    SELECT count(*)::int AS duplicate_count FROM (
      SELECT canonical_estate_number FROM estates
      WHERE canonical_estate_number IS NOT NULL
      GROUP BY canonical_estate_number HAVING count(*) > 1
    ) duplicates`);
  const cutoff = await query(`SELECT to_char(CURRENT_DATE - INTERVAL '4 months', 'YYYY-MM-DD') AS cutoff_date`);
  const result = {
    cutoffDate: String(cutoff.rows[0]?.cutoff_date || ''),
    quarantinedCount: Number(moved.rows[0]?.quarantined_count || 0),
    duplicateCount: Number(duplicate.rows[0]?.duplicate_count || 0),
  };
  await query('INSERT INTO estate_retention_runs(cutoff_date,quarantined_count,duplicate_count) VALUES($1,$2,$3)', [result.cutoffDate, result.quarantinedCount, result.duplicateCount]);
  return result;
}

export async function getDataQualityReport() {
  const [summary, quarantine, issues, retention] = await Promise.all([
    query(`SELECT count(*)::int AS live_count, min(gazette_date) AS oldest_live_date, max(gazette_date) AS newest_live_date,
      count(*) FILTER (WHERE gazette_date !~ '^\\d{4}-\\d{2}-\\d{2}$' OR CASE WHEN gazette_date ~ '^\\d{4}-\\d{2}-\\d{2}$' THEN gazette_date::date END < CURRENT_DATE - INTERVAL '4 months' OR CASE WHEN gazette_date ~ '^\\d{4}-\\d{2}-\\d{2}$' THEN gazette_date::date END > CURRENT_DATE)::int AS outside_window,
      count(*) FILTER (WHERE source_url IS NULL OR trim(source_url)='' OR parser_version IS NULL OR trim(parser_version)='')::int AS missing_provenance,
      count(*) FILTER (WHERE deceased_name IS NULL OR trim(deceased_name)='' OR estate_number IS NULL OR trim(estate_number)='')::int AS missing_required
      FROM estates`),
    query(`SELECT count(*)::int AS quarantined_count, count(*) FILTER (WHERE reason='outside_four_month_window')::int AS outside_window,
      count(*) FILTER (WHERE reason='missing_provenance')::int AS missing_provenance FROM estate_quarantine`),
    query(`SELECT id,title,published_date,source_url,status,records_detected,records_accepted,records_rejected,duplicates_skipped,missing_required,records_review,parser_version,quality_status,quality_detail,processed_at
      FROM gazette_issues ORDER BY published_date DESC, created_at DESC LIMIT 100`),
    query(`SELECT id,to_char(cutoff_date,'YYYY-MM-DD') AS cutoff_date,quarantined_count,duplicate_count,created_at FROM estate_retention_runs ORDER BY created_at DESC LIMIT 30`),
  ]);
  const duplicate = await query(`SELECT count(*)::int AS duplicate_count FROM (SELECT canonical_estate_number FROM estates WHERE canonical_estate_number IS NOT NULL GROUP BY canonical_estate_number HAVING count(*)>1) d`);
  return { summary: summary.rows[0], quarantine: quarantine.rows[0], duplicateCount: Number(duplicate.rows[0]?.duplicate_count || 0), issues: issues.rows, retentionRuns: retention.rows };
}
