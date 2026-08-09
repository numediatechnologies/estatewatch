import Firecrawl from 'firecrawl';
import { z } from 'zod';

export const gazetteItemSchema = z.object({
  title: z.string().min(1),
  datePublished: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  downloadUrl: z.string().url(),
});

export interface GazetteItem extends z.infer<typeof gazetteItemSchema> { page: number }

export interface FirecrawlDiscoveryClient {
  scrape(url: string, options: { formats: ['markdown']; onlyMainContent: boolean }): Promise<{
    markdown?: string;
    metadata?: { statusCode?: number; sourceURL?: string };
  }>;
}

export interface DiscoveryOptions { now?: Date; maxPages?: number }

export interface DiscoveryResult {
  dateWindow: { from: string; to: string };
  pagesInspected: number;
  gazettes: GazetteItem[];
  warnings: string[];
  source: { provider: 'Firecrawl'; method: 'scrape'; query: 'J193'; jurisdiction: 'South Africa' };
}

export function createFirecrawlClient(apiKey = process.env.FIRECRAWL_API_KEY): FirecrawlDiscoveryClient {
  if (!apiKey) throw new Error('FIRECRAWL_API_KEY not configured in environment');
  return new Firecrawl({ apiKey }) as FirecrawlDiscoveryClient;
}

export function fourMonthsAgo(now: Date): Date {
  const cutoff = new Date(now);
  cutoff.setUTCMonth(cutoff.getUTCMonth() - 4);
  return cutoff;
}

export function buildGazetteUrl(year: number, page: number): string {
  const url = new URL('https://gazettes.africa/search/');
  url.searchParams.set('q', 'J193');
  url.searchParams.set('ordering', '-date');
  url.searchParams.set('jurisdiction', 'South Africa');
  url.searchParams.set('year', String(year));
  url.searchParams.set('page', String(page));
  return url.toString();
}

export function parseGazetteSearchMarkdown(markdown: string): Array<z.infer<typeof gazetteItemSchema>> {
  const pattern = /\[(South Africa Government Gazette Legal Notices A dated (\d{4}-\d{2}-\d{2})[^\]]*)\]\((https:\/\/gazettes\.africa\/akn\/za\/officialGazette\/[^)]+)\)/g;
  const results: Array<z.infer<typeof gazetteItemSchema>> = [];
  for (const match of markdown.matchAll(pattern)) {
    const numberMatch = match[1].match(/number\s+(.+)$/i)?.[1].toLowerCase().replace(/\s+/g, '-');
    if (!numberMatch) continue;
    results.push({
      title: match[1],
      datePublished: match[2],
      downloadUrl: `https://archive.gazettes.africa/archive/za/${match[2].slice(0, 4)}/za-government-gazette-legal-notices-a-dated-${match[2]}-no-${numberMatch}.pdf`,
    });
  }
  return results;
}

export async function discoverGazettes(client: FirecrawlDiscoveryClient, options: DiscoveryOptions = {}): Promise<DiscoveryResult> {
  const now = options.now ?? new Date();
  const cutoff = fourMonthsAgo(now);
  const maxPages = options.maxPages ?? 10;
  const warnings: string[] = [];
  const gazettes: GazetteItem[] = [];
  const seen = new Set<string>();
  let pagesInspected = 0;
  let shouldStop = false;
  const years = cutoff.getUTCFullYear() === now.getUTCFullYear() ? [now.getUTCFullYear()] : [now.getUTCFullYear(), cutoff.getUTCFullYear()];

  for (const year of years) {
    for (let page = 1; page <= maxPages && !shouldStop; page++) {
      const url = buildGazetteUrl(year, page);
      const response = await client.scrape(url, { formats: ['markdown'], onlyMainContent: true });
      pagesInspected++;
      if (!response.markdown) throw new Error(`Firecrawl returned no markdown for ${url}`);
      const pageGazettes = parseGazetteSearchMarkdown(response.markdown);
      if (!pageGazettes.length) {
        warnings.push(`No J193 results found on ${url}`);
        break;
      }
      for (const item of pageGazettes) {
        const date = new Date(`${item.datePublished}T00:00:00Z`);
        if (date < cutoff) { shouldStop = true; break; }
        if (date > now) { warnings.push(`Skipped future-dated result: ${item.title}`); continue; }
        if (!seen.has(item.downloadUrl)) {
          seen.add(item.downloadUrl);
          gazettes.push({ ...item, page });
        }
      }
    }
    if (shouldStop) break;
  }
  return {
    dateWindow: { from: cutoff.toISOString().slice(0, 10), to: now.toISOString().slice(0, 10) },
    pagesInspected,
    gazettes,
    warnings,
    source: { provider: 'Firecrawl', method: 'scrape', query: 'J193', jurisdiction: 'South Africa' },
  };
}
