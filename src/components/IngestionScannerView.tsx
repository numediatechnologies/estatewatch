import React from 'react';
import { CheckCircle2, Cpu, ShieldCheck } from 'lucide-react';
import { GazetteAdmin } from './Admin/GazetteAdmin';

export const IngestionScannerView: React.FC = () => <div className="space-y-6">
  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-2 text-amber-400 font-bold text-sm"><Cpu className="w-5 h-5" />Administrator · Gazette ingestion and parser</div>
      <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800 font-semibold flex items-center gap-1.5 self-start"><CheckCircle2 className="w-3.5 h-3.5" />Deterministic J193 parser</span>
    </div>
    <p className="text-xs text-slate-300 leading-relaxed max-w-3xl">
      Firecrawl discovers J193 Gazette issues. PDFs are downloaded and parsed deterministically from fields (2)–(6). Records with missing or uncertain required fields are rejected for review and are never published with invented values.
    </p>
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-[11px]">
      <div className="bg-slate-950 border border-slate-800 rounded-xl p-3"><strong className="text-white block mb-1">Verified fields</strong><span className="text-slate-400">Estate number, deceased name, dates, address, spouse, representative, claim period and Gazette source.</span></div>
      <div className="bg-slate-950 border border-slate-800 rounded-xl p-3"><strong className="text-white block mb-1">Unavailable enrichment</strong><span className="text-slate-400">Estate value and asset type remain Unknown unless a source explicitly provides them.</span></div>
      <div className="bg-slate-950 border border-slate-800 rounded-xl p-3"><strong className="text-white block mb-1">Safety</strong><span className="text-slate-400">Identity numbers are masked and duplicate source records are skipped.</span></div>
    </div>
    <div className="flex items-center gap-2 text-[11px] text-slate-400"><ShieldCheck className="w-4 h-4 text-emerald-400" />Manual discovery and ingestion controls are administrator-only. Production scheduling is handled by protected Vercel Cron.</div>
  </div>
  <GazetteAdmin />
</div>;
