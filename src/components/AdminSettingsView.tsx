import React, { useEffect, useState } from 'react';
import { CheckCircle2, ExternalLink, Loader2, Mail, Save, Settings, ShieldCheck, Send } from 'lucide-react';
import { AdminSettings, fetchAdminSettings, sendAdminTestEmail, updateAdminSettings } from '../services/api';
import { AdminEntitlementsView } from './AdminEntitlementsView';
import { AdminOperationalIncidentsView } from './AdminOperationalIncidentsView';
import { BrandName } from './BrandName';
import { AdminDataQualityView } from './AdminDataQualityView';
import { GEO_LOCATIONS, ROBOTS_URL, SITE_URL, SITEMAP_URL } from '../seo';

export const AdminSettingsView: React.FC = () => {
  const [settings, setSettings] = useState<AdminSettings | null>(null);
  const [legalCompanyName, setLegalCompanyName] = useState('NuMedia Direct Marketing (Pty) Ltd');
  const [tradingName, setTradingName] = useState('ESTATEWATCH');
  const [notificationEmail, setNotificationEmail] = useState('');
  const [testEmail, setTestEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [sendingTest, setSendingTest] = useState(false);

  useEffect(() => {
    void fetchAdminSettings().then((result) => {
      if (!result) return setError('Settings could not be loaded.');
      setSettings(result);
      setLegalCompanyName(result.legalCompanyName);
      setTradingName(result.tradingName);
      setNotificationEmail(result.notificationEmail);
      setTestEmail(result.notificationEmail);
    });
  }, []);

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true); setError(''); setMessage('');
    try {
      const result = await updateAdminSettings({ legalCompanyName, tradingName, notificationEmail });
      if (!result) return setError('Settings were not saved. Nothing was changed.');
      setSettings(result);
      setMessage('Settings saved successfully.');
    } catch {
      setError('Settings were not saved. Nothing was changed.');
    } finally {
      setSaving(false);
    }
  };

  const sendTest = async () => {
    const recipient = testEmail.trim();
    if (!recipient || !/^\S+@\S+\.\S+$/.test(recipient)) {
      setError('Enter a valid email address before sending a test email.');
      setMessage('');
      return;
    }
    setError(''); setMessage('');
    setSendingTest(true);
    try {
      const result = await sendAdminTestEmail(recipient);
      if (!result.success) return setError(result.error || 'Test email was not sent.');
      setMessage(`Test email sent to ${recipient} via ${result.provider || 'configured provider'}. Check inbox and spam folders.`);
    } catch {
      setError('Test email was not sent.');
    } finally {
      setSendingTest(false);
    }
  };

  return <div className="space-y-6">
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
      <div className="flex items-center gap-2 text-amber-400 font-bold text-sm"><Settings className="w-5 h-5" />Administrator settings</div>
      <p className="text-xs text-slate-300 mt-2 max-w-3xl">Manage the company identity shown in <BrandName /> and verify operational email delivery. Registration, verification and password-reset messages are handled by the secure authentication service.</p>
    </div>

    <section className="bg-slate-900 border border-amber-500/20 rounded-2xl p-5 space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div><h2 className="font-bold text-white text-sm">SEO and sitemap</h2><p className="text-xs text-slate-400 mt-1">Read-only crawl plan for the public EstateWatch pages.</p></div>
        <span className="text-[11px] font-bold text-emerald-400">{GEO_LOCATIONS.length + 1} canonical URLs</span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
        <a href={SITEMAP_URL} target="_blank" rel="noopener noreferrer" className="rounded-xl border border-slate-800 bg-slate-950 p-3 hover:border-amber-500/50"><span className="block text-slate-500 mb-1">Sitemap</span><span className="text-amber-300 break-all flex items-center gap-1">{SITEMAP_URL}<ExternalLink className="w-3 h-3 shrink-0" /></span></a>
        <a href={ROBOTS_URL} target="_blank" rel="noopener noreferrer" className="rounded-xl border border-slate-800 bg-slate-950 p-3 hover:border-amber-500/50"><span className="block text-slate-500 mb-1">Robots policy</span><span className="text-amber-300 break-all flex items-center gap-1">{ROBOTS_URL}<ExternalLink className="w-3 h-3 shrink-0" /></span></a>
        <div className="rounded-xl border border-slate-800 bg-slate-950 p-3"><span className="block text-slate-500 mb-1">Canonical domain</span><span className="text-slate-200 break-all">{SITE_URL}</span></div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-slate-300">
        <p><strong className="text-slate-100">Included:</strong> homepage, South Africa hub, nine province pages and key Master’s Office city pages. Each page has a unique title, description, canonical URL, Open Graph image and JSON-LD.</p>
        <p><strong className="text-slate-100">Excluded:</strong> individual estate records, identity numbers, alert criteria, account/admin screens, API routes and subscriber-only Gazette documents.</p>
      </div>
      <p className="text-[11px] text-slate-500">Sitemap and social assets are regenerated during the production build. Manual sitemap command: <code className="text-slate-300">npm run seo:generate</code>.</p>
    </section>

    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <form onSubmit={save} aria-busy={saving} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
        <h2 className="font-bold text-white text-sm">Company identity</h2>
        <label className="block text-xs font-semibold text-slate-300">Legal company name
          <input disabled={saving} value={legalCompanyName} onChange={(e) => setLegalCompanyName(e.target.value)} required maxLength={255} className="mt-1 w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white disabled:cursor-not-allowed disabled:opacity-60 focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400/20" />
        </label>
        <label className="block text-xs font-semibold text-slate-300">Trading name
          <input disabled={saving} value={tradingName} onChange={(e) => setTradingName(e.target.value)} required maxLength={255} className="mt-1 w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white disabled:cursor-not-allowed disabled:opacity-60 focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400/20" />
        </label>
        <label className="block text-xs font-semibold text-slate-300">Operational notification email
          <input disabled={saving} type="email" value={notificationEmail} onChange={(e) => setNotificationEmail(e.target.value)} required className="mt-1 w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white disabled:cursor-not-allowed disabled:opacity-60 focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400/20" />
        </label>
        <div className="text-[11px] text-slate-500">Admin login email is controlled by the production <code>ADMIN_EMAIL</code> setting and cannot be changed here.</div>
        <button type="submit" disabled={saving} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-amber-500 px-4 py-2.5 text-xs font-bold text-slate-950 transition-colors hover:bg-amber-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 disabled:cursor-not-allowed disabled:opacity-50"><>{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}</>{saving ? 'Saving…' : 'Save settings'}</button>
      </form>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
        <h2 className="font-bold text-white text-sm">Delivery diagnostics</h2>
        <div className="space-y-2 text-xs">
          <div className="flex items-center justify-between"><span className="text-slate-400">Authentication configured</span><span className={settings?.neonAuthConfigured ? 'text-emerald-400' : 'text-rose-400'}>{settings?.neonAuthConfigured ? 'Yes' : 'No'}</span></div>
          <div className="flex items-center justify-between"><span className="text-slate-400">Resend configured</span><span className={settings?.resendConfigured ? 'text-emerald-400' : 'text-rose-400'}>{settings?.resendConfigured ? 'Yes' : 'No'}</span></div>
          <div className="flex items-center justify-between"><span className="text-slate-400">ZeptoMail configured</span><span className={settings?.zeptomailConfigured ? 'text-emerald-400' : 'text-rose-400'}>{settings?.zeptomailConfigured ? 'Yes' : 'No'}</span></div>
          <div className="flex items-center justify-between"><span className="text-slate-400">Provider mode</span><span className="text-slate-200">{settings?.emailProvider || 'auto'}</span></div>
          <div className="flex items-center justify-between"><span className="text-slate-400">Admin incident recipient</span><span className={settings?.incidentRecipientConfigured ? 'text-emerald-400' : 'text-rose-400'}>{settings?.incidentRecipientConfigured ? 'Configured' : 'Missing'}</span></div>
          <div className="flex items-center justify-between"><span className="text-slate-400">Admin login email</span><span className="text-slate-200">{settings?.adminEmail || 'Not configured'}</span></div>
        </div>
        <div className="border-t border-slate-800 pt-4 space-y-2">
          <label className="block text-xs font-semibold text-slate-300">Send operational test email to
            <input disabled={sendingTest} type="email" value={testEmail} onChange={(e) => setTestEmail(e.target.value)} placeholder="you@example.com" aria-describedby="test-email-help" className="mt-1 w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white disabled:cursor-not-allowed disabled:opacity-60 focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400/20" />
          </label>
          <p id="test-email-help" className="text-[11px] text-slate-500">A real test message will be sent to this address.</p>
          <button type="button" disabled={sendingTest} onClick={() => void sendTest()} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-xs font-bold text-slate-200 transition-colors hover:bg-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 disabled:cursor-not-allowed disabled:opacity-50">{sendingTest ? <Loader2 className="w-4 h-4 animate-spin text-amber-400" /> : <Send className="w-4 h-4 text-amber-400" />}{sendingTest ? 'Sending…' : 'Send test email'}</button>
        </div>
          <div className="text-[11px] text-slate-500 flex items-start gap-2"><ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />Auto mode tries Resend first and uses ZeptoMail (Zoho) only if Resend fails; it does not intentionally send duplicate copies. Registration, verification, and password-reset emails are handled separately by the secure authentication service.</div>
      </div>
    </div>
    {message && <p role="status" aria-live="polite" className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400"><CheckCircle2 className="w-4 h-4" />{message}</p>}
    {error && <p role="alert" aria-live="assertive" className="flex items-center gap-1.5 text-xs font-semibold text-rose-400"><Mail className="w-4 h-4" />{error}</p>}
    <AdminOperationalIncidentsView />
    <AdminDataQualityView />
    <AdminEntitlementsView />
  </div>;
};
