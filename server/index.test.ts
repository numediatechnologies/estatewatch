import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { createApp } from './index.js';
import type { FirecrawlDiscoveryClient, DiscoveryResult } from './firecrawlDiscovery.js';
import { emptyIngestResult } from './ingestTypes.js';
import { createSessionToken } from './auth.js';

const discovery: DiscoveryResult = {
  dateWindow: { from: '2026-04-09', to: '2026-08-09' }, pagesInspected: 1,
  gazettes: [{ title: 'J193', datePublished: '2026-08-01', downloadUrl: 'https://gazettes.africa/a.pdf', page: 1 }],
  warnings: [], source: { provider: 'Firecrawl', method: 'scrape', query: 'J193', jurisdiction: 'South Africa' },
};

describe('Firecrawl API', () => {
  it('validates password recovery inputs without disclosing accounts', async () => {
    const app = createApp({ discover: vi.fn(), createClient: () => ({}) as FirecrawlDiscoveryClient, ingest: vi.fn() });
    expect((await request(app).post('/api/auth/forgot-password').send({ email: 'invalid' })).status).toBe(400);
    expect((await request(app).post('/api/auth/reset-password').send({ token: 'short', newPassword: 'long-enough' })).status).toBe(400);
    expect((await request(app).post('/api/auth/reset-password').send({ token: 'long-enough-token', newPassword: 'short' })).status).toBe(400);
  });

  it('rejects malformed registration verification requests before delivery', async () => {
    const app = createApp({ discover: vi.fn(), createClient: () => ({}) as FirecrawlDiscoveryClient, ingest: vi.fn() });
    expect((await request(app).post('/api/auth/register/sms/start').send({ email: 'invalid', phone: '0637911099' })).status).toBe(400);
    expect((await request(app).post('/api/auth/register/sms/verify').send({ code: '12', password: 'short' })).status).toBe(400);
  });

  it('keeps original Gazette PDFs behind authentication', async () => {
    const app = createApp({ discover: vi.fn(), createClient: () => ({}) as FirecrawlDiscoveryClient, ingest: vi.fn() });
    const response = await request(app).get('/api/estates/estate-1/source');
    expect(response.status).toBe(401);
    expect(response.body.error).toContain('Sign in');
  });

  it('protects Firecrawl endpoints when an admin token is configured', async () => {
    const previous = process.env.ADMIN_API_TOKEN;
    process.env.ADMIN_API_TOKEN = 'test-secret';
    const app = createApp({ discover: vi.fn(), createClient: () => ({}) as FirecrawlDiscoveryClient, ingest: vi.fn() });
    expect((await request(app).post('/api/run-fetch')).status).toBe(401);
    expect((await request(app).post('/api/ingest-gazettes')).status).toBe(401);
    if (previous === undefined) delete process.env.ADMIN_API_TOKEN;
    else process.env.ADMIN_API_TOKEN = previous;
  });

  it('allows a signed administrator session and rejects a signed user session', async () => {
    const previousToken = process.env.ADMIN_API_TOKEN;
    const previousSecret = process.env.AUTH_SESSION_SECRET;
    process.env.ADMIN_API_TOKEN = 'automation-secret';
    process.env.AUTH_SESSION_SECRET = 'application-session-test-secret';
    const discover = vi.fn().mockResolvedValue(discovery);
    const app = createApp({ discover, createClient: () => ({}) as FirecrawlDiscoveryClient, ingest: vi.fn() });
    const adminToken = createSessionToken({ sub: 'admin-1', email: 'support@marketdirecto.co.za', name: 'Support', role: 'admin' });
    const userToken = createSessionToken({ sub: 'user-1', email: 'user@example.com', name: 'User', role: 'user' });
    expect((await request(app).post('/api/run-fetch').set('Cookie', `estatewatch_session=${adminToken}`)).status).toBe(200);
    expect((await request(app).post('/api/run-fetch').set('Cookie', `estatewatch_session=${userToken}`)).status).toBe(401);
    if (previousToken === undefined) delete process.env.ADMIN_API_TOKEN; else process.env.ADMIN_API_TOKEN = previousToken;
    if (previousSecret === undefined) delete process.env.AUTH_SESSION_SECRET; else process.env.AUTH_SESSION_SECRET = previousSecret;
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
