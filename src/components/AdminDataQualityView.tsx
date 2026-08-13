import React, { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, Database, Loader2, RefreshCw, ShieldCheck } from 'lucide-react';
import { DataQualityReport, fetchAdminDataQuality } from '../services/api';

const number = (value: number | undefined) => (value || 0).toLocaleString();

export const AdminDataQualityView: React.FC = () => {
  const [report, setReport] = useState<DataQualityReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const load = () => {
    setLoading(true);
    setError('');
    void fetchAdminDataQuality()
      .then((result) => {
        if (!result) setError('Data quality report could not be loaded.');
        else setReport(result);
      })
      .catch(() => setError('Data quality report could not be loaded.'))
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  if (loading && !report) return <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 text-xs text-slate-400" role="status">Loading Gazette data quality…</div>;
  if (!report) return <div className="rounded-2xl border border-rose-500/30 bg-rose-950/20 p-5 text-xs text-rose-300" role="alert">{error || 'Data quality report could not be loaded.'}<button type="button" onClick={load} disabled={loading} className="ml-3 inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-rose-400/40 px-3 py-1.5 text-[11px] font-bold text-rose-200 hover:bg-rose-500/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-300 disabled:cursor-not-allowed disabled:opacity-50">{loading && <Loader2 className="w-3 h-3 animate-spin" />}Retry</button></div>;
  const healthy = !report.summary.outside_window && !report.summary.missing_provenance && !report.summary.missing_required && !report.duplicateCount;
  return <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5 space-y-4">
    <div className="flex items-center justify-between gap-3">
      <div className="min-w-0"><div className="flex items-center gap-2 text-amber-400 font-bold text-sm"><Database className="w-5 h-5" />Gazette data quality</div><p className="mt-1 text-[11px] text-slate-400">Live records are limited to the latest four months by Gazette publication date. Legacy rows remain restricted to quarantine.</p></div>
      <button type="button" onClick={load} disabled={loading} aria-busy={loading} className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-xl border border-slate-700 bg-slate-800 text-slate-300 transition-colors hover:bg-slate-700 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 disabled:cursor-not-allowed disabled:opacity-50" aria-label={loading ? 'Refreshing data quality' : 'Refresh data quality'}>{loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}</button>
    </div>
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 text-xs">
      {[['Live records', number(report.summary.live_count)], ['Quarantined', number(report.quarantine.quarantined_count)], ['Duplicate keys', number(report.duplicateCount)], ['Outside window', number(report.summary.outside_window)]].map(([label,value]) => <div key={label} className="rounded-xl border border-slate-800 bg-slate-950 p-3"><div className="text-slate-500">{label}</div><div className="mt-1 text-lg font-bold text-white">{value}</div></div>)}
    </div>
    <div className={`flex items-center gap-2 rounded-xl border p-3 text-xs ${healthy ? 'border-emerald-500/30 bg-emerald-950/20 text-emerald-300' : 'border-amber-500/30 bg-amber-950/20 text-amber-300'}`}>
      {healthy ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
      {healthy ? 'Live dataset passes retention, provenance and duplicate checks.' : `${number(report.summary.missing_provenance)} missing-provenance and ${number(report.summary.missing_required)} missing-required live rows need review.`}
    </div>
    {error && <p className="text-xs text-rose-400" role="alert" aria-live="assertive">{error}</p>}
    <div className="overflow-x-auto"><table className="w-full min-w-[640px] text-left text-[11px]"><thead className="text-slate-500"><tr><th className="py-2 pr-3">Published</th><th className="py-2 pr-3">Issue</th><th className="py-2 pr-3">Detected</th><th className="py-2 pr-3">Accepted</th><th className="py-2 pr-3">Rejected</th><th className="py-2">QA</th></tr></thead><tbody>{report.issues.slice(0, 12).map((issue) => <tr key={issue.id} className="border-t border-slate-800 text-slate-300"><td className="py-2 pr-3 whitespace-nowrap">{issue.published_date}</td><td className="max-w-[260px] truncate py-2 pr-3" title={issue.title}>{issue.title}</td><td className="py-2 pr-3">{number(issue.records_detected)}</td><td className="py-2 pr-3 text-emerald-300">{number(issue.records_accepted)}</td><td className="py-2 pr-3 text-amber-300">{number(issue.records_rejected)}</td><td className={`py-2 font-semibold ${issue.quality_status === 'passed' ? 'text-emerald-300' : 'text-amber-300'}`}>{issue.quality_status}</td></tr>)}</tbody></table></div>
    <div className="text-[11px] text-slate-500 flex items-start gap-2"><ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />Quarantine retains expired or incomplete provenance for administrator audit and prevents it from appearing in searches, counts, alerts or saved opportunities.</div>
  </section>;
};
