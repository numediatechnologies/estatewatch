import { Resend } from 'resend';

export interface EmailParams {
  to: string; subject: string; estateName: string; estateNumber: string; province: string; district: string;
  valueBand: string; executorName: string; executorContact: string; executorEmail: string; gazetteRef: string;
  rawSnippet: string; alertName: string; recipientName?: string; matchReasons?: string[]; idNumberMasked?: string;
  dateOfDeath?: string; gazetteDate?: string; claimPeriodDays?: number; sourceUrl?: string;
}

const escapeHtml = (value: unknown) => String(value ?? '').replace(/[&<>'"]/g, (character) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;',
}[character] || character));

export function renderEstateAlertEmail(params: EmailParams) {
  const appUrl = process.env.APP_URL || 'http://localhost:3000';
  const greeting = params.recipientName ? `Hello ${params.recipientName}` : 'Hello';
  const reasons = params.matchReasons?.length ? params.matchReasons.join(' · ') : 'Your saved alert criteria';
  const rows = [
    ['Estate reference', params.estateNumber], ['Province / office', `${params.province} · ${params.district}`],
    ['Date of death', params.dateOfDeath || 'Not published'], ['Identity number', params.idNumberMasked || 'Not published'],
    ['Representative', params.executorName || 'Not published'], ['Claim period', params.claimPeriodDays ? `${params.claimPeriodDays} days` : 'Not published'],
    ['Gazette', `${params.gazetteRef}${params.gazetteDate ? ` · ${params.gazetteDate}` : ''}`],
  ];
  const htmlRows = rows.map(([label, value]) => `<tr><td style="padding:10px 0;color:#64748b;border-bottom:1px solid #e2e8f0;width:38%">${escapeHtml(label)}</td><td style="padding:10px 0;color:#0f172a;font-weight:600;border-bottom:1px solid #e2e8f0">${escapeHtml(value)}</td></tr>`).join('');
  const html = `<!doctype html><html><body style="margin:0;background:#f1f5f9;font-family:Arial,sans-serif;color:#0f172a"><div style="display:none">EstateWatch matched ${escapeHtml(params.estateName)}</div><table width="100%" role="presentation"><tr><td align="center" style="padding:28px 12px"><table width="100%" role="presentation" style="max-width:620px;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 8px 30px rgba(15,23,42,.08)"><tr><td style="background:#0f172a;padding:28px"><div style="color:#f59e0b;font-size:12px;font-weight:700;letter-spacing:1px">ESTATEWATCH · VERIFIED GAZETTE ALERT</div><h1 style="color:#fff;font-size:25px;margin:10px 0 6px">A saved alert has matched</h1><p style="color:#cbd5e1;margin:0">${escapeHtml(reasons)}</p></td></tr><tr><td style="padding:28px"><p style="margin-top:0">${escapeHtml(greeting)},</p><p>EstateWatch found a new Government Gazette record matching <strong>${escapeHtml(params.alertName)}</strong>.</p><h2 style="font-size:21px;margin:24px 0 6px">${escapeHtml(params.estateName)}</h2><table width="100%" role="presentation" style="border-collapse:collapse">${htmlRows}</table><div style="text-align:center;margin:28px 0"><a href="${escapeHtml(appUrl)}" style="display:inline-block;background:#f59e0b;color:#0f172a;text-decoration:none;font-weight:700;padding:13px 22px;border-radius:10px">View estate in EstateWatch</a></div><p style="font-size:12px;line-height:1.6;color:#64748b">This alert is based on a public Government Gazette notice. Identity numbers are masked. Verify the source notice before taking professional action.</p></td></tr><tr><td style="background:#f8fafc;padding:18px 28px;color:#64748b;font-size:12px">EstateWatch · Respectful, factual estate monitoring</td></tr></table></td></tr></table></body></html>`;
  const text = `${greeting},\n\nEstateWatch matched ${params.alertName}: ${params.estateName}\n${rows.map(([label, value]) => `${label}: ${value}`).join('\n')}\n\nView: ${appUrl}\n\nSource: public Government Gazette. Identity numbers are masked.`;
  return { html, text };
}

export async function sendEstateAlertEmail(params: EmailParams) {
  if (!process.env.RESEND_API_KEY) return { success: false, error: 'RESEND_API_KEY not configured' };
  const content = renderEstateAlertEmail(params);
  const resend = new Resend(process.env.RESEND_API_KEY);
  const { data, error } = await resend.emails.send({
    from: process.env.RESEND_FROM || 'EstateWatch <alerts@tenders.marketdirect.co.za>',
    to: [params.to], subject: params.subject, html: content.html, text: content.text,
    headers: { 'X-Entity-Ref-ID': `${params.estateNumber}-${Date.now()}` },
  });
  if (error) return { success: false, error: error.message };
  return { success: true, messageId: data?.id, recipient: params.to };
}
