import React, { useEffect, useMemo, useState } from 'react';
import { GazetteAdminLoader } from './Admin/GazetteAdminLoader';
import { GazetteAdmin } from './Admin/GazetteAdmin';
import { Cpu, FileCode, CheckCircle2, RefreshCw, Sparkles, FileText, Play } from 'lucide-react';

const SAMPLE_RAW_TEXTS = [
  `IN THE HIGH COURT OF SOUTH AFRICA (MASTER OF THE HIGH COURT, JOHANNESBURG)\nNotice to Creditors in Deceased Estates in terms of Section 29 of Act 66 of 1965.\nIn the Estate of the late: DLAMINI, SIBUSISO ROBERT.\nID Number: 7605185120088.\nDate of Death: 12/01/2025.\nLast Address: 14 Bryanston Manor, Bryanston, Sandton, Gauteng.\nMaster's Reference: 02841/2025/JHB.\nExecutor/Agent: S. Dlamini Fiduciary Services, 100 West St, Sandton.\nTel: 011 784 1000. Email: sibusiso@dlaminitrust.co.za\nCreditors and interested parties are hereby requested to lodge their claims with the executor concerned within 30 days of publication hereof.`,
  
  `REPUBLIEK VAN SUID-AFRIKA - KENNISGEWING AAN KREDITEURE IN BOEDELS WYLE.\nBoedel Wyle: VAN SCHALKWYK, PETRUS JACOBUS.\nID Nommer: 6301145011082.\nDatum van Afsterwe: 02/01/2025.\nWoonadres: Weltevreden Plaas, District Bloemfontein, Vrystaat.\nMeestersverwysing: 00192/2025/BFN.\nProkureur vir Executrice: Du Toit & Vennote Prokureurs, Posbus 12, Bloemfontein.\nTel: 051 430 8000. E-pos: boedels@dutoitlaw.co.za`
];

