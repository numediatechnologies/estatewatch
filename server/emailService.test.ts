import { describe, expect, it } from 'vitest';
import { renderEstateAlertEmail } from './emailService.js';

describe('alert email', () => {
  it('is customized, responsive, masked, and escapes Gazette content', () => {
    process.env.APP_URL = 'https://estatewatch.marketdirect.co.za';
    const result = renderEstateAlertEmail({ to: 'test@example.com', subject: 'Match', estateId: 'estate/hoosain 1', estateName: '<HOOSAIN>', estateNumber: '018808/2023', province: 'Gauteng', district: 'Johannesburg', valueBand: 'Unknown', executorName: 'HAWA BIBI MOYA', executorContact: 'Unknown', executorEmail: '', gazetteRef: '55077', rawSnippet: '', alertName: 'HOOSAIN alert', recipientName: 'Bongani', matchReasons: ['Surname HOOSAIN'], idNumberMasked: '440928****085' });
    expect(result.html).toContain('Hello Bongani');
    expect(result.html).toContain('&lt;HOOSAIN&gt;');
    expect(result.html).not.toContain('4409280400085');
    expect(result.text).toContain('HOOSAIN alert');
    expect(result.html).toContain('https://estatewatch.marketdirect.co.za/?estate=estate%2Fhoosain+1');
    expect(result.text).toContain('View full estate record: https://estatewatch.marketdirect.co.za/?estate=estate%2Fhoosain+1');
  });
});
