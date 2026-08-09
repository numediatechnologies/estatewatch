export interface MarketDirectContactPayload {
  firstName: string;
  surname: string;
  email: string;
  phoneNumber?: string;
  product: string;
  message: string;
  company?: string;
  submissionId: string;
  followUpPriority: 'low' | 'normal' | 'high' | 'urgent';
}

export function splitContactName(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return { firstName: parts[0] || '', surname: parts.slice(1).join(' ') || 'Contact' };
}

export function buildMarketDirectContactPayload(params: {
  name: string;
  company?: string;
  email: string;
  phone?: string;
  enquiry: string;
  message: string;
  submissionId: string;
  followUpPriority?: MarketDirectContactPayload['followUpPriority'];
}): MarketDirectContactPayload {
  const { firstName, surname } = splitContactName(params.name);
  return {
    firstName,
    surname,
    email: params.email,
    phoneNumber: params.phone || '',
    product: params.enquiry,
    message: params.message,
    company: params.company || '',
    submissionId: params.submissionId,
    followUpPriority: params.followUpPriority || 'normal',
  };
}

export async function sendContactToMarketDirectCrm(payload: MarketDirectContactPayload) {
  const url = process.env.LEADS_CONTACT_WEBHOOK_URL || 'https://leads.marketdirect.co.za/api/ingest/marketdirect-contact';
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);
  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (process.env.LEADS_CONTACT_WEBHOOK_KEY) headers['x-marketdirect-contact-key'] = process.env.LEADS_CONTACT_WEBHOOK_KEY;
    const response = await fetch(url, { method: 'POST', headers, body: JSON.stringify(payload), signal: controller.signal });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) return { success: false, error: result.error || `CRM returned ${response.status}.` };
    return { success: true, leadId: result.leadId as string | undefined };
  } catch (error: any) {
    return { success: false, error: error?.name === 'AbortError' ? 'CRM request timed out.' : error?.message || 'CRM request failed.' };
  } finally {
    clearTimeout(timeout);
  }
}
