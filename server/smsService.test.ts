import { afterEach, describe, expect, it, vi } from 'vitest';
import { normalizeSmsRecipient, renderEstateAlertSms, sendEstateAlertSms } from './smsService.js';

describe('Clickatell SMS delivery', () => {
  afterEach(() => { vi.unstubAllGlobals(); delete process.env.CLICKATELL_API_KEY; });

  it('normalizes international recipients and links to the exact estate record', () => {
    process.env.APP_URL = 'https://estatewatch.marketdirect.co.za';
    expect(normalizeSmsRecipient('+27 61 042 1779')).toBe('27610421779');
    expect(normalizeSmsRecipient('(063) 791-1099')).toBe('27637911099');
    expect(renderEstateAlertSms({ to: '27610421779', estateId: 'est-1', estateName: 'HOOSAIN, ROKEYA', estateNumber: '018808/2023', province: 'Gauteng' })).toContain('https://estatewatch.marketdirect.co.za/?estate=est-1');
  });

  it('uses the server-side Clickatell endpoint and reports provider failures safely', async () => {
    process.env.CLICKATELL_API_KEY = 'test-clickatell-key';
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: 'Rejected' }), { status: 400, headers: { 'content-type': 'application/json' } }));
    vi.stubGlobal('fetch', fetchMock);
    const result = await sendEstateAlertSms({ to: '27610421779', estateId: 'est-1', estateName: 'HOOSAIN', estateNumber: '1/2026', province: 'Gauteng' });
    expect(result).toMatchObject({ success: false, error: 'Rejected' });
    const calledUrl = new URL(fetchMock.mock.calls[0][0]);
    expect(calledUrl.origin + calledUrl.pathname).toBe('https://platform.clickatell.com/messages/http/send');
    expect(calledUrl.searchParams.get('apiKey')).toBe('test-clickatell-key');
  });
});
