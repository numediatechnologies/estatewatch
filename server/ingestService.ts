import { query } from './db.js';
import { createFirecrawlClient, discoverGazettes, type GazetteItem } from './firecrawlDiscovery.js';
import { extractPdfText, parseJ193Record, splitJ193Records } from './j193.js';
import { matchEstateToAlerts } from './matching.js';
import { recordMatches } from './notifications.js';
import type { AlertCriteria, DeceasedEstate } from './types.js';
import { emptyIngestResult, type IngestResult } from './ingestTypes.js';
import { randomUUID } from 'node:crypto';
import { canonicalEstateNumber, isWithinLiveWindow, runRetentionMaintenance, PARSER_VERSION } from './estateRetention.js';

async function acquireIngestionLease(runId: string): Promise<boolean> {
  await query(`CREATE TABLE IF NOT EXISTS ingestion_locks (
    name VARCHAR(100) PRIMARY KEY,
    run_id UUID NOT NULL,
    locked_until TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`);
  const lease = await query(`INSERT INTO ingestion_locks(name,run_id,locked_until) VALUES('gazette-ingestion',$1,NOW()+INTERVAL '25 minutes')
    ON CONFLICT(name) DO UPDATE SET run_id=EXCLUDED.run_id,locked_until=EXCLUDED.locked_until
    WHERE ingestion_locks.locked_until < NOW() RETURNING run_id`, [runId]);
  return lease.rowCount === 1;
}

async function releaseIngestionLease(runId: string): Promise<void> {
  await query(`UPDATE ingestion_locks SET locked_until=NOW() WHERE name='gazette-ingestion' AND run_id=$1`, [runId]);
}

export async function runIngestion(options: { sourceUrls?: string[] } = {}): Promise<IngestResult> {
  const result = emptyIngestResult();
  const retention = await runRetentionMaintenance();
  result.stats.retentionQuarantined = retention.quarantinedCount;
  const runId = randomUUID();
  if (!await acquireIngestionLease(runId)) {
    result.status = 'flagged';
    result.errors.push({ url: 'ingestion', error: 'Another Gazette ingestion run is already active' });
    return result;
  }
  await query(`CREATE TABLE IF NOT EXISTS ingestion_runs (
    ingestion_id VARCHAR(100) PRIMARY KEY,
    started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE,
    status VARCHAR(30) NOT NULL,
    error TEXT
  )`);
  await query('INSERT INTO ingestion_runs(ingestion_id,status) VALUES($1,$2) ON CONFLICT(ingestion_id) DO NOTHING', [result.ingestionId, 'running']);
  try {
  let gazettes: GazetteItem[];
  try {
    if (options.sourceUrls?.length) {
      gazettes = options.sourceUrls.map(buildManualGazetteItem);
    } else {
      gazettes = (await discoverGazettes(createFirecrawlClient(), { maxPages: 10 })).gazettes;
    }
  } catch (error: any) {
    result.status = 'flagged'; result.errors.push({ url: 'discovery', error: error.message }); return result;
  }
  result.stats.totalGazettes = gazettes.length;
  for (const gazette of gazettes) await processGazette(gazette, result);
  if (result.errors.length && !result.stats.estatesCreated) result.status = 'flagged';
  await query('UPDATE ingestion_runs SET status=$1,completed_at=NOW(),error=$2 WHERE ingestion_id=$3', [result.status, result.errors.map((entry) => `${entry.url}: ${entry.error}`).join('; ') || null, result.ingestionId]);
  return result;
  } finally {
    if (result.status === 'flagged') await query('UPDATE ingestion_runs SET status=$1,completed_at=NOW(),error=$2 WHERE ingestion_id=$3', ['flagged', result.errors.map((entry) => `${entry.url}: ${entry.error}`).join('; ') || 'Ingestion was flagged', result.ingestionId]).catch((error) => console.error('Could not record ingestion failure:', error));
    await releaseIngestionLease(runId).catch((error) => console.error('Could not release ingestion lease', error));
  }
}

function buildManualGazetteItem(sourceUrl: string): GazetteItem {
  const parsed = new URL(sourceUrl);
  if (parsed.protocol !== 'https:' || parsed.hostname !== 'archive.gazettes.africa' || !parsed.pathname.toLowerCase().endsWith('.pdf')) {
    throw new Error('Manual source URLs must be HTTPS Gazette PDFs hosted on archive.gazettes.africa');
  }
  const dateMatch = parsed.pathname.match(/dated-(\d{4}-\d{2}-\d{2})-no-/i);
  if (!dateMatch) throw new Error(`Could not determine the publication date from ${sourceUrl}`);
  const numberMatch = parsed.pathname.match(/-no-(.+)\.pdf$/i);
  const number = numberMatch?.[1]?.replace(/-/g, ' ') || 'unknown';
  return {
    title: `South Africa Government Gazette Legal Notices A dated ${dateMatch[1]} number ${number}`,
    datePublished: dateMatch[1],
    downloadUrl: sourceUrl,
    page: 1,
  };
}

function gazetteNumber(title: string): string {
  return title.match(/number\s+(.+)$/i)?.[1] || title;
}

