import React, { useState } from 'react';
import { Cpu, CheckCircle2, RefreshCw, Sparkles, Play } from 'lucide-react';

const SAMPLE_RAW_TEXTS = [
  `IN THE HIGH COURT OF SOUTH AFRICA (MASTER OF THE HIGH COURT, JOHANNESBURG)\nNotice to Creditors in Deceased Estates in terms of Section 29 of Act 66 of 1965.\nIn the Estate of the late: DLAMINI, SIBUSISO ROBERT.\nID Number: 7605185120088.\nDate of Death: 12/01/2025.\nLast Address: 14 Bryanston Manor, Bryanston, Sandton, Gauteng.\nMaster's Reference: 02841/2025/JHB.\nExecutor/Agent: S. Dlamini Fiduciary Services, 100 West St, Sandton.\nTel: 011 784 1000. Email: sibusiso@dlaminitrust.co.za\nCreditors and interested parties are hereby requested to lodge their claims with the executor concerned within 30 days of publication hereof.`,
  
  `REPUBLIEK VAN SUID-AFRIKA - KENNISGEWING AAN KREDITEURE IN BOEDELS WYLE.\nBoedel Wyle: VAN SCHALKWYK, PETRUS JACOBUS.\nID Nommer: 6301145011082.\nDatum van Afsterwe: 02/01/2025.\nWoonadres: Weltevreden Plaas, District Bloemfontein, Vrystaat.\nMeestersverwysing: 00192/2025/BFN.\nProkureur vir Executrice: Du Toit & Vennote Prokureurs, Posbus 12, Bloemfontein.\nTel: 051 430 8000. E-pos: boedels@dutoitlaw.co.za`
];

type ExtractionMethod = 'direct_text' | 'ocr' | 'ai';

type ParsedEstateResult = {
  deceasedName: string;
  idNumberMasked: string;
  dateOfDeath: string;
  province: string;
  district: string;
  masterOffice: string;
  estateNumber: string;
  executorName: string;
  executorContact: string;
  executorEmail: string;
  hasPropertyAsset: boolean;
  estimatedValueBand: string;
  ocrConfidence: string;
};

const DEFAULT_PARSED: ParsedEstateResult = {
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
};

const simulateParse = (rawText: string, method: ExtractionMethod): ParsedEstateResult => {
  const isAfrikaans = rawText.includes('BOEDELS WYLE') || rawText.includes('Petrus');
  if (isAfrikaans) {
    return {
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
      ocrConfidence: method === 'ai' ? '97.5%' : method === 'ocr' ? '99.6%' : '98.8%'
    };
  }

  return {
    ...DEFAULT_PARSED,
    ocrConfidence: method === 'ai' ? '97.8%' : method === 'ocr' ? '99.8%' : '99.9%'
  };
};

