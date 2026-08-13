import React, { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, Loader2, RefreshCw } from 'lucide-react';
import { fetchAdminIncidents, OperationalIncident, resolveAdminIncident } from '../services/api';

export const AdminOperationalIncidentsView: React.FC = () => {
  const [incidents, setIncidents] = useState<OperationalIncident[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const load = async () => {
    setError('');
    setLoading(true);
    try {
      const result = await fetchAdminIncidents();
      if (!result) setError('Operational incidents could not be loaded.');
      else setIncidents(result);
    } catch {
      setError('Operational incidents could not be loaded.');
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { void load(); }, []);
  const resolve = async (id: string) => {
    setError('');
    setResolvingId(id);
    try {
      if (await resolveAdminIncident(id)) await load();
      else setError('Incident could not be resolved.');
    } catch {
      setError('Incident could not be resolved.');
    } finally {
      setResolvingId(null);
    }
  };
  return <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
    <div className="flex items-start justify-between gap-4"><div><h2 className="font-bold text-white text-sm flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-rose-400" />Operational incidents</h2><p className="text-xs text-slate-400 mt-1">Cron, alert-delivery, and provider failures are retained here even when email delivery fails.</p></div><button type="button" onClick={() => void load()} disabled={loading} aria-busy={loading} className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl border border-slate-700 bg-slate-800 text-slate-300 transition-colors hover:bg-slate-700 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 disabled:cursor-not-allowed disabled:opacity-50" aria-label={loading ? 'Refreshing incidents' : 'Refresh incidents'}>{loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}</button></div>
    {error && <p className="mt-3 text-xs text-rose-400" role="alert" aria-live="assertive">{error}</p>}
    {loading && incidents.length === 0 && !error && <p className="mt-4 text-xs text-slate-400" role="status">Loading operational incidents…</p>}
    {!loading && !error && incidents.length === 0 && <p className="mt-4 text-xs text-emerald-400" role="status">No operational incidents recorded.</p>}
    <div className="space-y-2 mt-4">{incidents.map(incident => <div key={incident.id} className={`rounded-xl border p-3 ${incident.status === 'open' ? 'border-rose-900/70 bg-rose-950/20' : 'border-slate-800 bg-slate-950/40'}`}>
      <div className="flex items-start justify-between gap-3"><div className="min-w-0"><div className="text-xs font-bold text-slate-200">{incident.summary}</div><div className="text-[10px] text-slate-500 mt-1">{incident.incident_type} · {incident.severity} · {new Date(incident.last_occurred_at).toLocaleString()} · {incident.occurrence_count} occurrence(s)</div></div>{incident.status === 'open' ? <button type="button" disabled={resolvingId !== null} onClick={() => void resolve(incident.id)} className="inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-lg bg-slate-800 px-3 py-1 text-[10px] font-bold text-emerald-300 transition-colors hover:bg-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 disabled:cursor-not-allowed disabled:opacity-50" aria-label={`Resolve incident: ${incident.summary}`}>{resolvingId === incident.id && <Loader2 className="w-3 h-3 animate-spin" />}{resolvingId === incident.id ? 'Resolving…' : 'Resolve'}</button> : <CheckCircle2 className="w-4 h-4 text-emerald-400" aria-label="Resolved" />}</div>
      <p className="text-[11px] text-slate-400 mt-2 whitespace-pre-wrap break-words">{incident.detail}</p>
      <div className="text-[10px] text-slate-500 mt-2">Provider: {incident.provider || '—'} · Email notice: {incident.email_status || 'not sent'}</div>
    </div>)}</div>
  </div>;
};
