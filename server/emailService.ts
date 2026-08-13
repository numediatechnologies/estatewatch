import { Resend } from 'resend';
import { SendMailClient } from 'zeptomail';

// Resend and ZeptoMail are restricted to EstateWatch transactional/operational
// messages. Authentication verification and password-reset emails stay with
// the secure authentication service.

export interface EmailParams {
  to: string; subject: string; estateId: string; estateName: string; estateNumber: string; province: string; district: string;
  valueBand: string; executorName: string; executorContact: string; executorEmail: string; gazetteRef: string;
  rawSnippet: string; alertName: string; recipientName?: string; matchReasons?: string[]; idNumberMasked?: string;
  dateOfDeath?: string; gazetteDate?: string; claimPeriodDays?: number; sourceUrl?: string;
}

export function estateDetailUrl(estateId: string) {
  const url = new URL(process.env.APP_URL || 'http://localhost:3000');
  url.searchParams.set('estate', estateId);
  return url.toString();
}

const escapeHtml = (value: unknown) => String(value ?? '').replace(/[&<>'"]/g, (character) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;',
}[character] || character));

const brandName = 'EstateWatch';
const parentBrand = 'MarketDirect.co.za';

export function renderBrandedEmail(params: { preheader?: string; title: string; subtitle?: string; content: string; footer?: string }) {
  const footer = params.footer || `${brandName} · A MarketDirect.co.za service · Respectful, factual estate monitoring`;
  const html = `<!doctype html><html><head><meta name="color-scheme" content="light"><meta name="supported-color-schemes" content="light"></head><body style="margin:0;background:#0b0f19;font-family:Arial,sans-serif;color:#0f172a"><div style="display:none;max-height:0;overflow:hidden;opacity:0">${escapeHtml(params.preheader || params.title)}</div><table width="100%" role="presentation" style="background:#0b0f19"><tr><td align="center" style="padding:28px 12px"><table width="100%" role="presentation" style="max-width:620px;background:#fff;border-radius:18px;overflow:hidden;box-shadow:0 12px 36px rgba(2,6,23,.28)"><tr><td style="background:#0f172a;padding:24px 28px"><div style="font-size:13px;font-weight:800;letter-spacing:1.4px"><span style="color:#fff">ESTATE</span><span style="color:#fbbf24">WATCH</span> <span style="color:#94a3b8;font-weight:600">· ${parentBrand}</span></div><h1 style="color:#fff;font-size:25px;line-height:1.2;margin:12px 0 6px">${escapeHtml(params.title)}</h1>${params.subtitle ? `<p style="color:#cbd5e1;margin:0;line-height:1.5">${escapeHtml(params.subtitle)}</p>` : ''}</td></tr><tr><td style="padding:28px">${params.content}</td></tr><tr><td style="background:#f8fafc;padding:18px 28px;color:#64748b;font-size:12px;line-height:1.5">${escapeHtml(footer)}</td></tr></table></td></tr></table></body></html>`;
  return html;
}

export function renderEstateAlertEmail(params: EmailParams) {
  const detailUrl = estateDetailUrl(params.estateId);
  const greeting = params.recipientName ? `Hello ${params.recipientName}` : 'Hello';
  const reasons = params.matchReasons?.length ? params.matchReasons.join(' · ') : 'Your saved alert criteria';
  const rows = [
    ['Estate reference', params.estateNumber], ['Province / office', `${params.province} · ${params.district}`],
    ['Date of death', params.dateOfDeath || 'Not published'], ['Identity number', params.idNumberMasked || 'Not published'],
    ['Representative', params.executorName || 'Not published'], ['Claim period', params.claimPeriodDays ? `${params.claimPeriodDays} days` : 'Not published'],
    ['Gazette', `${params.gazetteRef}${params.gazetteDate ? ` · ${params.gazetteDate}` : ''}`],
  ];
  const htmlRows = rows.map(([label, value]) => `<tr><td style="padding:10px 0;color:#64748b;border-bottom:1px solid #e2e8f0;width:38%">${escapeHtml(label)}</td><td style="padding:10px 0;color:#0f172a;font-weight:600;border-bottom:1px solid #e2e8f0">${escapeHtml(value)}</td></tr>`).join('');
  const html = renderBrandedEmail({ preheader: `EstateWatch matched ${params.estateName}`, title: 'A saved alert has matched', subtitle: reasons, content: `<p style="margin-top:0">${escapeHtml(greeting)},</p><p>EstateWatch found a new Government Gazette record matching <strong>${escapeHtml(params.alertName)}</strong>.</p><h2 style="font-size:21px;margin:24px 0 6px">${escapeHtml(params.estateName)}</h2><table width="100%" role="presentation" style="border-collapse:collapse">${htmlRows}</table><div style="text-align:center;margin:28px 0"><a href="${escapeHtml(detailUrl)}" style="display:inline-block;background:#f59e0b;color:#0f172a;text-decoration:none;font-weight:700;padding:13px 22px;border-radius:10px">View full estate record</a></div><p style="font-size:12px;line-height:1.6;color:#64748b">This alert is based on a public Government Gazette notice. Identity numbers are masked. Verify the source notice before taking professional action.</p>` });
  const text = `${greeting},\n\nEstateWatch matched ${params.alertName}: ${params.estateName}\n${rows.map(([label, value]) => `${label}: ${value}`).join('\n')}\n\nView full estate record: ${detailUrl}\n\nSource: public Government Gazette. Identity numbers are masked.`;
  return { html, text };
}

