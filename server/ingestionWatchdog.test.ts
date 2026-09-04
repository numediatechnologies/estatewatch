import { describe, expect, it } from 'vitest';
import { gazetteIngestSlotStart, isTerminalIngestionStatus, missedRunDetail } from './ingestionWatchdog.js';

describe('Gazette ingestion watchdog', () => {
  it('uses the morning slot at 04:00 UTC before the afternoon cutover', () => {
    const slot = gazetteIngestSlotStart(new Date('2026-08-29T05:15:00.000Z'));
    expect(slot.toISOString()).toBe('2026-08-29T04:00:00.000Z');
    expect(missedRunDetail(slot)).toContain('2026-08-29T04:00:00.000Z');
  });

  it('uses the afternoon slot at 11:00 UTC after the morning window', () => {
    expect(gazetteIngestSlotStart(new Date('2026-08-29T12:15:00.000Z')).toISOString()).toBe('2026-08-29T11:00:00.000Z');
  });

  it('treats both completed and flagged runs as terminal evidence the slot ran', () => {
    expect(isTerminalIngestionStatus('completed')).toBe(true);
    expect(isTerminalIngestionStatus('flagged')).toBe(true);
    expect(isTerminalIngestionStatus('running')).toBe(false);
  });
});