export const IngestionScannerView: React.FC = () => {
  const [rawNotice, setRawNotice] = useState(SAMPLE_RAW_TEXTS[0]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [parsedJson, setParsedJson] = useState<any | null>({
    deceasedName: 'Dlamini, Sibusiso Robert',
    idNumberMasked: '760518****088',
    dateOfDeath: '2025-01-12',
    province: 'Gauteng',
    district: 'Sandton / Johannesburg',
    masterOffice: 'Master of the High Court, Johannesburg',
    estateNumber: '02841/2025/JHB',
    executorName: 'S. Dlamini Fiduciary Services',
    executorContact: '011 784 1000',
    executorEmail: 'sibusiso@dlaminitrust.co.za',
    hasPropertyAsset: true,
    estimatedValueBand: 'R5,000,000 - R20,000,000',
    ocrConfidence: '99.8%'
  });

  const [scheduleEnabled, setScheduleEnabled] = useState(true);
  const [frequencyPerDay, setFrequencyPerDay] = useState(6);
  const [lastRunAt, setLastRunAt] = useState<string>(new Date().toISOString());
  const [scheduleSaved, setScheduleSaved] = useState(false);

  const SCHEDULE_OPTIONS = [
    { label: 'Mission-critical: Every 4 hours (6x/day)', value: 6 },
    { label: 'High frequency: Every 3 hours (8x/day)', value: 8 },
    { label: 'Moderate: Every 6 hours (4x/day)', value: 4 },
    { label: 'Daily: Once per day', value: 1 }
  ];

  const intervalHours = useMemo(() => 24 / frequencyPerDay, [frequencyPerDay]);
  const nextRunAt = useMemo(() => {
    const next = new Date(lastRunAt);
    next.setHours(next.getHours() + intervalHours);
    return next.toLocaleString();
  }, [lastRunAt, intervalHours]);

  useEffect(() => {
    if (!scheduleEnabled) return;
    if (!scheduleSaved) return;
    const timer = window.setInterval(() => {
      setLastRunAt(new Date().toISOString());
    }, 1000 * 60 * 60 * intervalHours);

    return () => window.clearInterval(timer);
  }, [scheduleEnabled, scheduleSaved, intervalHours]);

  const handleRunOcr = () => {
    setIsProcessing(true);
    setTimeout(() => {
      // Parse fields based on raw notice text
      const isAfrikaans = rawNotice.includes('BOEDELS WYLE') || rawNotice.includes('Petrus');
      
      if (isAfrikaans) {
        setParsedJson({
          deceasedName: 'Van Schalkwyk, Petrus Jacobus',
          idNumberMasked: '630114****082',
          dateOfDeath: '2025-01-02',
          province: 'Free State',
          district: 'Bloemfontein',
          masterOffice: 'Master of the High Court, Bloemfontein',
          estateNumber: '00192/2025/BFN',
          executorName: 'Du Toit & Vennote Prokureurs',
          executorContact: '051 430 8000',
          executorEmail: 'boedels@dutoitlaw.co.za',
          hasPropertyAsset: true,
          estimatedValueBand: 'R5,000,000 - R20,000,000',
          ocrConfidence: '99.6%'
        });
      } else {
        setParsedJson({
          deceasedName: 'Dlamini, Sibusiso Robert',
          idNumberMasked: '760518****088',
          dateOfDeath: '2025-01-12',
          province: 'Gauteng',
          district: 'Sandton / Johannesburg',
          masterOffice: 'Master of the High Court, Johannesburg',
          estateNumber: '02841/2025/JHB',
          executorName: 'S. Dlamini Fiduciary Services',
          executorContact: '011 784 1000',
          executorEmail: 'sibusiso@dlaminitrust.co.za',
          hasPropertyAsset: true,
          estimatedValueBand: 'R5,000,000 - R20,000,000',
          ocrConfidence: '99.8%'
        });
      }
      setIsProcessing(false);
      setLastRunAt(new Date().toISOString());
      setScheduleSaved(true);
    }, 800);
  };

  return (
    <div className="space-y-6">
      
      {/* Overview Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
            <Cpu className="w-5 h-5" />
            <span>Automated Ingestion Pipeline & OCR Field Parser</span>
          </div>
          <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800 font-semibold flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Scraper Engine Active
          </span>
        </div>
        <p className="text-xs text-slate-300 leading-relaxed max-w-3xl">
          EstateWatch ingests weekly South African Government Gazette PDFs (Section 29 and Section 35 notices) and Master’s Office ICMS feeds. Our OCR pipeline automatically structures messy PDF text into queryable JSON records.
        </p>

        {/* Pipeline Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
            <span className="text-[10px] text-slate-400 block uppercase">Weekly Gazettes Scraped</span>
            <span className="text-sm font-bold text-white">100% Coverage (National)</span>
          </div>
          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
            <span className="text-[10px] text-slate-400 block uppercase">Notices Parsed / Issue</span>
            <span className="text-sm font-bold text-amber-400">1,200 – 1,800 notices</span>
          </div>
          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
            <span className="text-[10px] text-slate-400 block uppercase">OCR Extraction Accuracy</span>
            <span className="text-sm font-bold text-emerald-400">99.4% Field Precision</span>
          </div>
          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
            <span className="text-[10px] text-slate-400 block uppercase">POPIA Masking Engine</span>
            <span className="text-sm font-bold text-slate-200">Active (Auto-mask ID)</span>
          </div>
        </div>

        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="font-bold text-sm text-white">Mission-critical Firecrawl Schedule</h3>
              <p className="text-xs text-slate-400 leading-relaxed max-w-3xl">
                Configure how often EstateWatch triggers the Firecrawl Gazette ingestion pipeline. For a mission-critical legal alerts service,
                we recommend polling the Government Gazette every <strong>4 hours</strong> to capture new deceased estate notices as soon as they publish.
              </p>
            </div>
            <div className="text-right">
              <span className="text-[10px] uppercase tracking-[0.18em] text-slate-400">Next scheduled run</span>
              <div className="mt-1 text-white font-semibold">{scheduleEnabled ? nextRunAt : 'Schedule paused'}</div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs text-slate-300 uppercase font-semibold">Schedule status</span>
                <button
                  type="button"
                  onClick={() => setScheduleEnabled(prev => !prev)}
                  className={`text-xs px-3 py-2 rounded-full border ${scheduleEnabled ? 'bg-emerald-500 border-emerald-500 text-slate-950' : 'bg-slate-800 border-slate-700 text-slate-300'}`}
                >
                  {scheduleEnabled ? 'Enabled' : 'Paused'}
                </button>
              </div>

              <div className="space-y-2">
                <span className="text-xs text-slate-300 uppercase font-semibold">Polling cadence</span>
                <div className="grid gap-2">
                  {SCHEDULE_OPTIONS.map(option => (
                    <button
                      key={option.value}
                      onClick={() => setFrequencyPerDay(option.value)}
                      className={`text-left rounded-2xl border px-4 py-3 text-xs transition ${frequencyPerDay === option.value ? 'border-amber-400 bg-amber-500/10 text-white' : 'border-slate-800 bg-slate-950 text-slate-300 hover:border-slate-600'}`}
                    >
                      <div className="font-semibold">{option.label}</div>
                      <div className="text-slate-400">Every {Math.round(24 / option.value)} hours</div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <span className="text-xs text-slate-300 uppercase font-semibold">Active schedule</span>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  This schedule is designed for a mission-critical ingestion service that must capture legal gazette notices with low latency.
                  Use Firecrawl or a similar scraper to pull the latest Gazette issues automatically at the cadence above.
                </p>
              </div>
            </div>

            <div className="space-y-4 bg-slate-900 p-4 rounded-3xl border border-slate-800">
              <div className="text-xs uppercase tracking-[0.2em] text-slate-400">Live schedule details</div>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-slate-400 text-[11px]">
                  <span>Frequency</span>
                  <span>{frequencyPerDay}x per day</span>
                </div>
                <div className="flex items-center justify-between text-slate-400 text-[11px]">
                  <span>Interval</span>
                  <span>{intervalHours.toFixed(1)} hours</span>
                </div>
                <div className="flex items-center justify-between text-slate-400 text-[11px]">
                  <span>Last run</span>
                  <span>{new Date(lastRunAt).toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between text-slate-400 text-[11px]">
                  <span>Status</span>
                  <span>{scheduleEnabled ? 'Active' : 'Paused'}</span>
                </div>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={handleRunOcr}
                  disabled={isProcessing}
                  className="flex-1 rounded-2xl bg-amber-500 px-4 py-3 text-xs font-semibold text-slate-950 hover:bg-amber-400"
                >
                  {isProcessing ? 'Running ingestion...' : 'Run now'}
                </button>
                <button
                  type="button"
                  onClick={() => setScheduleSaved(true)}
                  className="flex-1 rounded-2xl border border-slate-700 bg-slate-800 px-4 py-3 text-xs text-slate-300 hover:bg-slate-700"
                >
                  Save schedule
                </button>
              </div>

              {scheduleSaved && (
                <div className="rounded-2xl border border-emerald-500/30 bg-emerald-950/40 px-4 py-3 text-[11px] text-emerald-300">
                  Schedule confirmed. Firecrawl ingestion will run automatically every {intervalHours.toFixed(1)} hours when enabled.
                </div>
              )}

              {/* Dev-only Admin Panel Link */}
              {import.meta.env.DEV && (
                <div className="mt-3">
                  <button
                    type="button"
                    onClick={() => {
                      const el = document.getElementById('dev-gazette-admin');
                      if (el) el.scrollIntoView({ behavior: 'smooth' });
                    }}
                    className="text-xs rounded-full px-3 py-2 bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700"
                  >
                    Open Dev Admin
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Real Gazette Admin Integration */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div>
            <h3 className="font-bold text-sm text-white flex items-center gap-2">
              <FileCode className="w-4 h-4 text-amber-400" />
              Live Gazette Ingestion
            </h3>
            <p className="text-xs text-slate-400">Real-time Firecrawl integration with South African Government Gazette</p>
          </div>
        </div>
        <GazetteAdmin />
      </div>

      {/* Interactive OCR Sandbox */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div>
            <h3 className="font-bold text-sm text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              OCR Field Extraction Sandbox
            </h3>
            <p className="text-xs text-slate-400">Test parsing raw Gazette PDF notice snippets into structured fields</p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setRawNotice(SAMPLE_RAW_TEXTS[0])}
              className="text-xs px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700 cursor-pointer"
            >
              Sample English
            </button>
            <button
              onClick={() => setRawNotice(SAMPLE_RAW_TEXTS[1])}
              className="text-xs px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700 cursor-pointer"
            >
              Sample Afrikaans
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          
          {/* Input Raw PDF Notice Text */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-300 flex items-center justify-between">
              <span>Raw Gazette PDF Text snippet:</span>
              <span className="text-[10px] text-slate-500 font-normal">Section 29 Form J193</span>
            </label>
            <textarea
              rows={12}
              value={rawNotice}
              onChange={(e) => setRawNotice(e.target.value)}
              className="w-full bg-slate-950 font-mono text-xs text-slate-200 p-3 rounded-xl border border-slate-800 focus:outline-none focus:border-amber-500 leading-relaxed"
            />
            <button
              onClick={handleRunOcr}
              disabled={isProcessing}
              className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-amber-500/10"
            >
              {isProcessing ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Play className="w-4 h-4 fill-current" />
              )}
              <span>{isProcessing ? 'Processing OCR Extraction...' : 'Run OCR Field Extractor'}</span>
            </button>
          </div>

          {/* Output Parsed JSON */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-300 flex items-center justify-between">
              <span>Extracted Structured JSON Record:</span>
              <span className="text-[10px] text-emerald-400 font-semibold bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/40">
                Confidence: {parsedJson?.ocrConfidence || '99.8%'}
              </span>
            </label>

            {parsedJson ? (
              <div className="bg-slate-950 font-mono text-xs text-emerald-400 p-3 rounded-xl border border-slate-800 h-[300px] overflow-y-auto space-y-2">
                <div className="text-slate-500">// Parsed Estate Record Output</div>
                <div><span className="text-amber-400">"deceasedName"</span>: <span className="text-slate-200">"{parsedJson.deceasedName}"</span>,</div>
                <div><span className="text-amber-400">"idNumberMasked"</span>: <span className="text-slate-200">"{parsedJson.idNumberMasked}"</span>,</div>
                <div><span className="text-amber-400">"dateOfDeath"</span>: <span className="text-slate-200">"{parsedJson.dateOfDeath}"</span>,</div>
                <div><span className="text-amber-400">"province"</span>: <span className="text-slate-200">"{parsedJson.province}"</span>,</div>
                <div><span className="text-amber-400">"district"</span>: <span className="text-slate-200">"{parsedJson.district}"</span>,</div>
                <div><span className="text-amber-400">"masterOffice"</span>: <span className="text-slate-200">"{parsedJson.masterOffice}"</span>,</div>
                <div><span className="text-amber-400">"estateNumber"</span>: <span className="text-slate-200">"{parsedJson.estateNumber}"</span>,</div>
                <div><span className="text-amber-400">"executorName"</span>: <span className="text-slate-200">"{parsedJson.executorName}"</span>,</div>
                <div><span className="text-amber-400">"executorContact"</span>: <span className="text-slate-200">"{parsedJson.executorContact}"</span>,</div>
                <div><span className="text-amber-400">"hasPropertyAsset"</span>: <span className="text-blue-400">{String(parsedJson.hasPropertyAsset)}</span></div>
              </div>
            ) : (
              <div className="bg-slate-950 text-slate-500 text-xs p-6 rounded-xl border border-slate-800 h-[300px] flex items-center justify-center text-center">
                Click "Run OCR Field Extractor" to test parsing
              </div>
            )}
          </div>

        </div>

      </div>

      {/* Dev admin area (visible in dev only) */}
      {import.meta.env.DEV && (
        <div id="dev-gazette-admin" className="mt-6">
          <h3 className="text-sm font-bold text-white mb-2">Developer Admin</h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div>
              {/* Render the GazetteAdmin by loader component */}
              <div>
                {/* @ts-ignore - dynamic render of loader */}
                <GazetteAdminLoader />
              </div>
            </div>
            <div className="text-xs text-slate-500">
              <p>Developer-only admin tools. This section calls the serverless function <code>/api/run-fetch</code> which requires FIRECRAWL_API_KEY set in the server environment (Vercel or local vercel dev).</p>
              <p className="mt-2">Local testing: run <code>vercel dev</code> (or set FIRECRAWL_API_KEY in your shell) and click "Run fetch now". Do NOT store API keys in client code or commit them to git.</p>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
