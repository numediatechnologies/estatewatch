import React, { useEffect, useMemo, useState } from 'react';
import { AlertCriteria, Province } from '../types';
import { BellRing, CheckCircle2, Edit3, Mail, Plus, ShieldCheck, Smartphone, Trash2, X } from 'lucide-react';

interface AlertBuilderViewProps {
  alerts: AlertCriteria[];
  onCreateAlert: (newAlert: AlertCriteria) => Promise<boolean>;
  onUpdateAlert: (alert: AlertCriteria) => Promise<boolean>;
  onToggleAlert: (id: string) => Promise<boolean>;
  onDeleteAlert: (id: string) => Promise<boolean>;
  defaultRecipientEmail?: string;
  defaultOwnerName?: string;
}

const ALL_PROVINCES: Province[] = [
  'Gauteng', 'Western Cape', 'KwaZulu-Natal', 'Eastern Cape', 'Free State',
  'Mpumalanga', 'Limpopo', 'North West', 'Northern Cape',
];

export const AlertBuilderView: React.FC<AlertBuilderViewProps> = ({
  alerts, onCreateAlert, onUpdateAlert, onToggleAlert, onDeleteAlert, defaultRecipientEmail = '', defaultOwnerName = '',
}) => {
  const [editingAlertId, setEditingAlertId] = useState<string | null>(null);
  const [alertName, setAlertName] = useState('Gazette estate alert');
  const [surnameMatch, setSurnameMatch] = useState('');
  const [idNumberMatch, setIdNumberMatch] = useState('');
  const [selectedProvinces, setSelectedProvinces] = useState<Province[]>([]);
  const [recipientEmail, setRecipientEmail] = useState(defaultRecipientEmail);
  const [smsEnabled, setSmsEnabled] = useState(false);
  const [recipientPhone, setRecipientPhone] = useState('');
  const [preserveExistingPhone, setPreserveExistingPhone] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [error, setError] = useState('');
  const [sortBy, setSortBy] = useState<'active' | 'name' | 'created' | 'matches'>('active');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    if (!recipientEmail && defaultRecipientEmail) setRecipientEmail(defaultRecipientEmail);
  }, [defaultRecipientEmail, recipientEmail]);

  const toggleProvince = (province: Province) => setSelectedProvinces((current) =>
    current.includes(province) ? current.filter((item) => item !== province) : [...current, province]);

  const resetForm = () => {
    setEditingAlertId(null);
    setAlertName('Gazette estate alert');
    setSurnameMatch('');
    setIdNumberMatch('');
    setSelectedProvinces([]);
    setRecipientEmail(defaultRecipientEmail);
    setSmsEnabled(false);
    setRecipientPhone('');
    setPreserveExistingPhone(false);
  };

  const startEditing = (alert: AlertCriteria) => {
    setEditingAlertId(alert.id);
    setAlertName(alert.name);
    setSurnameMatch(alert.surnameMatch || '');
    setIdNumberMatch('');
    setSelectedProvinces(alert.provinces);
    setRecipientEmail(alert.recipientEmail || defaultRecipientEmail);
    const savedPhoneIsMasked = Boolean(alert.recipientPhone?.startsWith('***'));
    setSmsEnabled(alert.channels.includes('sms'));
    setPreserveExistingPhone(savedPhoneIsMasked);
    setRecipientPhone(savedPhoneIsMasked ? '' : (alert.recipientPhone || ''));
    setError('');
  };

  const sortedAlerts = useMemo(() => {
    return alerts.map((alert, index) => ({ alert, index })).sort((a, b) => {
      const left = a.alert;
      const right = b.alert;
      let comparison = 0;
      if (sortBy === 'active') comparison = Number(left.isActive) - Number(right.isActive);
      if (sortBy === 'name') comparison = left.name.localeCompare(right.name);
      if (sortBy === 'created') comparison = String(left.createdAt).localeCompare(String(right.createdAt));
      if (sortBy === 'matches') comparison = left.matchCount - right.matchCount;
      if (comparison === 0) comparison = String(left.id).localeCompare(String(right.id)) || a.index - b.index;
      return (sortDirection === 'asc' ? 1 : -1) * comparison;
    }).map(({ alert }) => alert);
  }, [alerts, sortBy, sortDirection]);

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    if (!alertName.trim() || !recipientEmail.trim()) return;
    if (smsEnabled && !recipientPhone.trim() && !preserveExistingPhone) {
      setError('Enter a mobile number before enabling SMS.');
      return;
    }
    const existing = editingAlertId ? alerts.find(alert => alert.id === editingAlertId) : undefined;
    const payload: AlertCriteria = {
      id: editingAlertId || `alt-${Date.now()}`,
      name: alertName.trim(),
      surnameMatch: surnameMatch.trim() || undefined,
      idNumberMatch: idNumberMatch.trim() || undefined,
      provinces: selectedProvinces,
      valueBands: existing?.valueBands || [],
      assetTypes: existing?.assetTypes || [],
      channels: smsEnabled ? ['email', 'sms'] : ['email'],
      isActive: existing?.isActive ?? true,
      matchCount: existing?.matchCount || 0,
      createdAt: existing?.createdAt || new Date().toISOString().split('T')[0],
      recipientEmail: recipientEmail.trim().toLowerCase(),
      recipientPhone: smsEnabled ? (recipientPhone.trim() || (preserveExistingPhone ? existing?.recipientPhone : undefined)) : undefined,
      ownerName: defaultOwnerName || undefined,
    };
    const ok = editingAlertId ? await onUpdateAlert(payload) : await onCreateAlert(payload);
    if (!ok) {
      setError('We could not save this alert. Nothing was changed. Please try again.');
      return;
    }
    resetForm();
    setSavedSuccess(true);
    window.setTimeout(() => setSavedSuccess(false), 3000);
  };

  const handleDelete = async (alert: AlertCriteria) => {
    if (!window.confirm(`Delete “${alert.name}” permanently? This cannot be undone.`)) return;
    setError('');
    const ok = await onDeleteAlert(alert.id);
    if (!ok) setError('We could not delete this alert. It remains active in your list. Please try again.');
    if (ok && editingAlertId === alert.id) resetForm();
  };

  return <div className="space-y-6">
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
      <div className="flex items-center gap-2 text-amber-400 font-bold text-sm"><BellRing className="w-5 h-5" />Simple, reliable Gazette alerts</div>
      <p className="text-xs text-slate-300 leading-relaxed max-w-3xl">
        Start with a South African ID number for the most precise match. You can also use a surname and province. We mask identity numbers and never show the full number after you save an alert.
      </p>
      <div className="flex items-center gap-2 text-[11px] text-emerald-300"><ShieldCheck className="w-4 h-4" />Email is always sent. SMS can be enabled as an optional secondary delivery channel.</div>
    </div>

    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <form onSubmit={handleCreate} className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-5">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h3 className="font-bold text-sm text-white">{editingAlertId ? 'Edit your alert' : 'Set your alert'}</h3>
          {editingAlertId && <button type="button" onClick={resetForm} className="text-xs text-slate-400 hover:text-white flex items-center gap-1"><X className="w-3.5 h-3.5" />Cancel</button>}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <label className="text-xs font-bold text-slate-300">Alert name *
            <input value={alertName} onChange={(event) => setAlertName(event.target.value)} required className="mt-1 w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white focus:border-amber-500" />
          </label>
          <label className="text-xs font-bold text-slate-300">Surname or family name
            <input value={surnameMatch} onChange={(event) => setSurnameMatch(event.target.value)} placeholder="e.g. HOOSAIN" className="mt-1 w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white focus:border-amber-500" />
          </label>
        </div>
        <label className="text-xs font-bold text-slate-300 block">South African ID number <span className="text-amber-400">(highest priority)</span>
          <input inputMode="numeric" autoComplete="off" value={idNumberMatch} onChange={(event) => setIdNumberMatch(event.target.value.replace(/\D/g, '').slice(0, 13))} placeholder="13 digits" pattern="[0-9]{13}" className="mt-1 w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white focus:border-amber-500" />
          <span className="block mt-1 font-normal text-slate-500">Optional. An exact ID match takes priority. We do not store or display the full number.{editingAlertId && alerts.find(alert => alert.id === editingAlertId)?.idNumberMatchMasked ? ' Leave blank to keep the existing exact ID match.' : ''}</span>
        </label>
        <label className="text-xs font-bold text-slate-300 block">Notification email *
          <input type="email" value={recipientEmail} onChange={(event) => setRecipientEmail(event.target.value)} placeholder="you@example.com" required className="mt-1 w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white focus:border-amber-500" />
        </label>
        <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3">
          <label className="flex items-center justify-between gap-3 text-xs font-bold text-slate-300">
            <span className="flex items-center gap-2"><Smartphone className="w-4 h-4 text-purple-400" />Also send an SMS</span>
            <input type="checkbox" checked={smsEnabled} onChange={(event) => { setSmsEnabled(event.target.checked); if (!event.target.checked) setPreserveExistingPhone(false); }} className="accent-amber-500" />
          </label>
          {smsEnabled && <label className="text-xs font-bold text-slate-300 block">Mobile number in international format *
            <input type="tel" value={recipientPhone} onChange={(event) => { setRecipientPhone(event.target.value); setPreserveExistingPhone(false); }} placeholder={preserveExistingPhone ? `Saved number ending ${alerts.find(alert => alert.id === editingAlertId)?.recipientPhone?.slice(-4) || '••••'}` : '27610421779'} pattern="\+?[0-9]{10,15}" required={!preserveExistingPhone} className="mt-1 w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white focus:border-amber-500" />
            <span className="block mt-1 font-normal text-slate-500">{preserveExistingPhone ? 'The saved number will be kept unless you enter a replacement.' : 'SMS delivery is best-effort. A failure never prevents the email alert.'}</span>
          </label>}
        </div>
        <div className="space-y-2">
          <div className="text-xs font-bold text-slate-300">Province or Master’s Office area <span className="font-normal text-slate-500">(optional; none means all provinces)</span></div>
          <div className="flex flex-wrap gap-2">{ALL_PROVINCES.map((province) => <button type="button" key={province} onClick={() => toggleProvince(province)} className={`px-3 py-1.5 rounded-xl text-xs font-semibold border ${selectedProvinces.includes(province) ? 'bg-amber-500/20 text-amber-400 border-amber-500/40' : 'bg-slate-950 text-slate-400 border-slate-800'}`}>{province}</button>)}</div>
        </div>
        <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl text-xs text-slate-300 leading-relaxed">
          {idNumberMatch ? <>Email me only for the exact ID <strong className="text-white">{idNumberMatch.slice(0, 6)}****{idNumberMatch.slice(-3)}</strong>. This overrides surname and province.</> : <>Email me when a newly ingested J193 record {surnameMatch.trim() ? <>contains surname <strong className="text-white">{surnameMatch.trim()}</strong></> : 'matches any surname'} in <strong className="text-white">{selectedProvinces.join(', ') || 'any province'}</strong>.</>}
        </div>
        <div className="flex items-center justify-between gap-3">
          {savedSuccess ? <span className="text-xs text-emerald-400 font-bold flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4" />Great! Your alert is active.</span> : <span />}
          <button type="submit" className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl flex items-center gap-2"><>{editingAlertId ? <Edit3 className="w-4 h-4" /> : <Plus className="w-4 h-4" />}</>{editingAlertId ? 'Save Changes' : 'Start Alert'}</button>
        </div>
        {error && <p role="alert" className="text-xs text-rose-400 font-semibold">{error}</p>}
      </form>

      <div className="space-y-4">
        <div className="flex items-center justify-between gap-2"><h3 className="font-bold text-sm text-white flex items-center gap-2"><BellRing className="w-4 h-4 text-amber-400" />Your alerts ({alerts.length})</h3><div className="flex items-center gap-1"><select value={sortBy} onChange={(event) => setSortBy(event.target.value as typeof sortBy)} className="bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-[10px] text-slate-300"><option value="active">Active first</option><option value="name">Name</option><option value="created">Created</option><option value="matches">Matches</option></select><button type="button" onClick={() => setSortDirection(current => current === 'asc' ? 'desc' : 'asc')} className="px-2 py-1 bg-slate-950 border border-slate-800 rounded-lg text-[10px] text-slate-300">{sortDirection === 'asc' ? '↑' : '↓'}</button></div></div>
        {sortedAlerts.map((alert) => <div key={alert.id} className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
          <div className="flex items-start justify-between gap-2"><div><h4 className="font-bold text-xs text-white">{alert.name}</h4><span className="text-[10px] text-slate-500">Created {alert.createdAt}</span></div><button onClick={() => void onToggleAlert(alert.id)} className={`px-2 py-0.5 rounded text-[10px] font-bold ${alert.isActive ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-slate-800 text-slate-500'}`}>{alert.isActive ? 'ACTIVE' : 'PAUSED'}</button></div>
          <div className="text-[11px] text-slate-400 space-y-1">
            {alert.idNumberMatchMasked && <div>Exact ID: <strong className="text-amber-300">{alert.idNumberMatchMasked}</strong> (priority)</div>}
            <div>Surname: <strong className="text-slate-200">{alert.surnameMatch || 'Any'}</strong></div>
            <div>Province: <strong className="text-slate-200">{alert.provinces.length ? alert.provinces.join(', ') : 'All'}</strong></div>
            <div className="flex items-center gap-1"><Mail className="w-3 h-3" /><span>{alert.recipientEmail || 'Recipient not configured'}</span></div>
            {alert.channels.includes('sms') && <div className="flex items-center gap-1"><Smartphone className="w-3 h-3" /><span>{alert.recipientPhone || 'SMS number not configured'}</span></div>}
          </div>
          <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-[10px] text-slate-500"><span>Matches: <strong className="text-white">{alert.matchCount}</strong>{alert.deliveryState === 'paused' && <strong className="ml-2 text-amber-400">Paused — subscription required</strong>}</span><div className="flex items-center gap-2"><button onClick={() => startEditing(alert)} title="Edit alert" className="p-1 hover:text-amber-400"><Edit3 className="w-3.5 h-3.5" /></button><button onClick={() => void handleDelete(alert)} title="Delete alert" className="p-1 hover:text-red-400"><Trash2 className="w-3.5 h-3.5" /></button></div></div>
        </div>)}
      </div>
    </div>
  </div>;
};
