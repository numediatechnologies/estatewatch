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
    metadata?: { statusCode?: number; sourceURL?: string; fallback?: boolean; attempts?: number };
  }>;
}

export interface DiscoveryOptions { now?: Date; maxPages?: number }
export interface ResilienceOptions {
  attempts?: number;
  baseDelayMs?: number;
  fetchImpl?: typeof fetch;
  sleep?: (milliseconds: number) => Promise<void>;
}

export interface DiscoveryResult {
  dateWindow: { from: string; to: string };
  pagesInspected: number;
  gazettes: GazetteItem[];
  warnings: string[];
  source: { provider: 'Firecrawl'; method: 'scrape'; query: 'J193'; jurisdiction: 'South Africa' };
}

const wait = (milliseconds: number) => new Promise<void>((resolve) => setTimeout(resolve, milliseconds));

function errorStatus(error: unknown): number | undefined {
  if (!error || typeof error !== 'object') return undefined;
  const candidate = error as { status?: number; statusCode?: number; response?: { status?: number } };
  return candidate.status ?? candidate.statusCode ?? candidate.response?.status;
}

function isTransient(error: unknown): boolean {
  const status = errorStatus(error);
  if (status) return status === 408 || status === 409 || status === 425 || status === 429 || status >= 500;
  return /timeout|timed out|network|fetch failed|socket|ECONN|no markdown/i.test(error instanceof Error ? error.message : String(error));
}

function htmlToSearchMarkdown(html: string): string {
  return html
    .replace(/&amp;/g, '&')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&#x2F;|&#47;/gi, '/')
    .replace(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi, (_match, href, label) => {
      const text = String(label).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
      const absoluteHref = String(href).startsWith('/') ? `https://gazettes.africa${href}` : href;
      return `[${text}](${absoluteHref})`;
    });
}

/** Adds bounded retry and a no-credit direct-source fallback around Firecrawl Scrape. */
export function createResilientDiscoveryClient(client: FirecrawlDiscoveryClient, options: ResilienceOptions = {}): FirecrawlDiscoveryClient {
  const attempts = Math.max(1, options.attempts ?? 3);
  const baseDelayMs = Math.max(0, options.baseDelayMs ?? 750);
  const fetchImpl = options.fetchImpl ?? fetch;
  const sleep = options.sleep ?? wait;
  return {
    async scrape(url, scrapeOptions) {
      let lastError: unknown;
      for (let attempt = 1; attempt <= attempts; attempt++) {
        try {
          const response = await client.scrape(url, scrapeOptions);
          if (!response.markdown) throw new Error(`Firecrawl returned no markdown for ${url}`);
          return { ...response, metadata: { ...response.metadata, attempts: attempt } };
        } catch (error) {
          lastError = error;
          if (!isTransient(error) || attempt === attempts) break;
          await sleep(baseDelayMs * (2 ** (attempt - 1)));
        }
      }
      try {
        const response = await fetchImpl(url, {
          headers: { accept: 'text/html', 'user-agent': 'EstateWatch/1.0 (+https://estatewatch.marketdirect.co.za)' },
          signal: AbortSignal.timeout(15_000),
        });
        if (!response.ok) throw new Error(`Gazette fallback returned HTTP ${response.status}`);
        const markdown = htmlToSearchMarkdown(await response.text());
        if (!parseGazetteSearchMarkdown(markdown).length) throw new Error('Gazette fallback returned no valid J193 results');
        return { markdown, metadata: { statusCode: response.status, sourceURL: url, fallback: true, attempts } };
      } catch (fallbackError) {
        const primary = lastError instanceof Error ? lastError.message : String(lastError);
        const fallback = fallbackError instanceof Error ? fallbackError.message : String(fallbackError);
        throw new Error(`Gazette discovery failed after ${attempts} attempts (${primary}); direct-source fallback failed (${fallback})`);
      }
    },
  };
}

export function createFirecrawlClient(apiKey = process.env.FIRECRAWL_API_KEY): FirecrawlDiscoveryClient {
  if (!apiKey) throw new Error('FIRECRAWL_API_KEY not configured in environment');
  const nativeClient = new Firecrawl({ apiKey }) as FirecrawlDiscoveryClient;
  return createResilientDiscoveryClient(nativeClient);
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
      if (response.metadata?.fallback) warnings.push(`Firecrawl was unavailable; inspected ${url} directly.`);
      else if ((response.metadata?.attempts ?? 1) > 1) warnings.push(`Firecrawl recovered after ${response.metadata?.attempts} attempts for ${url}.`);
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
