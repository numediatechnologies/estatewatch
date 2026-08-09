import { describe, expect, it } from 'vitest';
import { matchEstateToAlerts } from './matching.js';
import type { AlertCriteria, DeceasedEstate } from './types.js';

const estate = { id: 'e1', sourceId: 's1', deceasedName: 'SMITH, JANE', idNumberMasked: 'Unknown', dateOfDeath: '2026-01-01', gazetteDate: '2026-07-31', province: 'Gauteng', district: 'Johannesburg', masterOffice: 'Johannesburg', estateNumber: '1/2026', executorName: 'Executor', executorContact: 'Unknown', executorEmail: '', valueBand: 'Unknown', assetTypes: ['unknown'], rawNoticeSnippet: '', gazetteRef: '55077', status: 'pending', hasProperty: false } satisfies DeceasedEstate;
const alert = { id: 'a1', name: 'HOOSAIN Gauteng', surnameMatch: 'HOOSAIN', provinces: ['Gauteng'], valueBands: [], assetTypes: [], channels: ['email'], isActive: true, matchCount: 0, createdAt: '2026-08-09' } satisfies AlertCriteria;

describe('alert matching', () => {
  it('requires every configured criterion, not only enough score', () => {
    expect(matchEstateToAlerts(estate, [alert])).toEqual([]);
  });

  it('matches the combined surname and province criteria', () => {
    expect(matchEstateToAlerts({ ...estate, deceasedName: 'HOOSAIN, ROKEYA' }, [alert])).toHaveLength(1);
  });

  it('treats an exact identity fingerprint as decisive over broader criteria', () => {
    const identityAlert = { ...alert, surnameMatch: 'NOT-SMITH', provinces: ['Western Cape'], idNumberHash: 'same-fingerprint' };
    expect(matchEstateToAlerts({ ...estate, idNumberHash: 'same-fingerprint' }, [identityAlert])).toMatchObject([{ score: 100, reasons: ['Exact South African ID'] }]);
  });

  it('does not match a different identity even when broader criteria match', () => {
    const identityAlert = { ...alert, surnameMatch: 'SMITH', idNumberHash: 'different-fingerprint' };
    expect(matchEstateToAlerts({ ...estate, idNumberHash: 'estate-fingerprint' }, [identityAlert])).toEqual([]);
  });
});
