import { describe, expect, it } from 'vitest';
import { canonicalEstateNumber, isWithinLiveWindow } from './estateRetention.js';

describe('estate retention boundaries', () => {
  const now = new Date('2026-08-12T12:00:00.000Z');

  it('normalizes estate numbers for duplicate detection', () => {
    expect(canonicalEstateNumber('  018808/2023  ')).toBe('018808/2023');
    expect(canonicalEstateNumber('018808/2023')).toBe(canonicalEstateNumber(' 018808/2023 '));
    expect(canonicalEstateNumber('')).toBeNull();
  });

  it('accepts the exact four-month boundary and rejects older records', () => {
    expect(isWithinLiveWindow('2026-04-12', now)).toBe(true);
    expect(isWithinLiveWindow('2026-04-11', now)).toBe(false);
    expect(isWithinLiveWindow('2026-08-12', now)).toBe(true);
    expect(isWithinLiveWindow('2026-08-13', now)).toBe(false);
  });

  it('uses UTC calendar dates around midnight', () => {
    const lateUtc = new Date('2026-08-12T23:59:59.999Z');
    expect(isWithinLiveWindow('2026-04-12', lateUtc)).toBe(true);
    expect(isWithinLiveWindow('2026-04-11', lateUtc)).toBe(false);
  });
});
