import { estateDetailUrl } from './emailService.js';

export interface SmsParams {
  to: string;
  estateId: string;
  estateName: string;
  estateNumber: string;
  province: string;
}

export function normalizeSmsRecipient(value: string) {
  const recipient = value.trim().replace(/[\s()-]/g, '').replace(/^\+/, '');
  if (!/^\d{10,15}$/.test(recipient)) throw new Error('A valid international SMS number is required');
  return recipient;
}

export function renderEstateAlertSms(params: SmsParams) {
  return `EstateWatch match: ${params.estateName}, estate ${params.estateNumber}, ${params.province}. View record: ${estateDetailUrl(params.estateId)}`;
}

export async function sendEstateAlertSms(params: SmsParams) {
  const apiKey = process.env.CLICKATELL_API_KEY;
  if (!apiKey) return { success: false as const, error: 'CLICKATELL_API_KEY not configured' };
  try {
    const url = new URL('https://platform.clickatell.com/messages/http/send');
    url.searchParams.set('apiKey', apiKey);
    url.searchParams.set('to', normalizeSmsRecipient(params.to));
    url.searchParams.set('content', renderEstateAlertSms(params));
    const response = await fetch(url, { method: 'GET', signal: AbortSignal.timeout(15_000) });
    const body: any = await response.json().catch(() => ({}));
    if (!response.ok || body.error || body.errorCode) return { success: false as const, error: body.errorDescription || body.error || `Clickatell HTTP ${response.status}` };
    return { success: true as const, messageId: body.messages?.[0]?.apiMessageId || body.apiMessageId || body.messageId };
  } catch (error: any) {
    return { success: false as const, error: error.message || 'Clickatell request failed' };
  }
}
