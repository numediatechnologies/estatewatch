import { beforeEach, describe, expect, it, vi } from 'vitest';

const { queryMock, discoverMock, retentionMock } = vi.hoisted(() => ({
  queryMock: vi.fn(),
  discoverMock: vi.fn(),
  retentionMock: vi.fn(),
}));

vi.mock('./db.js', () => ({ query: queryMock }));
vi.mock('./firecrawlDiscovery.js', () => ({
  createFirecrawlClient: () => ({}),
  discoverGazettes: discoverMock,
}));
vi.mock('./estateRetention.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./estateRetention.js')>();
  return { ...actual, runRetentionMaintenance: retentionMock };
});

import { runIngestion, shouldFlagIngestion } from './ingestService.js';
import { emptyIngestResult } from './ingestTypes.js';

function queryResult(sql: string) {
  if (sql.includes('INSERT INTO ingestion_locks')) return { rowCount: 1, rows: [{ run_id: 'lease' }] };
  if (sql.includes('SELECT status FROM gazette_issues')) return { rowCount: 1, rows: [{ status: 'completed' }] };
  return { rowCount: 0, rows: [] };
}

describe('runIngestion run recording', () => {
  beforeEach(() => {
    queryMock.mockReset();
    discoverMock.mockReset();
    retentionMock.mockReset();
    retentionMock.mockResolvedValue({ quarantinedCount: 0, cutoffDate: '2026-04-30', duplicateCount: 0 });
    queryMock.mockImplementation(async (sql: string) => queryResult(sql));
  });

  it('records a completed run after skipping already ingested gazettes', async () => {
    discoverMock.mockResolvedValue({
      gazettes: [{ title: 'number 1', datePublished: '2026-08-01', downloadUrl: 'https://archive.gazettes.africa/a.pdf', page: 1 }],
    });
    const result = await runIngestion({ deadlineAt: Date.now() + 60_000 });
    expect(result.status).toBe('completed');
    expect(result.stats.duplicatesSkipped).toBe(1);
    const persist = queryMock.mock.calls.find((call) => String(call[0]).includes('UPDATE ingestion_runs SET status='));
    expect(persist?.[1]?.[0]).toBe('completed');
    expect(queryMock.mock.calls.some((call) => String(call[0]).includes('UPDATE ingestion_locks SET locked_until=NOW()'))).toBe(true);
  });

  it('records a flagged terminal run when discovery fails so the watchdog can see the slot', async () => {
    discoverMock.mockRejectedValue(new Error('Firecrawl timed out'));
    const result = await runIngestion({ deadlineAt: Date.now() + 60_000 });
    expect(result.status).toBe('flagged');
    const persist = queryMock.mock.calls.find((call) => String(call[0]).includes('UPDATE ingestion_runs SET status='));
    expect(persist?.[1]?.[0]).toBe('flagged');
    expect(String(persist?.[1]?.[1])).toContain('Firecrawl timed out');
  });

  it('records a flagged terminal run when retention throws before gazettes are processed', async () => {
    retentionMock.mockRejectedValue(new Error('estate_quarantine is missing'));
    const result = await runIngestion({ deadlineAt: Date.now() + 60_000 });
    expect(result.status).toBe('flagged');
    expect(result.errors[0].error).toContain('estate_quarantine');
    const persist = queryMock.mock.calls.find((call) => String(call[0]).includes('UPDATE ingestion_runs SET status='));
    expect(persist?.[1]?.[0]).toBe('flagged');
  });

  it('does not write a terminal ingestion_runs row when the lease is already held', async () => {
    queryMock.mockImplementation(async (sql: string) => {
      if (sql.includes('INSERT INTO ingestion_locks')) return { rowCount: 0, rows: [] };
      return queryResult(sql);
    });
    const result = await runIngestion();
    expect(result.status).toBe('flagged');
    expect(result.errors[0].error).toContain('already active');
    expect(queryMock.mock.calls.some((call) => String(call[0]).includes('UPDATE ingestion_runs'))).toBe(false);
  });

  it('flags when the serverless deadline expires before any gazette is processed', async () => {
    discoverMock.mockResolvedValue({
      gazettes: [{ title: 'number 1', datePublished: '2026-08-01', downloadUrl: 'https://archive.gazettes.africa/a.pdf', page: 1 }],
    });
    const result = await runIngestion({ deadlineAt: Date.now() - 1 });
    expect(result.status).toBe('flagged');
    expect(result.errors[0].error).toContain('out of time');
    const persist = queryMock.mock.calls.find((call) => String(call[0]).includes('UPDATE ingestion_runs SET status='));
    expect(persist?.[1]?.[0]).toBe('flagged');
  });
});

describe('shouldFlagIngestion', () => {
  it('does not flag a slot that skipped already ingested gazettes', () => {
    const result = emptyIngestResult();
    result.stats.duplicatesSkipped = 8;
    result.errors.push({ url: 'https://archive.gazettes.africa/example.pdf', error: 'PDF download failed with HTTP 503' });
    expect(shouldFlagIngestion(result)).toBe(false);
  });

  it('flags a run that produced no recorded work', () => {
    const result = emptyIngestResult();
    result.errors.push({ url: 'discovery', error: 'Firecrawl timed out' });
    expect(shouldFlagIngestion(result)).toBe(true);
  });
});
