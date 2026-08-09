import React, { useState } from 'react';
import { Database, FileText, CheckCircle2, AlertTriangle, Clock, Play, Loader2, BarChart3 } from 'lucide-react';

interface IngestionStats {
  totalGazettes: number;
  successfulParses: number;
  failedParses: number;
  estatesCreated: number;
  duplicatesSkipped: number;
}

interface IngestionResult {
  ingestionId: string;
  timestamp: string;
  status: string;
  stats: IngestionStats;
  estates: Array<{
    estateNumber: string;
    deceasedName: string;
    province: string;
    valueBand: string;
    source: string;
  }>;
  errors: Array<{
    url: string;
    error: string;
  }>;
}

export const GazetteAdmin: React.FC = () => {
  const [mode, setMode] = useState<'search' | 'ingest'>('search');
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<any | null>(null);
  const [ingestionResult, setIngestionResult] = useState<IngestionResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  const runFetch = async () => {
    setRunning(true);
    setError(null);
    setResult(null);
    try {
      const resp = await fetch('/api/run-fetch', { method: 'POST' });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data?.error || 'Unknown error');
      setResult(data);
    } catch (err: any) {
      setError(err.message || String(err));
    } finally {
      setRunning(false);
    }
  };

  const runIngestion = async () => {
    setRunning(true);
    setError(null);
    setIngestionResult(null);
    setProgress(0);

    try {
      // Simulate progress updates for UX
      const progressInterval = setInterval(() => {
        setProgress(prev => Math.min(prev + 10, 90));
      }, 500);

      const resp = await fetch('/api/ingest-gazettes', { method: 'POST' });
      const data = await resp.json();

      clearInterval(progressInterval);
      setProgress(100);

      if (!resp.ok) throw new Error(data?.error || 'Unknown error');
      setIngestionResult(data.data);
    } catch (err: any) {
      setError(err.message || String(err));
      setProgress(0);
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-6">

      {/* Mode Toggle */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-bold text-sm text-white flex items-center gap-2">
            <Database className="w-4 h-4 text-amber-400" />
            Admin: Gazette Data Pipeline
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Production-grade gazette ingestion with PDF parsing, estate extraction, and database storage
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setMode('search')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              mode === 'search'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
            }`}
          >
            Search Only
          </button>
          <button
            onClick={() => setMode('ingest')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              mode === 'ingest'
                ? 'bg-amber-600 text-white'
                : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
            }`}
          >
            Full Ingestion
          </button>
        </div>
      </div>

      {/* Progress Bar */}
      {running && (
        <div className="bg-slate-950 rounded-xl p-3 border border-slate-800">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-400 flex items-center gap-2">
              <Loader2 className="w-3 h-3 animate-spin" />
              {mode === 'ingest' ? 'Processing gazettes...' : 'Searching gazettes...'}
            </span>
            <span className="text-xs font-bold text-amber-400">{progress}%</span>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-2">
            <div
              className="bg-gradient-to-r from-amber-500 to-amber-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Action Button */}
      <div className="flex items-center justify-between">
        <div className="text-xs text-slate-400">
          {mode === 'search'
            ? 'Quick search to discover available gazettes without processing'
            : 'Complete pipeline: search → scrape → parse → store in database'
          }
        </div>
        <button
          onClick={mode === 'search' ? runFetch : runIngestion}
          disabled={running}
          className="rounded-2xl bg-amber-500 px-4 py-2 text-xs font-semibold text-slate-950 hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {running ? (
            <>
              <Loader2 className="w-3 h-3 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <Play className="w-3 h-3" />
              {mode === 'search' ? 'Run Search' : 'Start Ingestion'}
            </>
          )}
        </button>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-950/50 border border-red-800 rounded-xl p-3">
          <div className="flex items-center gap-2 text-red-400 text-xs font-bold mb-1">
            <AlertTriangle className="w-4 h-4" />
            Error Occurred
          </div>
          <div className="text-red-300 text-xs">{error}</div>
        </div>
      )}

      {/* Search Results */}
      {mode === 'search' && result && (
        <div className="bg-slate-950 rounded-xl border border-slate-800 p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="text-xs text-slate-400">Search Results</div>
            <div className={result.success ? "text-emerald-400" : "text-red-400"}>
              {result.success ? '✅ Search Successful' : '❌ Search Failed'}
            </div>
          </div>

          {result.gazettes && (
            <>
              <div className="mb-3 text-blue-400 text-xs font-semibold">
                Found {result.gazettes.length} J193 gazette entries across {result.pagesInspected} page(s)
              </div>
              <div className="space-y-2 max-h-64 overflow-auto">
                {result.gazettes.map((gazette: any) => (
                  <div key={gazette.downloadUrl} className="border border-slate-700 rounded-lg p-2 bg-slate-900 hover:bg-slate-800 transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="text-emerald-300 font-bold text-xs mb-1 truncate">{gazette.title}</div>
                        <div className="text-slate-400 text-[10px] mb-1">{gazette.datePublished}</div>
                        <a href={gazette.downloadUrl} target="_blank" rel="noreferrer" className="text-blue-400 text-[10px] truncate block">{gazette.downloadUrl}</a>
                      </div>
                      <FileText className="w-4 h-4 text-slate-500 ml-2 flex-shrink-0" />
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* Ingestion Results */}
      {mode === 'ingest' && ingestionResult && (
        <div className="bg-slate-950 rounded-xl border border-slate-800 p-4 space-y-4">

          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="text-xs text-slate-400">Ingestion Results</div>
            <div className={ingestionResult.status === 'completed' ? "text-emerald-400" : "text-amber-400"}>
              {ingestionResult.status === 'completed' ? '✅ Ingestion Complete' : '⏳ Processing'}
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-slate-900 rounded-lg p-3 border border-slate-700">
              <div className="flex items-center gap-2 text-slate-400 text-[10px] mb-1">
                <FileText className="w-3 h-3" />
                Total Gazettes
              </div>
              <div className="text-lg font-bold text-white">{ingestionResult.stats.totalGazettes}</div>
            </div>

            <div className="bg-slate-900 rounded-lg p-3 border border-slate-700">
              <div className="flex items-center gap-2 text-emerald-400 text-[10px] mb-1">
                <CheckCircle2 className="w-3 h-3" />
                Estates Created
              </div>
              <div className="text-lg font-bold text-white">{ingestionResult.stats.estatesCreated}</div>
            </div>

            <div className="bg-slate-900 rounded-lg p-3 border border-slate-700">
              <div className="flex items-center gap-2 text-amber-400 text-[10px] mb-1">
                <BarChart3 className="w-3 h-3" />
                Success Rate
              </div>
              <div className="text-lg font-bold text-white">
                {ingestionResult.stats.totalGazettes > 0
                  ? Math.round((ingestionResult.stats.successfulParses / ingestionResult.stats.totalGazettes) * 100)
                  : 0}%
              </div>
            </div>
          </div>

          {/* Detailed Stats */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex items-center justify-between bg-slate-900 rounded-lg p-2 border border-slate-700">
              <span className="text-slate-400">Successful Parses</span>
              <span className="text-emerald-400 font-bold">{ingestionResult.stats.successfulParses}</span>
            </div>
            <div className="flex items-center justify-between bg-slate-900 rounded-lg p-2 border border-slate-700">
              <span className="text-slate-400">Failed Parses</span>
              <span className="text-red-400 font-bold">{ingestionResult.stats.failedParses}</span>
            </div>
            <div className="flex items-center justify-between bg-slate-900 rounded-lg p-2 border border-slate-700">
              <span className="text-slate-400">Duplicates Skipped</span>
              <span className="text-amber-400 font-bold">{ingestionResult.stats.duplicatesSkipped}</span>
            </div>
            <div className="flex items-center justify-between bg-slate-900 rounded-lg p-2 border border-slate-700">
              <span className="text-slate-400">Ingestion ID</span>
              <span className="text-slate-300 font-mono">{ingestionResult.ingestionId.slice(-8)}</span>
            </div>
          </div>

          {/* Created Estates */}
          {ingestionResult.estates.length > 0 && (
            <div>
              <div className="text-xs text-slate-400 mb-2 flex items-center gap-2">
                <Database className="w-3 h-3" />
                Estates Added to Database
              </div>
              <div className="space-y-2 max-h-48 overflow-auto">
                {ingestionResult.estates.map((estate, idx) => (
                  <div key={idx} className="bg-slate-900 rounded-lg p-2 border border-emerald-900/50">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-emerald-300 font-bold text-xs">{estate.estateNumber}</div>
                        <div className="text-slate-400 text-[10px]">{estate.deceasedName}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-slate-300 text-[10px]">{estate.province}</div>
                        <div className="text-amber-400 text-[10px]">{estate.valueBand}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Errors */}
          {ingestionResult.errors.length > 0 && (
            <div>
              <div className="text-xs text-red-400 mb-2 flex items-center gap-2">
                <AlertTriangle className="w-3 h-3" />
                Processing Errors
              </div>
              <div className="space-y-2 max-h-32 overflow-auto">
                {ingestionResult.errors.map((error, idx) => (
                  <div key={idx} className="bg-red-950/30 rounded-lg p-2 border border-red-900/50">
                    <div className="text-red-300 text-[10px] truncate">{error.url}</div>
                    <div className="text-red-400 text-[10px]">{error.error}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Documentation Note */}
      <div className="text-[11px] text-slate-500 bg-slate-950 rounded-lg p-3 border border-slate-800">
        <div className="flex items-start gap-2">
          <Clock className="w-3 h-3 text-amber-400 mt-0.5 flex-shrink-0" />
          <div>
            <strong className="text-slate-400">Production Pipeline:</strong> Full ingestion searches for gazettes, scrapes PDF content, parses deceased estate data using regex patterns, and stores valid records in the database with duplicate detection.
            <div className="mt-1 text-slate-500">Uses FIRECRAWL_API_KEY from server environment (Vercel/local).</div>
          </div>
        </div>
      </div>
    </div>
  );
};
