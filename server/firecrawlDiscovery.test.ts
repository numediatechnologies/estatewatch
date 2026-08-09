import { describe, expect, it, vi } from 'vitest';
import { buildGazetteUrl, createResilientDiscoveryClient, discoverGazettes, parseGazetteSearchMarkdown, type FirecrawlDiscoveryClient } from './firecrawlDiscovery.js';

const row = (date: string, number: string) => `[South Africa Government Gazette Legal Notices A dated ${date} number ${number}](https://gazettes.africa/akn/za/officialGazette/government-gazette-legal-notices-a/${date}/${number}/eng@${date})`;
const scraped = (markdown: string) => ({ markdown, metadata: { statusCode: 200 } });

describe('Firecrawl J193 discovery', () => {
  it('builds the documented South African J193 URL', () => {
    expect(buildGazetteUrl(2026, 2)).toContain('q=J193');
    expect(buildGazetteUrl(2026, 2)).toContain('jurisdiction=South+Africa');
    expect(buildGazetteUrl(2026, 2)).toContain('page=2');
  });

  it('parses live markdown into source URLs', () => {
    expect(parseGazetteSearchMarkdown(row('2026-07-31', '55077-part-1'))[0]).toEqual({
      title: 'South Africa Government Gazette Legal Notices A dated 2026-07-31 number 55077-part-1',
      datePublished: '2026-07-31',
      downloadUrl: 'https://archive.gazettes.africa/archive/za/2026/za-government-gazette-legal-notices-a-dated-2026-07-31-no-55077-part-1.pdf',
    });
  });

  it('paginates, deduplicates, and stops at the first old result', async () => {
    const scrape = vi.fn().mockResolvedValueOnce(scraped(`${row('2026-08-01', 'a')}\n${row('2026-08-01', 'a')}`)).mockResolvedValueOnce(scraped(`${row('2026-07-01', 'b')}\n${row('2026-03-01', 'old')}`));
    const result = await discoverGazettes({ scrape } as FirecrawlDiscoveryClient, { now: new Date('2026-08-09T00:00:00Z') });
    expect(scrape).toHaveBeenCalledTimes(2);
    expect(result.gazettes).toHaveLength(2);
  });

  it('crosses into the previous year when required', async () => {
    const scrape = vi.fn().mockResolvedValue(scraped('no results'));
    await discoverGazettes({ scrape } as FirecrawlDiscoveryClient, { now: new Date('2026-02-09T00:00:00Z') });
    expect(scrape.mock.calls[0][0]).toContain('year=2026');
    expect(scrape.mock.calls[1][0]).toContain('year=2025');
  });

  it('reports empty and malformed responses', async () => {
    const empty = await discoverGazettes({ scrape: vi.fn().mockResolvedValue(scraped('not a result')) } as FirecrawlDiscoveryClient);
    expect(empty.warnings[0]).toContain('No J193 results');
    await expect(discoverGazettes({ scrape: vi.fn().mockResolvedValue({}) } as FirecrawlDiscoveryClient)).rejects.toThrow('no markdown');
  });

  it('retries transient Firecrawl failures and then succeeds', async () => {
    const scrape = vi.fn().mockRejectedValueOnce(Object.assign(new Error('rate limited'), { status: 429 })).mockResolvedValue(scraped(row('2026-08-01', '55078')));
    const sleep = vi.fn().mockResolvedValue(undefined);
    const resilient = createResilientDiscoveryClient({ scrape }, { sleep, fetchImpl: vi.fn() as any });
    const result = await discoverGazettes(resilient, { now: new Date('2026-08-09T00:00:00Z'), maxPages: 1 });
    expect(scrape).toHaveBeenCalledTimes(2);
    expect(sleep).toHaveBeenCalledTimes(1);
    expect(result.gazettes).toHaveLength(1);
    expect(result.warnings[0]).toContain('recovered after 2 attempts');
  });

  it('falls back to the direct Gazette page after bounded failures', async () => {
    const scrape = vi.fn().mockRejectedValue(new Error('network timeout'));
    const html = `<a href="/akn/za/officialGazette/government-gazette-legal-notices-a/2026-08-01/55078/eng@2026-08-01">South Africa Government Gazette Legal Notices A dated 2026-08-01 number 55078</a>`;
    const fetchImpl = vi.fn().mockResolvedValue(new Response(html, { status: 200 }));
    const resilient = createResilientDiscoveryClient({ scrape }, { attempts: 2, sleep: vi.fn().mockResolvedValue(undefined), fetchImpl });
    const result = await discoverGazettes(resilient, { now: new Date('2026-08-09T00:00:00Z'), maxPages: 1 });
    expect(scrape).toHaveBeenCalledTimes(2);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(result.gazettes).toHaveLength(1);
    expect(result.warnings[0]).toContain('inspected');
  });

  it('returns one actionable error when both discovery paths fail', async () => {
    const resilient = createResilientDiscoveryClient(
      { scrape: vi.fn().mockRejectedValue(new Error('network timeout')) },
      { attempts: 2, sleep: vi.fn().mockResolvedValue(undefined), fetchImpl: vi.fn().mockResolvedValue(new Response('blocked', { status: 503 })) },
    );
    await expect(resilient.scrape('https://gazettes.africa/search/', { formats: ['markdown'], onlyMainContent: true })).rejects.toThrow('direct-source fallback failed');
  });
});
