import { describe, expect, it, vi } from 'vitest';
import { buildGazetteUrl, discoverGazettes, parseGazetteSearchMarkdown, type FirecrawlDiscoveryClient } from './firecrawlDiscovery.js';

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
      downloadUrl: 'https://gazettes.africa/akn/za/officialGazette/government-gazette-legal-notices-a/2026-07-31/55077-part-1/eng@2026-07-31/source',
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
});
