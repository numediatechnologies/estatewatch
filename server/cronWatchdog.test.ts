import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { queryMock, notifyMock } = vi.hoisted(() => ({
  queryMock: vi.fn(),
  notifyMock: vi.fn(),
}));

vi.mock('./db.js', () => ({ query: queryMock }));
vi.mock('./operationalIncidents.js', () => ({
  notifyAdminOfIncident: notifyMock,
  listOperationalIncidents: vi.fn(),
  resolveOperationalIncident: vi.fn(),
}));

import { createApp } from './index.js';
import type { FirecrawlDiscoveryClient } from './firecrawlDiscovery.js';
import { SLOT_RUN_QUERY } from './ingestionWatchdog.js';

describe('GET /api/cron/watchdog', () => {
  const previousSecret = process.env.CRON_SECRET;

  beforeEach(() => {
    process.env.CRON_SECRET = 'cron-test-secret';
    queryMock.mockReset();
    notifyMock.mockReset();
    notifyMock.mockResolvedValue({ incident: { id: 'inc-1' }, email: { success: false, attempts: [] } });
  });

  afterEach(() => {
    if (previousSecret === undefined) delete process.env.CRON_SECRET;
    else process.env.CRON_SECRET = previousSecret;
  });

  function app() {
    return createApp({ discover: vi.fn(), createClient: () => ({}) as FirecrawlDiscoveryClient, ingest: vi.fn() });
  }

  it('is healthy when the slot has a flagged but finished ingestion run', async () => {
    queryMock.mockResolvedValue({
      rows: [{ ingestion_id: 'ingest-1', status: 'flagged', completed_at: '2026-08-29T04:50:00.000Z' }],
    });
    const response = await request(app()).get('/api/cron/watchdog').set('Authorization', 'Bearer cron-test-secret');
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ success: true, status: 'healthy', run: { ingestion_id: 'ingest-1', status: 'flagged' } });
    expect(queryMock).toHaveBeenCalledWith(SLOT_RUN_QUERY, [expect.stringMatching(/T(04|11):00:00.000Z$/)]);
    expect(notifyMock).not.toHaveBeenCalled();
  });

  it('raises a missed-run incident when no terminal run exists for the slot', async () => {
    queryMock.mockResolvedValue({ rows: [] });
    const response = await request(app()).get('/api/cron/watchdog').set('Authorization', 'Bearer cron-test-secret');
    expect(response.status).toBe(502);
    expect(response.body).toMatchObject({ success: false, status: 'missed' });
    expect(notifyMock).toHaveBeenCalledWith(expect.objectContaining({
      type: 'cron_failure',
      summary: 'Gazette ingestion watchdog detected a missed run',
    }));
  });
});