export const IngestionScannerView: React.FC = () => {
  const [rawNotice, setRawNotice] = useState(SAMPLE_RAW_TEXTS[0]);
  const [pdfUrl, setPdfUrl] = useState('');
  const [uploadName, setUploadName] = useState<string | null>(null);
  const [parsingStage, setParsingStage] = useState<'idle' | 'direct_text' | 'ocr' | 'ai' | 'done'>('idle');
  const [methodUsed, setMethodUsed] = useState<ExtractionMethod>('direct_text');
  const [isProcessing, setIsProcessing] = useState(false);
  const [logEntries, setLogEntries] = useState<string[]>([]);
  const [parsedJson, setParsedJson] = useState<ParsedEstateResult | null>(DEFAULT_PARSED);

  const startExtraction = async () => {
    setIsProcessing(true);
    setLogEntries(['Starting PDF extraction flow...']);
    setParsingStage('direct_text');
    setMethodUsed('direct_text');

    const forceOcr = uploadName?.toLowerCase().includes('ocr') || pdfUrl.toLowerCase().includes('ocr');
    const forceAi = uploadName?.toLowerCase().includes('ai') || pdfUrl.toLowerCase().includes('ai');

    await new Promise((resolve) => setTimeout(resolve, 700));
    setLogEntries((prev) => [...prev, 'Attempting direct text extraction from PDF...']);

    if (forceOcr || forceAi) {
      setLogEntries((prev) => [...prev, 'Direct text extraction failed. Falling back to OCR.']);
      setParsingStage('ocr');
      setMethodUsed('ocr');
      await new Promise((resolve) => setTimeout(resolve, 900));

      if (forceAi) {
        setLogEntries((prev) => [...prev, 'OCR output incomplete. Falling back to AI-assisted parsing.']);
        setParsingStage('ai');
        setMethodUsed('ai');
        await new Promise((resolve) => setTimeout(resolve, 900));
        setLogEntries((prev) => [...prev, 'AI-assisted parse complete.']);
        setParsedJson(simulateParse(rawNotice, 'ai'));
      } else {
        setLogEntries((prev) => [...prev, 'OCR extraction successful.']);
        setParsedJson(simulateParse(rawNotice, 'ocr'));
      }
    } else {
      setLogEntries((prev) => [...prev, 'Direct text extraction successful.']);
      setParsedJson(simulateParse(rawNotice, 'direct_text'));
    }

    setParsingStage('done');
    setIsProcessing(false);
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploadName(file.name);
    setLogEntries((prev) => [...prev, `Selected file: ${file.name}`]);
  };

  return (
    <div className="space-y-6">
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
          EstateWatch ingests Government Gazette PDF notices via a layered extraction pipeline: direct PDF text first, OCR fallback if needed, then AI cleanup as the last step.
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
            <span className="text-[10px] text-slate-400 block uppercase">PDF / Link Ingestion</span>
            <span className="text-sm font-bold text-white">File or URL</span>
          </div>
          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
            <span className="text-[10px] text-slate-400 block uppercase">Extraction Modes</span>
            <span className="text-sm font-bold text-amber-400">Text → OCR → AI</span>
          </div>
          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
            <span className="text-[10px] text-slate-400 block uppercase">Latest Stage</span>
            <span className="text-sm font-bold text-emerald-400">{parsingStage === 'idle' ? 'Idle' : parsingStage.toUpperCase()}</span>
          </div>
          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
            <span className="text-[10px] text-slate-400 block uppercase">Last Method Used</span>
            <span className="text-sm font-bold text-slate-200">{methodUsed.replace('_', ' ').toUpperCase()}</span>
          </div>
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div>
            <h3 className="font-bold text-sm text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              PDF Ingestion & Parsing Sandbox
            </h3>
            <p className="text-xs text-slate-400">Upload a PDF or paste a notice link. The pipeline will try text extraction, then OCR, and lastly AI cleanup.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-[1.2fr,0.8fr] gap-4">
          <div className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              <label className="block text-xs font-bold text-slate-300">
                <span className="block text-[10px] text-slate-500 uppercase tracking-[.24em] mb-1">PDF Upload</span>
                <input
                  type="file"
                  accept="application/pdf"
                  onChange={handleFileSelect}
                  className="w-full text-xs text-slate-200 file:bg-slate-800 file:text-slate-100 file:px-3 file:py-2 file:rounded-xl file:border file:border-slate-700 bg-slate-950 rounded-xl p-3 border border-slate-800 focus:outline-none"
                />
              </label>

              <label className="block text-xs font-bold text-slate-300">
                <span className="block text-[10px] text-slate-500 uppercase tracking-[.24em] mb-1">Notice URL</span>
                <input
                  type="text"
                  value={pdfUrl}
                  onChange={(e) => setPdfUrl(e.target.value)}
                  placeholder="https://example.com/gazette-50281.pdf"
                  className="w-full bg-slate-950 text-slate-200 p-3 rounded-xl border border-slate-800 focus:outline-none focus:border-amber-500 text-xs"
                />
              </label>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-300 flex items-center justify-between">
                <span>Raw Gazette PDF Text snippet:</span>
                <span className="text-[10px] text-slate-500 font-normal">Editable sample input</span>
              </label>
              <textarea
                rows={8}
                value={rawNotice}
                onChange={(e) => setRawNotice(e.target.value)}
                className="w-full bg-slate-950 font-mono text-xs text-slate-200 p-3 rounded-xl border border-slate-800 focus:outline-none focus:border-amber-500 leading-relaxed"
              />
            </div>

            <button
              onClick={startExtraction}
              disabled={isProcessing}
              className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-amber-500/10"
            >
              {isProcessing ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Play className="w-4 h-4" />
              )}
              <span>{isProcessing ? 'Running extraction flow...' : 'Parse PDF / Notice URL'}</span>
            </button>

            <div className="bg-slate-950 rounded-2xl border border-slate-800 p-4 text-[11px] text-slate-300 space-y-2">
              <div className="font-semibold text-slate-200">How this works</div>
              <ol className="list-decimal list-inside space-y-1">
                <li>Try direct PDF text extraction first.</li>
                <li>If the text is missing or noisy, fallback to OCR.</li>
                <li>If OCR still needs cleanup, use AI-assisted parsing as a last resort.</li>
              </ol>
              <p className="text-slate-500">Use file names or URLs containing <span className="text-amber-300">ocr</span> or <span className="text-amber-300">ai</span> to simulate fallback behavior.</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3">
              <div className="text-xs uppercase tracking-[.3em] text-slate-500 font-semibold">Extraction log</div>
              <div className="h-60 overflow-y-auto font-mono text-[11px] text-slate-200 space-y-2">
                {logEntries.length ? (
                  logEntries.map((entry, index) => (
                    <div key={index} className="rounded-xl bg-slate-900 p-2 border border-slate-800">{entry}</div>
                  ))
                ) : (
                  <div className="text-slate-500">No extraction activity yet. Upload a PDF or enter a notice URL.</div>
                )}
              </div>
            </div>

            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800">
              <div className="text-xs uppercase tracking-[.3em] text-slate-500 font-semibold mb-3">Parsed Estate Record</div>
              {parsedJson ? (
                <pre className="font-mono text-[11px] leading-5 text-emerald-300 bg-slate-900 p-3 rounded-xl overflow-x-auto">
{`{
  "deceasedName": "${parsedJson.deceasedName}",
  "idNumberMasked": "${parsedJson.idNumberMasked}",
  "dateOfDeath": "${parsedJson.dateOfDeath}",
  "province": "${parsedJson.province}",
  "district": "${parsedJson.district}",
  "masterOffice": "${parsedJson.masterOffice}",
  "estateNumber": "${parsedJson.estateNumber}",
  "executorName": "${parsedJson.executorName}",
  "executorContact": "${parsedJson.executorContact}",
  "executorEmail": "${parsedJson.executorEmail}",
  "hasPropertyAsset": ${parsedJson.hasPropertyAsset},
  "estimatedValueBand": "${parsedJson.estimatedValueBand}",
  "ocrConfidence": "${parsedJson.ocrConfidence}"
}`}
                </pre>
              ) : (
                <div className="text-slate-500 text-xs">Parsed JSON will appear here after extraction.</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
