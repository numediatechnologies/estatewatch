import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { createApp } from './index.js';
import type { FirecrawlDiscoveryClient, DiscoveryResult } from './firecrawlDiscovery.js';
import { emptyIngestResult } from './ingestTypes.js';

const discovery: DiscoveryResult = {
  dateWindow: { from: '2026-04-09', to: '2026-08-09' }, pagesInspected: 1,
  gazettes: [{ title: 'J193', datePublished: '2026-08-01', downloadUrl: 'https://gazettes.africa/a.pdf', page: 1 }],
  warnings: [], source: { provider: 'Firecrawl', method: 'scrape', query: 'J193', jurisdiction: 'South Africa' },
};

describe('Firecrawl API', () => {
  it('protects Firecrawl endpoints when an admin token is configured', async () => {
    const previous = process.env.ADMIN_API_TOKEN;
    process.env.ADMIN_API_TOKEN = 'test-secret';
    const app = createApp({ discover: vi.fn(), createClient: () => ({}) as FirecrawlDiscoveryClient, ingest: vi.fn() });
    expect((await request(app).post('/api/run-fetch')).status).toBe(401);
    expect((await request(app).post('/api/ingest-gazettes')).status).toBe(401);
    if (previous === undefined) delete process.env.ADMIN_API_TOKEN;
    else process.env.ADMIN_API_TOKEN = previous;
  });

  it('returns the normalized discovery contract', async () => {
    const app = createApp({ discover: vi.fn().mockResolvedValue(discovery), createClient: () => ({}) as FirecrawlDiscoveryClient, ingest: vi.fn() });
    const response = await request(app).post('/api/run-fetch').send({ maxPages: 1 });
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ success: true, pagesInspected: 1, source: { query: 'J193' } });
  });

  it('returns the normalized ingestion contract', async () => {
    const result = emptyIngestResult();
    const app = createApp({ discover: vi.fn(), createClient: () => ({}) as FirecrawlDiscoveryClient, ingest: vi.fn().mockResolvedValue(result) });
    const response = await request(app).post('/api/ingest-gazettes');
    expect(response.status).toBe(200);
    expect(response.body.data.stats).toMatchObject({ rejected: 0, duplicatesSkipped: 0, matchedAlerts: 0 });
  });

  it('reports missing Firecrawl configuration clearly', async () => {
    const app = createApp({ discover: vi.fn(), createClient: () => { throw new Error('FIRECRAWL_API_KEY not configured in environment'); }, ingest: vi.fn() });
    const response = await request(app).post('/api/run-fetch');
    expect(response.status).toBe(503);
    expect(response.body.error).toContain('FIRECRAWL_API_KEY');
  });
});
