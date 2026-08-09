import { DeceasedEstate } from './types.js';
import { createHash } from 'node:crypto';

export interface ParseResult {
  estate: DeceasedEstate | null;
  warning?: string;
}

const SA_ID = /\b(\d{6})\d{4}(\d{3})\b/;
const NOTICE =
  /notice to creditors|in the estate of|boedel wyle|estate late|deceased estate|section 29|section 35|master of the high court/i;

const PROVS: Array<[string, string[]]> = [
  ['Gauteng', ['gauteng', 'johannesburg', 'pretoria', 'sandton', 'centurion']],
  ['Western Cape', ['western cape', 'weskap', 'cape town', 'kaapstad', 'stellenbosch']],
  ['KwaZulu-Natal', ['kzn', 'kwa-zulu natal', 'durban', 'pietermaritzburg', 'umhlanga']],
  ['Eastern Cape', ['eastern cape', 'gqeberha', 'port elizabeth', 'makhanda']],
  ['Free State', ['free state', 'vrystaat', 'bloemfontein', 'welkom']],
  ['Mpumalanga', ['mpumalanga', 'mbombela', 'nelspruit', 'witbank']],
  ['Limpopo', ['limpopo', 'polokwane']],
  ['North West', ['north west', 'noordwes', 'mahikeng', 'klerksdorp']],
  ['Northern Cape', ['northern cape', 'noordkaap', 'kimberley']],
];

function first(values: Array<string | undefined | null>): string | undefined {
  return values.find((v) => v && v.trim())?.trim();
}

function maskId(raw?: string | null): string | undefined {
  if (!raw) return undefined;
  const m = raw.match(SA_ID);
  if (m) return `${m[1]}****${m[2]}`;
  const s = raw.replace(/[^0-9*]/g, '');
  return /^\d{6}\*{4}\d{1,4}$/.test(s) ? s : undefined;
}

function clean(raw?: string): string | undefined {
  if (!raw) return undefined;
  const s = raw
    .replace(/\b(government|republic|south africa|estate|boedel|late|wyle|the)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
  return s || undefined;
}

function toDate(s?: string): string | undefined {
  if (!s) return undefined;
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m) return `${m[3]}-${String(+m[2]).padStart(2, '0')}-${String(+m[1]).padStart(2, '0')}`;
  return s;
}

export function parseNotice(raw: string, source: string, metadata: { publishedDate?: string } = {}): ParseResult {
  const text = (raw || '').replace(/\r/g, '');
  if (text.trim().length < 40) return { estate: null, warning: 'Text too short to contain a valid notice' };
  if (!NOTICE.test(text)) return { estate: null, warning: 'Content does not look like a deceased estate notice' };

  const estateNumber =
    text.match(/\b\d{4,6}\/\d{4}\/[A-Z]{2,4}\b/)?.[0] || text.match(/\b\d{4,6}\/\d{4}\b/)?.[0];

  const deceasedName = clean(
    first([
      text.match(/in the estate of (?:the )?(?:late|wyle)?\s*:?\s*([A-Z][A-Za-z ,.'-]+)/i)?.[1],
      text.match(/boedel wyle\s*:?\s*([A-Z][A-Za-z ,.'-]+)/i)?.[1],
    ])
  );

  const idNumberMasked = maskId(
    first([
      text.match(/\b(?:id|identity)\s*(?:number|no)?\s*[:#]?\s*(\d{13})/i)?.[1],
      text.match(SA_ID)?.[0],
    ])
  );

  const dateOfDeath = toDate(
    first([
      text.match(/\bdate of death\s*[:#]?\s*(\d{1,2}\/\d{1,2}\/\d{4})/i)?.[1],
      text.match(/\b(\d{1,2}\/\d{1,2}\/\d{4})\b/)?.[1],
      text.match(/\b(\d{4}-\d{2}-\d{2})\b/)?.[1],
    ])
  );

  const lower = text.toLowerCase();
  const prov = PROVS.find(([, ks]) => ks.some((k) => lower.includes(k)))?.[0];

  const executorName = clean(text.match(/(?:executor|eksekuteur)\s*[:#]?\s*([A-Z][A-Za-z0-9 &.,'-]+)/i)?.[1]);
  const executorContact = first([
    text.match(/(?:tel|phone|contact)\s*[:#]?\s*([0-9+][0-9 ()-]{7,15})/i)?.[1],
    text.match(/\b(\+?27\s?\d{9}|\d{3}\s?\d{3}\s?\d{4})\b/)?.[1],
  ])?.replace(/\s+/g, ' ').trim();
  const executorEmail = first([
    text.match(/(?:e-?mail|e-pos)\s*[:#]?\s*([\w.+-]+@[\w.-]+\.[a-z]{2,})/i)?.[1],
    text.match(/[\w.+-]+@[\w.-]+\.[a-z]{2,}/i)?.[0],
  ]);

  const assetTypes: string[] = [];
  if (['erf', 'farm', 'plaas', 'villa', 'stand', 'plot', 'smallholding', 'dwelling', 'house'].some((k) => lower.includes(k))) assetTypes.push('property');
  if (['business', 'enterprise', 'franchise'].some((k) => lower.includes(k))) assetTypes.push('business');
  if (['vehicle', 'toyota', 'bmw', 'mercedes', 'vw', 'bakkie', 'fleet'].some((k) => lower.includes(k))) assetTypes.push('vehicle');
  if (['share', 'aandele', 'portfolio', 'unit trust', 'offshore'].some((k) => lower.includes(k))) assetTypes.push('shares');
  if (['bank account', 'bankrekening', 'savings'].some((k) => lower.includes(k))) assetTypes.push('bank_accounts');
  if (!assetTypes.length) assetTypes.push('other');

  let valueBand = 'Unknown';
  const amt = Number(text.match(/\bR\s?([\d,]{4,})\b/i)?.[1]?.replace(/,/g, ''));
  if (!isNaN(amt)) {
    if (amt >= 2e7) valueBand = 'R20,000,000+';
    else if (amt >= 5e6) valueBand = 'R5,000,000 - R20,000,000';
    else if (amt >= 1e6) valueBand = 'R1,000,000 - R5,000,000';
    else if (amt >= 250000) valueBand = 'R250,000 - R1,000,000';
  }

  const missing: string[] = [];
  if (!estateNumber) missing.push('estateNumber');
  if (!deceasedName) missing.push('deceasedName');
  if (!dateOfDeath) missing.push('dateOfDeath');
  if (!prov) missing.push('province');
  if (missing.length) {
    return { estate: null, warning: `Could not reliably extract required fields: ${missing.join(', ')} (source: ${source})` };
  }

  const estate: DeceasedEstate = {
    id: `est-${createHash('sha256').update(`${source}|${estateNumber}`).digest('hex').slice(0, 24)}`,
    sourceId: source,
    deceasedName: deceasedName!,
    idNumberMasked: idNumberMasked || 'Unknown',
    dateOfDeath: dateOfDeath!,
    gazetteDate: metadata.publishedDate || new Date().toISOString().slice(0, 10),
    province: prov!,
    district: 'Unknown',
    masterOffice: 'Unknown',
    estateNumber: estateNumber!,
    executorName: executorName || 'Unknown Executor',
    executorContact: executorContact || 'Unknown',
    executorEmail: executorEmail || '',
    valueBand,
    assetTypes,
    rawNoticeSnippet: text.slice(0, 500),
    gazetteRef: `Gazette notice (${source})`,
    status: 'pending',
    hasProperty: assetTypes.includes('property'),
  };

  return { estate };
}