type EmailProvider = 'resend' | 'zeptomail';
export type EmailAttempt = { provider: EmailProvider; success: boolean; error?: string; ambiguous?: boolean };
type Message = { from?: string; to: string; subject: string; html: string; text: string; replyTo?: string; referenceId?: string; attachments?: Array<{ filename: string; content: Buffer }> };
type EmailResult =
  | { success: true; provider: EmailProvider; messageId?: string; recipient: string; attempts: EmailAttempt[]; providerErrors: string[] }
  | { success: false; error: string; recipient?: string; attempts: EmailAttempt[]; providerErrors: string[] };

export function configuredEmailProviders() {
  const forced = (process.env.EMAIL_PROVIDER || 'auto').toLowerCase();
  const resendConfigured = Boolean(process.env.RESEND_API_KEY);
  const zeptomailConfigured = Boolean(process.env.ZEPTOMAIL_TOKEN);
  if (forced === 'resend') return resendConfigured ? (['resend'] as EmailProvider[]) : [];
  if (forced === 'zeptomail') return zeptomailConfigured ? (['zeptomail'] as EmailProvider[]) : [];
  return [
    ...(resendConfigured ? (['resend'] as EmailProvider[]) : []),
    ...(zeptomailConfigured ? (['zeptomail'] as EmailProvider[]) : []),
  ];
}

function splitSender(value: string) {
  const match = value.match(/^\s*(.*?)\s*<([^>]+)>\s*$/);
  return match ? { name: match[1] || 'EstateWatch', address: match[2] } : { name: 'EstateWatch', address: value.trim() };
}

async function sendWithResend(message: Message) {
  const resend = new Resend(process.env.RESEND_API_KEY);
  const { data, error } = await resend.emails.send({
    from: message.from || process.env.RESEND_FROM || 'EstateWatch <alerts@tenders.marketdirect.co.za>',
    to: [message.to], subject: message.subject, html: message.html, text: message.text,
    ...(message.replyTo ? { replyTo: message.replyTo } : {}),
    ...(message.referenceId ? { headers: { 'X-Entity-Ref-ID': message.referenceId } } : {}),
    ...(message.attachments ? { attachments: message.attachments.map((attachment) => ({ filename: attachment.filename, content: attachment.content })) } : {}),
  } as any);
  if (error) throw new Error(error.message);
  return { messageId: data?.id };
}

async function sendWithZeptoMail(message: Message) {
  const sender = splitSender(message.from || process.env.ZEPTOMAIL_FROM || 'noreply@marketdirect.co.za');
  const client = new SendMailClient({ url: 'https://api.zeptomail.com/v1.1/email', token: process.env.ZEPTOMAIL_TOKEN as string });
  const response = await client.sendMail({
    from: sender,
    to: [{ email_address: { address: message.to, name: message.to.split('@')[0] } }],
    ...(message.replyTo ? { reply_to: [{ address: message.replyTo, name: 'Reply' }] } : {}),
    subject: message.subject, htmlbody: message.html, textbody: message.text,
  });
  const responseRecord = response as { request_id?: string; message_id?: string; data?: { message_id?: string } };
  return { messageId: responseRecord.request_id || responseRecord.message_id || responseRecord.data?.message_id };
}

async function sendEmail(message: Message): Promise<EmailResult> {
  const providers = configuredEmailProviders();
  if (!providers.length) return { success: false, recipient: message.to, error: 'No email provider is configured. Set RESEND_API_KEY or ZEPTOMAIL_TOKEN.', attempts: [], providerErrors: [] };
  const attempts: EmailAttempt[] = [];
  const errors: string[] = [];
  for (const provider of providers) {
    try {
      const result = provider === 'resend' ? await sendWithResend(message) : await sendWithZeptoMail(message);
      attempts.push({ provider, success: true });
      return { success: true, provider, ...result, recipient: message.to, attempts, providerErrors: errors };
    } catch (error: any) {
      const messageText = error?.message || String(error);
      attempts.push({ provider, success: false, error: messageText, ambiguous: Boolean(error?.ambiguous) });
      errors.push(`${provider}: ${messageText}`);
      console.error(`Email delivery failed via ${provider}:`, error);
    }
  }
  return { success: false, recipient: message.to, error: errors.join(' | '), attempts, providerErrors: errors };
}

function defaultSender() {
  return process.env.EMAIL_FROM || process.env.RESEND_FROM || process.env.ZEPTOMAIL_FROM || 'EstateWatch <alerts@tenders.marketdirect.co.za>';
}

export async function sendEstateAlertEmail(params: EmailParams) {
  const content = renderEstateAlertEmail(params);
  return sendEmail({ from: defaultSender(), to: params.to, subject: params.subject, html: content.html, text: content.text, referenceId: `estatewatch:estate:${params.estateId}:${params.to}` });
}

