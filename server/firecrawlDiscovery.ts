import Firecrawl from 'firecrawl';
import { z } from 'zod';

export const gazetteItemSchema = z.object({
  title: z.string().min(1),
  datePublished: z.string().min(1),
  downloadUrl: z.string().url(),
});

export const agentPageSchema = z.object({ gazettes: z.array(gazetteItemSchema) });

export interface GazetteItem {
  title: string;
  datePublished: string;
  downloadUrl: string;
  page: number;
}

export interface AgentClient {
  agent(args: {
    prompt: string;
    urls: string[];
    schema: typeof agentPageSchema;
    model: 'spark-1-mini';
    maxCredits: number;
    strictConstrainToURLs: boolean;
    timeout: number;
  }): Promise<{ success: boolean; status: string; data?: unknown; error?: string; creditsUsed?: number }>;
}

export interface DiscoveryOptions {
  now?: Date;
  maxPages?: number;
  timeoutSeconds?: number;
  maxCreditsPerPage?: number;
}

export interface DiscoveryResult {
  dateWindow: { from: string; to: string };
  pagesInspected: number;
  gazettes: GazetteItem[];
  warnings: string[];
  creditsUsed?: number;
  source: { provider: 'Firecrawl'; query: 'J193'; jurisdiction: 'South Africa' };
}

export function createFirecrawlClient(apiKey = process.env.FIRECRAWL_API_KEY): AgentClient {
  if (!apiKey) throw new Error('FIRECRAWL_API_KEY not configured in environment');
  return new Firecrawl({ apiKey }) as AgentClient;
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

function parseDate(value: string): Date | null {
  const parsed = new Date(value);
  return Number.isNaN(parsed.valueOf()) ? null : parsed;
}

export async function discoverGazettes(
  client: AgentClient,
  options: DiscoveryOptions = {},
): Promise<DiscoveryResult> {
  const now = options.now ?? new Date();
  const cutoff = fourMonthsAgo(now);
  const maxPages = options.maxPages ?? 10;
  const warnings: string[] = [];
  const gazettes: GazetteItem[] = [];
  const seen = new Set<string>();
  let pagesInspected = 0;
  let creditsUsed = 0;
  let shouldStop = false;

  const years = cutoff.getUTCFullYear() === now.getUTCFullYear()
    ? [now.getUTCFullYear()]
    : [now.getUTCFullYear(), cutoff.getUTCFullYear()];

  for (const year of years) {
    for (let page = 1; page <= maxPages && !shouldStop; page++) {
      const url = buildGazetteUrl(year, page);
      const response = await client.agent({
        urls: [url],
        prompt: `Extract every J193 gazette search result shown on this page. Return the exact title, publication date, and direct PDF download URL. Do not follow pagination. Today is ${now.toISOString().slice(0, 10)}.`,
        schema: agentPageSchema,
        model: 'spark-1-mini',
        maxCredits: options.maxCreditsPerPage ?? 20,
        strictConstrainToURLs: true,
        timeout: options.timeoutSeconds ?? 120,
      });
      pagesInspected++;
      creditsUsed += response.creditsUsed ?? 0;
      if (!response.success || response.status !== 'completed') {
        throw new Error(response.error || `Firecrawl agent ended with status ${response.status}`);
      }

      const parsed = agentPageSchema.safeParse(response.data);
      if (!parsed.success) throw new Error(`Invalid Firecrawl agent response: ${parsed.error.message}`);
      if (parsed.data.gazettes.length === 0) {
        break;
      }

      for (const item of parsed.data.gazettes) {
        const date = parseDate(item.datePublished);
        if (!date) {
          warnings.push(`Skipped result with invalid date: ${item.title}`);
          continue;
        }
        if (date < cutoff) {
          shouldStop = true;
          break;
        }
        if (date > now) {
          warnings.push(`Skipped future-dated result: ${item.title}`);
          continue;
        }
        if (!/\.pdf(?:$|[?#])/i.test(item.downloadUrl)) {
          warnings.push(`Skipped result without a direct PDF URL: ${item.title}`);
          continue;
        }
        if (!seen.has(item.downloadUrl)) {
          seen.add(item.downloadUrl);
          gazettes.push({ ...item, datePublished: date.toISOString().slice(0, 10), page });
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
    creditsUsed: creditsUsed || undefined,
    source: { provider: 'Firecrawl', query: 'J193', jurisdiction: 'South Africa' },
  };
}
