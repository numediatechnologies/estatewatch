import { describe, expect, it } from 'vitest';
import { configuredEmailProviders, renderEstateAlertEmail } from './emailService.js';

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

describe('email provider failover configuration', () => {
  it('orders Resend before ZeptoMail in auto mode', () => {
    const previousMode = process.env.EMAIL_PROVIDER;
    const previousResend = process.env.RESEND_API_KEY;
    const previousZepto = process.env.ZEPTOMAIL_TOKEN;
    process.env.EMAIL_PROVIDER = 'auto'; process.env.RESEND_API_KEY = 'resend-test'; process.env.ZEPTOMAIL_TOKEN = 'zepto-test';
    expect(configuredEmailProviders()).toEqual(['resend', 'zeptomail']);
    if (previousMode === undefined) delete process.env.EMAIL_PROVIDER; else process.env.EMAIL_PROVIDER = previousMode;
    if (previousResend === undefined) delete process.env.RESEND_API_KEY; else process.env.RESEND_API_KEY = previousResend;
    if (previousZepto === undefined) delete process.env.ZEPTOMAIL_TOKEN; else process.env.ZEPTOMAIL_TOKEN = previousZepto;
  });

  it('supports forced single-provider modes', () => {
    const previousMode = process.env.EMAIL_PROVIDER;
    const previousResend = process.env.RESEND_API_KEY;
    const previousZepto = process.env.ZEPTOMAIL_TOKEN;
    process.env.RESEND_API_KEY = 'resend-test'; process.env.ZEPTOMAIL_TOKEN = 'zepto-test';
    process.env.EMAIL_PROVIDER = 'resend'; expect(configuredEmailProviders()).toEqual(['resend']);
    process.env.EMAIL_PROVIDER = 'zeptomail'; expect(configuredEmailProviders()).toEqual(['zeptomail']);
    if (previousMode === undefined) delete process.env.EMAIL_PROVIDER; else process.env.EMAIL_PROVIDER = previousMode;
    if (previousResend === undefined) delete process.env.RESEND_API_KEY; else process.env.RESEND_API_KEY = previousResend;
    if (previousZepto === undefined) delete process.env.ZEPTOMAIL_TOKEN; else process.env.ZEPTOMAIL_TOKEN = previousZepto;
  });
});
