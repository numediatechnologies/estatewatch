import { beforeEach, describe, expect, it, vi } from 'vitest';

const { queryMock, sendMock } = vi.hoisted(() => ({ queryMock: vi.fn(), sendMock: vi.fn() }));
vi.mock('./db.js', () => ({ query: queryMock }));
vi.mock('./emailService.js', () => ({ sendEstateAlertEmail: sendMock }));

import { recordMatches } from './notifications.js';
import type { DeceasedEstate } from './types.js';

const estate: DeceasedEstate = {
  id: 'estate-1', sourceId: '55077:018808/2023', deceasedName: 'ROKEYA HOOSAIN',
  idNumberMasked: '440928****085', dateOfDeath: '2023-05-21', gazetteDate: '2026-07-31',
  province: 'Gauteng', district: 'Johannesburg', masterOffice: 'Johannesburg',
  estateNumber: '018808/2023', executorName: 'HAWA BIBI MOYA', executorContact: 'Unknown',
  executorEmail: '', valueBand: 'Unknown', assetTypes: ['other'], rawNoticeSnippet: 'verified',
  gazetteRef: 'Government Gazette 55077', status: 'pending', hasProperty: false,
};
const matches = [{ alertId: 'alert-1', alertName: 'HOOSAIN', score: 60, reasons: ['Surname "HOOSAIN"'], recipientEmail: 'owner@example.com' }];

describe('notification idempotency', () => {
  beforeEach(() => { queryMock.mockReset(); sendMock.mockReset(); });

  it('does not contact Resend when the unique notification already exists', async () => {
    queryMock.mockResolvedValueOnce({ rowCount: 0 });
    const events = await recordMatches(estate, matches);
    expect(events).toEqual([]);
    expect(sendMock).not.toHaveBeenCalled();
  });

  it('records a provider id after one successful send', async () => {
    queryMock.mockResolvedValue({ rowCount: 1 });
    sendMock.mockResolvedValue({ success: true, messageId: 'resend-1' });
    const events = await recordMatches(estate, matches);
    expect(sendMock).toHaveBeenCalledTimes(1);
    expect(events[0]?.status).toBe('sent');
    expect(queryMock).toHaveBeenCalledWith(expect.stringContaining('provider_message_id'), expect.arrayContaining(['resend-1']));
  });
});