async function processGazette(gazette: GazetteItem, result: IngestResult) {
  const issueId = `gazette-${gazette.datePublished}-${gazetteNumber(gazette.title).replace(/\s+/g, '-')}`;
  const existing = await query('SELECT status FROM gazette_issues WHERE source_url=$1', [gazette.downloadUrl]);
  if (existing.rowCount && existing.rows[0].status === 'completed') { result.stats.duplicatesSkipped++; return; }
  await query(`INSERT INTO gazette_issues(id,title,published_date,source_url,status) VALUES($1,$2,$3,$4,'processing') ON CONFLICT(source_url) DO UPDATE SET status='processing',error=NULL`, [issueId, gazette.title, gazette.datePublished, gazette.downloadUrl]);
  let accepted = 0; let rejected = 0;
  let issueDuplicates = 0; let issueMissingRequired = 0;
  try {
    const response = await fetch(gazette.downloadUrl);
    if (!response.ok) throw new Error(`PDF download failed with HTTP ${response.status}`);
    const text = await extractPdfText(new Uint8Array(await response.arrayBuffer()));
    const records = splitJ193Records(text);
    if (!records.length) throw new Error('No numbered J193 records found');
    result.stats.recordsDetected += records.length;
    const alerts = await loadAlerts();
    for (const record of records) {
      if (!isWithinLiveWindow(gazette.datePublished)) { rejected++; result.stats.rejected++; continue; }
      const parsed = parseJ193Record(record.text, { url: gazette.downloadUrl, publishedDate: gazette.datePublished, gazetteNumber: gazetteNumber(gazette.title), page: record.page });
      if (!parsed.estate || !parsed.estate.deceasedName || !parsed.estate.estateNumber || !parsed.estate.sourceUrl || !parsed.estate.gazetteDate || !parsed.estate.parserVersion) { rejected++; result.stats.rejected++; result.stats.missingRequired++; issueMissingRequired++; continue; }
      const canonicalNumber = canonicalEstateNumber(parsed.estate.estateNumber);
      const duplicate = await query('SELECT id FROM estates WHERE source_id=$1 OR canonical_estate_number=$2 LIMIT 1', [parsed.estate.sourceId, canonicalNumber]);
      if (duplicate.rowCount) { result.stats.duplicatesSkipped++; issueDuplicates++; continue; }
      await insertEstate(parsed.estate); accepted++; result.stats.successfulParses++; result.stats.estatesCreated++;
      const matches = matchEstateToAlerts(parsed.estate, alerts); result.stats.matchedAlerts += matches.length;
      const events = await recordMatches(parsed.estate, matches);
      result.notifications.push(...events.map((event) => ({ alertId: event.alertId, alertName: event.alertName, estateNumber: parsed.estate!.estateNumber, status: event.status })));
      result.estates.push({ estateNumber: parsed.estate.estateNumber, deceasedName: parsed.estate.deceasedName, province: parsed.estate.province, valueBand: parsed.estate.valueBand, source: gazette.downloadUrl, matchedAlerts: matches.map((match) => match.alertId) });
    }
    const review = accepted === 0 || (accepted + rejected > 0 && rejected / (accepted + rejected) > 0.8) ? 1 : 0;
    result.stats.recordsReview += review;
    await query(`UPDATE gazette_issues SET status='completed',records_detected=$1,records_accepted=$2,records_rejected=$3,duplicates_skipped=$4,missing_required=$5,records_review=$6,parser_version=$7,quality_status=$8,quality_detail=$9,processed_at=NOW() WHERE source_url=$10`, [records.length, accepted, rejected, issueDuplicates, issueMissingRequired, review, PARSER_VERSION, review ? 'Zero accepted records or rejection rate above 80%' : null, gazette.downloadUrl]);
  } catch (error: any) {
    result.stats.failedParses++; result.errors.push({ url: gazette.downloadUrl, error: error.message });
    await query(`UPDATE gazette_issues SET status='failed',quality_status='failed',quality_detail=$1,error=$1 WHERE source_url=$2`, [error.message, gazette.downloadUrl]);
  }
}

export async function loadAlerts(): Promise<AlertCriteria[]> {
  const rows = (await query("SELECT * FROM alerts WHERE is_active=TRUE AND delivery_state='active' AND owner_id IS NOT NULL")).rows;
  return rows.map((row: any) => ({ id: row.id, name: row.name, surnameMatch: row.surname_match || undefined, idNumberHash: row.id_number_hash || undefined, idNumberMatchMasked: row.id_number_match_masked || undefined, provinces: row.provinces || [], districts: row.districts || [], valueBands: row.value_bands || [], assetTypes: row.asset_types || [], executorStatus: row.executor_status || [], channels: row.channels || [], isActive: row.is_active, matchCount: row.match_count, createdAt: row.created_at, recipientEmail: row.recipient_email, recipientPhone: row.recipient_phone, ownerName: row.owner_name }));
}

export async function insertEstate(estate: DeceasedEstate): Promise<void> {
  await query(`INSERT INTO estates(id,source_id,deceased_name,id_number_masked,id_number_hash,date_of_death,gazette_date,province,district,master_office,estate_number,canonical_estate_number,executor_name,executor_contact,executor_email,value_band,asset_types,raw_notice_snippet,gazette_ref,status,has_property,property_details,date_of_birth,last_address,spouse_details,executor_address,claim_period_days,gazette_number,gazette_page,source_url,parser_version)
    VALUES(${Array.from({length:31},(_,i)=>`$${i+1}`).join(',')}) ON CONFLICT DO NOTHING`, [estate.id,estate.sourceId,estate.deceasedName,estate.idNumberMasked,estate.idNumberHash||null,estate.dateOfDeath,estate.gazetteDate,estate.province,estate.district,estate.masterOffice,estate.estateNumber,canonicalEstateNumber(estate.estateNumber),estate.executorName,estate.executorContact,estate.executorEmail,estate.valueBand,estate.assetTypes,estate.rawNoticeSnippet,estate.gazetteRef,estate.status,estate.hasProperty,estate.propertyDetails||null,estate.dateOfBirth||null,estate.lastAddress||null,estate.spouseDetails||null,estate.executorAddress||null,estate.claimPeriodDays||null,estate.gazetteNumber||null,estate.gazettePage||null,estate.sourceUrl||null,estate.parserVersion||PARSER_VERSION]);
}
