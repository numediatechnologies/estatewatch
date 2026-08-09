import { describe, expect, it, vi } from 'vitest';
import { agentPageSchema, buildGazetteUrl, discoverGazettes, type AgentClient } from './firecrawlDiscovery.js';

const completed = (gazettes: unknown[], creditsUsed = 1) => ({
  success: true, status: 'completed', data: { gazettes }, creditsUsed,
});

describe('Firecrawl J193 discovery', () => {
  it('builds the documented South African J193 URL', () => {
    expect(buildGazetteUrl(2026, 2)).toContain('q=J193');
    expect(buildGazetteUrl(2026, 2)).toContain('jurisdiction=South+Africa');
    expect(buildGazetteUrl(2026, 2)).toContain('page=2');
  });

  it('paginates, deduplicates, and stops at the first old result', async () => {
    const agent = vi.fn()
      .mockResolvedValueOnce(completed([
        { title: 'J193 A', datePublished: '2026-08-01', downloadUrl: 'https://gazettes.africa/a.pdf' },
        { title: 'J193 A duplicate', datePublished: '2026-08-01', downloadUrl: 'https://gazettes.africa/a.pdf' },
      ]))
      .mockResolvedValueOnce(completed([
        { title: 'J193 B', datePublished: '2026-07-01', downloadUrl: 'https://gazettes.africa/b.pdf' },
        { title: 'Old', datePublished: '2026-03-01', downloadUrl: 'https://gazettes.africa/old.pdf' },
      ]));
    const result = await discoverGazettes({ agent } as AgentClient, { now: new Date('2026-08-09T00:00:00Z') });
    expect(agent).toHaveBeenCalledTimes(2);
    expect(result.pagesInspected).toBe(2);
    expect(result.gazettes.map((item) => item.title)).toEqual(['J193 A', 'J193 B']);
    expect(result.creditsUsed).toBe(2);
  });

  it('crosses into the previous year when the window requires it', async () => {
    const agent = vi.fn()
      .mockResolvedValueOnce(completed([]))
      .mockResolvedValueOnce(completed([]));
    await discoverGazettes({ agent } as AgentClient, { now: new Date('2026-02-09T00:00:00Z') });
    expect(agent.mock.calls[0][0].urls[0]).toContain('year=2026');
    expect(agent.mock.calls[1][0].urls[0]).toContain('year=2025');
  });

  it('warns for invalid dates and non-PDF links', async () => {
    const agent = vi.fn().mockResolvedValueOnce(completed([
      { title: 'Bad date', datePublished: 'not-a-date', downloadUrl: 'https://gazettes.africa/a.pdf' },
      { title: 'Not PDF', datePublished: '2026-08-01', downloadUrl: 'https://gazettes.africa/a' },
    ])).mockResolvedValueOnce(completed([]));
    const result = await discoverGazettes({ agent } as AgentClient, { now: new Date('2026-08-09T00:00:00Z') });
    expect(result.gazettes).toHaveLength(0);
    expect(result.warnings).toHaveLength(2);
  });

  it('rejects malformed structured output and API failures', async () => {
    await expect(discoverGazettes({ agent: vi.fn().mockResolvedValue(completed([{ title: 'missing fields' }])) } as AgentClient))
      .rejects.toThrow('Invalid Firecrawl agent response');
    await expect(discoverGazettes({ agent: vi.fn().mockResolvedValue({ success: false, status: 'failed', error: 'quota' }) } as AgentClient))
      .rejects.toThrow('quota');
    expect(agentPageSchema.safeParse({ gazettes: [{ title: 'x' }] }).success).toBe(false);
  });
});
