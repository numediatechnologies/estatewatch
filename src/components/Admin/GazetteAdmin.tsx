import React, { useState } from 'react';

export const GazetteAdmin: React.FC = () => {
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);

  const runFetch = async () => {
    setRunning(true);
    setError(null);
    setResult(null);
    try {
      const resp = await fetch('/api/run-fetch', { method: 'POST' });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data?.error || 'Unknown error');
      setResult(data.parsed || data);
    } catch (err: any) {
      setError(err.message || String(err));
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-bold text-sm text-white">Admin: Firecrawl Gazette Fetch</h3>
          <p className="text-xs text-slate-400">Developer-only admin panel to trigger the Firecrawl fetch endpoint and inspect results.</p>
        </div>
        <div>
          <button
            onClick={runFetch}
            disabled={running}
            className="rounded-2xl bg-amber-500 px-4 py-2 text-xs font-semibold text-slate-950 hover:bg-amber-400"
          >
            {running ? 'Running...' : 'Run fetch now'}
          </button>
        </div>
      </div>

      <div>
        <div className="text-xs text-slate-400 mb-2">Result / Errors</div>
        <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 font-mono text-xs text-emerald-200 max-h-96 overflow-auto">
          {error && <div className="text-red-400">Error: {error}</div>}
          {result ? (
            <pre className="whitespace-pre-wrap">{JSON.stringify(result, null, 2)}</pre>
          ) : (
            <div className="text-slate-500">No result yet. Click "Run fetch now" to trigger the serverless function (requires FIRECRAWL_API_KEY in environment).</div>
          )}
        </div>
      </div>

      <div className="text-[11px] text-slate-500">
        Note: The serverless endpoint uses the environment variable FIRECRAWL_API_KEY on the server (Vercel/CI). Do not place secrets in client code.
      </div>
    </div>
  );
};
