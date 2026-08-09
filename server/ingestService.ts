import Firecrawl from 'firecrawl';
import { query } from './db.js';
import { parseNotice } from './parser.js';
import { matchEstateToAlerts } from './matching.js';
import { recordMatches } from './notifications.js';
import { DeceasedEstate, AlertCriteria } from './types.js';
import { IngestResult, emptyIngestResult } from './ingestTypes.js';
import { createFirecrawlClient, discoverGazettes, GazetteItem } from './firecrawlDiscovery.js';

export function getFirecrawl(): Firecrawl | null {
  const apiKey = process.env.FIRECRAWL_API_KEY;
  if (!apiKey) return null;
  return new Firecrawl({ apiKey });
}

export async function runIngestion(): Promise<IngestResult> {
  const results = emptyIngestResult();
  const firecrawl = getFirecrawl();
  if (!firecrawl) {
    results.status = 'flagged';
    results.errors.push({ url: 'n/a', error: 'FIRECRAWL_API_KEY not configured in environment' });
    return results;
  }

  let gazettes: GazetteItem[] = [];
  try {
    gazettes = (await discoverGazettes(createFirecrawlClient())).gazettes;
  } catch (err: any) {
    results.errors.push({ url: 'search', error: `Firecrawl search failed: ${err?.message || err}` });
    results.status = 'flagged';
    return results;
  }

  if (!gazettes.length) {
    results.errors.push({ url: 'search', error: 'No gazette URLs found in search results' });
    results.status = 'flagged';
    return results;
  }

  results.stats.totalGazettes = gazettes.length;

  // Step 2: process each URL
  for (const gazette of gazettes) {
    await processGazetteUrl(results, gazette);
  }

  return results;
}

async function processGazetteUrl(results: IngestResult, gazette: GazetteItem): Promise<void> {
  const url = gazette.downloadUrl;
  try {
    const scrapeResult = await firecrawlScrape(url);
    if (!scrapeResult) {
      results.stats.failedParses++;
      results.errors.push({ url, error: 'Scraping failed — skipping this source (no fallback to description snippets)' });
      return;
    }

    const parseOutcome = parseNotice(scrapeResult, url, { publishedDate: gazette.datePublished });
    if (parseOutcome.warning || !parseOutcome.estate) {
      results.stats.failedParses++;
      results.stats.rejected++;
      results.errors.push({ url, error: parseOutcome.warning || 'Could not parse estate notice' });
      return;
    }
    const estate: DeceasedEstate = parseOutcome.estate;

    results.stats.successfulParses++;

    const existing = await query('SELECT id FROM estates WHERE estate_number = $1 LIMIT 1', [estate.estateNumber]);
    if (existing.rowCount && existing.rowCount > 0) {
      results.stats.duplicatesSkipped++;
      return;
    }

    await insertEstate(estate);
    results.stats.estatesCreated++;

    const alertsResult = await query('SELECT * FROM alerts WHERE is_active = TRUE;');
    const alerts: AlertCriteria[] = alertsResult.rows.map((row: any) => ({
      id: row.id,
      name: row.name,
      surnameMatch: row.surname_match || undefined,
      provinces: row.provinces || [],
      districts: row.districts || [],
      valueBands: row.value_bands || [],
      assetTypes: row.asset_types || [],
      executorStatus: row.executor_status || [],
      channels: row.channels || [],
      isActive: row.is_active,
      matchCount: row.match_count,
      createdAt: row.created_at,
    }));

    const matches = matchEstateToAlerts(estate, alerts);
    results.stats.matchedAlerts += matches.length;
    const dispatched = await recordMatches(estate, matches);

    results.estates.push({
      estateNumber: estate.estateNumber,
      deceasedName: estate.deceasedName,
      province: estate.province,
      valueBand: estate.valueBand,
      source: url,
      matchedAlerts: matches.map((m) => m.alertId),
    });
    results.notifications.push(
      ...dispatched.map((d) => ({
        alertId: d.alertId,
        alertName: d.alertName,
        estateNumber: estate.estateNumber,
        status: d.status,
      }))
    );
  } catch (err: any) {
    results.stats.failedParses++;
    results.errors.push({ url, error: err?.message || 'Unknown processing error' });
  }
}

async function firecrawlScrape(url: string): Promise<string | null> {
  const firecrawl = getFirecrawl();
  if (!firecrawl) return null;
  const scrapeResult = await firecrawl.scrape(url, { formats: ['markdown'] });
  if (!scrapeResult?.markdown) return null;
  return scrapeResult.markdown;
}

export async function insertEstate(estate: DeceasedEstate): Promise<void> {
  await query(
    `INSERT INTO estates (
      id, source_id, deceased_name, id_number_masked, date_of_death, gazette_date,
      province, district, master_office, estate_number, executor_name, executor_contact,
      executor_email, value_band, asset_types, raw_notice_snippet, gazette_ref,
      status, has_property, property_details
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
    ON CONFLICT (id) DO NOTHING;`,
    [
      estate.id, estate.sourceId, estate.deceasedName, estate.idNumberMasked, estate.dateOfDeath,
      estate.gazetteDate, estate.province, estate.district, estate.masterOffice, estate.estateNumber,
      estate.executorName, estate.executorContact, estate.executorEmail, estate.valueBand,
      estate.assetTypes, estate.rawNoticeSnippet, estate.gazetteRef, estate.status,
      estate.hasProperty, estate.propertyDetails || null,
    ]
  );
}