export async function sendIngestionFailureEmail(errorMessage: string) {
  const to = process.env.INGESTION_INCIDENT_EMAIL || process.env.ADMIN_EMAIL;
  if (!to) return { success: false as const, error: 'INGESTION_INCIDENT_EMAIL or ADMIN_EMAIL not configured', attempts: [], providerErrors: [] };
  const occurredAt = new Date().toISOString();
  const dashboardUrl = process.env.APP_URL || 'https://estatewatch.marketdirect.co.za';
  const result = await sendEmail({
    from: defaultSender(), to,
    subject: 'Action needed: EstateWatch Gazette run failed',
    html: renderBrandedEmail({ preheader: 'EstateWatch Gazette run needs attention', title: 'Gazette check needs attention', content: `<p>The scheduled Gazette run could not complete. No partial or invented estate records were published.</p><div style="background:#f8fafc;border-left:4px solid #dc2626;padding:14px;margin:20px 0"><strong>Technical detail</strong><br>${escapeHtml(errorMessage)}</div><p><strong>Time:</strong> ${escapeHtml(occurredAt)}</p><p>The next scheduled run will retry safely. An administrator can also run a protected discovery check.</p><a href="${escapeHtml(dashboardUrl)}" style="display:inline-block;background:#f59e0b;color:#0f172a;text-decoration:none;font-weight:700;padding:12px 18px;border-radius:9px">Open EstateWatch</a>` }),
    text: `EstateWatch Gazette check needs attention\n\nThe scheduled run could not complete. No partial or invented records were published.\n\nTechnical detail: ${errorMessage}\nTime: ${occurredAt}\n\nThe next scheduled run will retry safely.\n${dashboardUrl}`,
  });
  return result;
}

export async function sendTestEmail(to: string) {
  const from = defaultSender();
  return sendEmail({ from, to,
    subject: 'EstateWatch delivery test',
    html: renderBrandedEmail({ title: 'EstateWatch delivery test', content: '<p>This confirms that operational email delivery is working.</p><p>Registration, verification and password-reset emails are handled separately by the secure authentication service.</p>' }),
    text: 'EstateWatch delivery test\n\nThis confirms that operational email delivery is working. Registration, verification and password-reset emails are handled separately by the secure authentication service.',
  });
}

export async function sendBillingDocumentEmail(params: { to: string; document: any; pdf: Buffer }) {
  const invoice = params.document.type === 'invoice';
  const title = invoice ? 'Your paid EstateWatch invoice' : 'Your EstateWatch quote';
  const total = (Number(params.document.total_cents || 0) / 100).toFixed(2);
  const html = renderBrandedEmail({ title, subtitle: params.document.document_number, content: '<p>Hello,</p><p>Your ' + (invoice ? 'paid invoice' : 'quote') + ' is attached. You can also view it in your EstateWatch account.</p><p><strong>Total: R ' + total + '</strong></p>' });
  return sendEmail({ from: defaultSender(), to: params.to, subject: title, html, text: title + '\n\nDocument: ' + params.document.document_number + '\nTotal: R ' + total, referenceId: 'estatewatch:billing:' + params.document.id, attachments: [{ filename: params.document.document_number + '.pdf', content: params.pdf }] });
}

export async function sendContactMessage(params: { name: string; company?: string; email: string; phone?: string; enquiry: string; message: string }) {
  const to = process.env.ADMIN_EMAIL || 'support@marketdirect.co.za';
  const subject = `[EstateWatch Contact] ${params.enquiry} from ${params.name}`;
  const content = `
    <h2 style="margin-top:0">New contact message</h2>
    <table style="border-collapse:collapse;width:100%;max-width:600px">
      <tr><td style="padding:8px 0;color:#64748b;width:30%">Name</td><td style="padding:8px 0;font-weight:600">${escapeHtml(params.name)}</td></tr>
      <tr><td style="padding:8px 0;color:#64748b">Company</td><td style="padding:8px 0">${escapeHtml(params.company || '—')}</td></tr>
      <tr><td style="padding:8px 0;color:#64748b">Email</td><td style="padding:8px 0">${escapeHtml(params.email)}</td></tr>
      <tr><td style="padding:8px 0;color:#64748b">Phone</td><td style="padding:8px 0">${escapeHtml(params.phone || '—')}</td></tr>
      <tr><td style="padding:8px 0;color:#64748b">Enquiry</td><td style="padding:8px 0">${escapeHtml(params.enquiry)}</td></tr>
      <tr><td style="padding:8px 0;color:#64748b;vertical-align:top">Message</td><td style="padding:8px 0;white-space:pre-line">${escapeHtml(params.message)}</td></tr>
    </table>
  `;
  const html = renderBrandedEmail({ title: 'New contact message', content });
  const text = `Name: ${params.name}
Company: ${params.company || '—'}
Email: ${params.email}
Phone: ${params.phone || '—'}
Enquiry: ${params.enquiry}

${params.message}`;
  return sendEmail({ from: defaultSender(), to, replyTo: params.email, subject, html, text, referenceId: `estatewatch:contact:${Date.now()}` });
}
