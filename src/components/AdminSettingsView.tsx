import React, { useEffect, useState } from 'react';
import { CheckCircle2, Mail, Save, Settings, ShieldCheck, Send } from 'lucide-react';
import { AdminSettings, fetchAdminSettings, sendAdminTestEmail, updateAdminSettings } from '../services/api';

export const AdminSettingsView: React.FC = () => {
  const [settings, setSettings] = useState<AdminSettings | null>(null);
  const [legalCompanyName, setLegalCompanyName] = useState('NuMedia Direct Marketing (Pty) Ltd');
  const [tradingName, setTradingName] = useState('EstateWatch');
  const [notificationEmail, setNotificationEmail] = useState('');
  const [testEmail, setTestEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

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
    const result = await updateAdminSettings({ legalCompanyName, tradingName, notificationEmail });
    setSaving(false);
    if (!result) return setError('Settings were not saved. Nothing was changed.');
    setSettings(result);
    setMessage('Settings saved successfully.');
  };

  const sendTest = async () => {
    setError(''); setMessage('');
    const result = await sendAdminTestEmail(testEmail);
    if (!result.success) return setError(result.error || 'Test email was not sent.');
    setMessage(`Test email sent to ${testEmail}. Check inbox and spam folders.`);
  };

  return <div className="space-y-6">
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
      <div className="flex items-center gap-2 text-amber-400 font-bold text-sm"><Settings className="w-5 h-5" />Administrator settings</div>
      <p className="text-xs text-slate-300 mt-2 max-w-3xl">Manage the company identity shown in EstateWatch and verify operational email delivery. Authentication verification and password-reset messages are sent by Neon Auth.</p>
    </div>

    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <form onSubmit={save} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
        <h2 className="font-bold text-white text-sm">Company identity</h2>
        <label className="block text-xs font-semibold text-slate-300">Legal company name
          <input value={legalCompanyName} onChange={(e) => setLegalCompanyName(e.target.value)} required maxLength={255} className="mt-1 w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white" />
        </label>
        <label className="block text-xs font-semibold text-slate-300">Trading name
          <input value={tradingName} onChange={(e) => setTradingName(e.target.value)} required maxLength={255} className="mt-1 w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white" />
        </label>
        <label className="block text-xs font-semibold text-slate-300">Operational notification email
          <input type="email" value={notificationEmail} onChange={(e) => setNotificationEmail(e.target.value)} required className="mt-1 w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white" />
        </label>
        <div className="text-[11px] text-slate-500">Admin login email is controlled by the production <code>ADMIN_EMAIL</code> setting and cannot be changed here.</div>
        <button disabled={saving} className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-bold text-xs rounded-xl flex items-center gap-2"><Save className="w-4 h-4" />{saving ? 'Saving…' : 'Save settings'}</button>
      </form>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
        <h2 className="font-bold text-white text-sm">Delivery diagnostics</h2>
        <div className="space-y-2 text-xs">
          <div className="flex items-center justify-between"><span className="text-slate-400">Neon Auth configured</span><span className={settings?.neonAuthConfigured ? 'text-emerald-400' : 'text-rose-400'}>{settings?.neonAuthConfigured ? 'Yes' : 'No'}</span></div>
          <div className="flex items-center justify-between"><span className="text-slate-400">Resend configured</span><span className={settings?.resendConfigured ? 'text-emerald-400' : 'text-rose-400'}>{settings?.resendConfigured ? 'Yes' : 'No'}</span></div>
          <div className="flex items-center justify-between"><span className="text-slate-400">ZeptoMail configured</span><span className={settings?.zeptomailConfigured ? 'text-emerald-400' : 'text-rose-400'}>{settings?.zeptomailConfigured ? 'Yes' : 'No'}</span></div>
          <div className="flex items-center justify-between"><span className="text-slate-400">Provider mode</span><span className="text-slate-200">{settings?.emailProvider || 'auto'}</span></div>
          <div className="flex items-center justify-between"><span className="text-slate-400">Admin login email</span><span className="text-slate-200">{settings?.adminEmail || 'Not configured'}</span></div>
        </div>
        <div className="border-t border-slate-800 pt-4 space-y-2">
          <label className="block text-xs font-semibold text-slate-300">Send operational test email to
            <input type="email" value={testEmail} onChange={(e) => setTestEmail(e.target.value)} placeholder="you@example.com" className="mt-1 w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white" />
          </label>
          <button type="button" onClick={() => void sendTest()} className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-xl border border-slate-700 flex items-center gap-2"><Send className="w-4 h-4 text-amber-400" />Send test email</button>
        </div>
          <div className="text-[11px] text-slate-500 flex items-start gap-2"><ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />These providers are for transactional EstateWatch email only. Registration, verification, and password-reset emails are handled separately by Neon Auth.</div>
      </div>
    </div>
    {message && <p role="status" className="text-xs text-emerald-400 font-semibold flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4" />{message}</p>}
    {error && <p role="alert" className="text-xs text-rose-400 font-semibold flex items-center gap-1.5"><Mail className="w-4 h-4" />{error}</p>}
  </div>;
};
