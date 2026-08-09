import React, { useState } from 'react';
import { CheckCircle2, Eye, Mail, MapPin, Phone, Send, ShieldCheck } from 'lucide-react';
import { sendContactMessage } from '../services/contactApi';

const INITIAL_FORM = { name: '', company: '', email: '', phone: '', enquiry: '', message: '', website: '' };

export const EstateWatchFooter: React.FC = () => {
  const [form, setForm] = useState(INITIAL_FORM);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);

  const update = (field: keyof typeof INITIAL_FORM, value: string) => setForm(current => ({ ...current, [field]: value }));
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setStatus(''); setError(''); setSending(true);
    const result = await sendContactMessage(form);
    setSending(false);
    if (!result.success) return setError(result.error || 'Your message could not be sent.');
    setStatus(result.message || 'Thanks — your message has been sent.');
    setForm(INITIAL_FORM);
  };

  return <footer className="mt-10 border-t border-slate-800 bg-slate-950" aria-label="EstateWatch footer">
    <div className="max-w-7xl mx-auto px-4 lg:px-6 py-10 space-y-8">
      <section id="contact" className="grid grid-cols-1 lg:grid-cols-[1.35fr_0.85fr] gap-6">
        <form onSubmit={submit} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
          <div><h2 className="text-lg font-bold text-white">Contact EstateWatch</h2><p className="text-xs text-slate-400 mt-1">Need help with alerts, account access or estate notices? Send us your request and we’ll help with the next step.</p></div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="text-xs font-semibold text-slate-300">Name *<input value={form.name} onChange={e => update('name', e.target.value)} required minLength={2} className="mt-1 w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white" /></label>
            <label className="text-xs font-semibold text-slate-300">Company / organisation<input value={form.company} onChange={e => update('company', e.target.value)} className="mt-1 w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white" /></label>
            <label className="text-xs font-semibold text-slate-300">Email *<input type="email" value={form.email} onChange={e => update('email', e.target.value)} required className="mt-1 w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white" /></label>
            <label className="text-xs font-semibold text-slate-300">Phone / WhatsApp<input type="tel" value={form.phone} onChange={e => update('phone', e.target.value)} className="mt-1 w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white" /></label>
          </div>
          <label className="text-xs font-semibold text-slate-300 block">What can we help with? *<select value={form.enquiry} onChange={e => update('enquiry', e.target.value)} required className="mt-1 w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white"><option value="">Select an enquiry type</option><option>EstateWatch alerts</option><option>Registration or account access</option><option>Admin support</option><option>Estate notice support</option><option>Partnership or sales enquiry</option><option>Other</option></select></label>
          <label className="text-xs font-semibold text-slate-300 block">Message *<textarea value={form.message} onChange={e => update('message', e.target.value)} required minLength={10} rows={4} placeholder="Tell us what you need help with." className="mt-1 w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white resize-y" /></label>
          <input value={form.website} onChange={e => update('website', e.target.value)} tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" />
          <button disabled={sending} className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-bold text-xs rounded-xl flex items-center gap-2"><Send className="w-4 h-4" />{sending ? 'Sending…' : 'Send request'}</button>
          {status && <p role="status" className="text-xs text-emerald-400 flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4" />{status}</p>}
          {error && <p role="alert" className="text-xs text-rose-400">{error}</p>}
        </form>
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 self-start">
          <h2 className="text-sm font-bold text-white">Speak to us directly</h2>
          <p className="text-xs text-slate-400 leading-relaxed">We’re available during normal business hours to help you take a clear next step.</p>
          <div className="space-y-3 text-xs text-slate-300"><div className="flex gap-2"><ShieldCheck className="w-4 h-4 text-amber-400 shrink-0" /><span><strong>Business hours</strong><br />9am to 5pm, Monday to Friday</span></div><div className="flex gap-2"><Phone className="w-4 h-4 text-amber-400 shrink-0" /><span><strong>Phone</strong><br /><a className="text-amber-300 hover:underline" href="tel:+27876312599">087 631 2599</a></span></div><div className="flex gap-2"><Mail className="w-4 h-4 text-amber-400 shrink-0" /><span><strong>Email</strong><br /><a className="text-amber-300 hover:underline" href="mailto:sales@marketdirect.co.za">sales@marketdirect.co.za</a></span></div><div className="flex gap-2"><MapPin className="w-4 h-4 text-amber-400 shrink-0" /><span><strong>Address</strong><br />10 Falcon Lane, Sandton, Gauteng, 2191</span></div></div>
          <a href="https://wa.me/27637911099" target="_blank" rel="noopener noreferrer" className="block text-center px-4 py-2.5 border border-emerald-500/50 text-emerald-300 hover:bg-emerald-500/10 rounded-xl text-xs font-bold">Chat on WhatsApp</a>
        </div>
      </section>

      <div className="border-t border-slate-800 pt-6 grid grid-cols-1 md:grid-cols-[1.3fr_1fr_1fr] gap-6 text-xs">
        <div><div className="flex items-center gap-2 text-white font-bold"><span className="w-8 h-8 rounded-lg bg-amber-500/15 text-amber-400 flex items-center justify-center"><Eye className="w-4 h-4" /></span>ESTATE<span className="text-amber-400">WATCH</span></div><p className="text-slate-500 mt-3 leading-relaxed">Clear estate notices. Practical alerts. A simple next step.</p></div>
        <div><h3 className="text-slate-300 font-bold mb-3">EstateWatch</h3><div className="space-y-2 text-slate-500"><a className="block hover:text-amber-300" href="#contact">Contact us</a><a className="block hover:text-amber-300" href="#popia">POPIA & legal basis</a><a className="block hover:text-amber-300" href="mailto:sales@marketdirect.co.za">Sales support</a></div></div>
        <div><h3 className="text-slate-300 font-bold mb-3">Legal</h3><p className="text-slate-500 leading-relaxed">EstateWatch is operated by NuMedia Direct Marketing (Pty) Ltd.</p><div className="flex gap-3 mt-3"><a className="text-slate-500 hover:text-amber-300" href="#popia">Privacy</a><a className="text-slate-500 hover:text-amber-300" href="#popia">Terms</a></div></div>
      </div>
      <div className="border-t border-slate-900 pt-4 text-[11px] text-slate-600 flex flex-col sm:flex-row justify-between gap-2"><span>© {new Date().getFullYear()} NuMedia Direct Marketing (Pty) Ltd. All rights reserved.</span><span>EstateWatch · by MarketDirect.co.za</span></div>
    </div>
  </footer>;
};
