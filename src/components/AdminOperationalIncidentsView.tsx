import React, { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, RefreshCw } from 'lucide-react';
import { fetchAdminIncidents, OperationalIncident, resolveAdminIncident } from '../services/api';

export const AdminOperationalIncidentsView: React.FC = () => {
  const [incidents, setIncidents] = useState<OperationalIncident[]>([]);
  const [error, setError] = useState('');
  const load = async () => { setError(''); const result = await fetchAdminIncidents(); if (!result) setError('Operational incidents could not be loaded.'); else setIncidents(result); };
  useEffect(() => { void load(); }, []);
  const resolve = async (id: string) => { if (await resolveAdminIncident(id)) await load(); else setError('Incident could not be resolved.'); };
  return <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
    <div className="flex items-center justify-between"><div><h2 className="font-bold text-white text-sm flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-rose-400" />Operational incidents</h2><p className="text-xs text-slate-400 mt-1">Cron, alert-delivery, and provider failures are retained here even when email delivery fails.</p></div><button onClick={() => void load()} className="p-2 rounded-lg bg-slate-800 text-slate-300" aria-label="Refresh incidents"><RefreshCw className="w-4 h-4" /></button></div>
    {error && <p className="text-xs text-rose-400 mt-3" role="alert">{error}</p>}
    {!error && incidents.length === 0 && <p className="text-xs text-emerald-400 mt-4">No operational incidents recorded.</p>}
    <div className="space-y-2 mt-4">{incidents.map(incident => <div key={incident.id} className={`rounded-xl border p-3 ${incident.status === 'open' ? 'border-rose-900/70 bg-rose-950/20' : 'border-slate-800 bg-slate-950/40'}`}>
      <div className="flex items-start justify-between gap-3"><div><div className="text-xs font-bold text-slate-200">{incident.summary}</div><div className="text-[10px] text-slate-500 mt-1">{incident.incident_type} · {incident.severity} · {new Date(incident.last_occurred_at).toLocaleString()} · {incident.occurrence_count} occurrence(s)</div></div>{incident.status === 'open' ? <button onClick={() => void resolve(incident.id)} className="shrink-0 rounded-lg bg-slate-800 px-2 py-1 text-[10px] font-bold text-emerald-300">Resolve</button> : <CheckCircle2 className="w-4 h-4 text-emerald-400" />}</div>
      <p className="text-[11px] text-slate-400 mt-2 whitespace-pre-wrap break-words">{incident.detail}</p>
      <div className="text-[10px] text-slate-500 mt-2">Provider: {incident.provider || '—'} · Email notice: {incident.email_status || 'not sent'}</div>
    </div>)}</div>
  </div>;
};
