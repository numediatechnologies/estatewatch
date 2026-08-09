import { createHash } from 'node:crypto';
import type { DeceasedEstate } from './types.js';
import { identityFingerprint, isValidSouthAfricanId, maskSouthAfricanId, scrubIdentityNumbers } from './identity.js';

export const PARSER_VERSION = 'j193-v1';
const RECORD_START = /\b(\d{3,6}\/\d{4})\s*[—-]\s*\(2\)/g;

export async function extractPdfText(buffer: Uint8Array): Promise<string> {
  const canvas = await import('@napi-rs/canvas');
  const runtime = globalThis as Record<string, any>;
  runtime.DOMMatrix ||= canvas.DOMMatrix;
  runtime.Path2D ||= canvas.Path2D;
  runtime.ImageData ||= canvas.ImageData;
  const { getDocument } = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const pdf = await getDocument({ data: buffer, useWorkerFetch: false }).promise;
  const pages: string[] = [];
  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
    const page = await pdf.getPage(pageNumber);
    const content = await page.getTextContent();
    const text = content.items.map((item: any) => item.str).join(' ');
    pages.push(`\n[[PAGE:${pageNumber}]]\n${text}`);
  }
  return pages.join('\n');
}

export function splitJ193Records(text: string): Array<{ text: string; page: number }> {
  const matches = [...text.matchAll(RECORD_START)];
  return matches.map((match, index) => {
    const start = match.index ?? 0;
    const end = matches[index + 1]?.index ?? text.length;
    const pageMarkers = [...text.slice(0, start).matchAll(/\[\[PAGE:(\d+)\]\]/g)];
    return { text: text.slice(start, end).replace(/\s+/g, ' ').trim(), page: Number(pageMarkers.at(-1)?.[1] || 1) };
  });
}

function isValidDate(value?: string): value is string {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value;
}

function provinceFor(masterOffice: string, address: string): DeceasedEstate['province'] | null {
  const value = `${masterOffice} ${address}`.toLowerCase();
  if (/johannesburg|pretoria|gauteng|benoni|centurion|roodepoort|germiston/.test(value)) return 'Gauteng';
  if (/cape town|western cape|stellenbosch|paarl/.test(value)) return 'Western Cape';
  if (/durban|pietermaritzburg|kwazulu/.test(value)) return 'KwaZulu-Natal';
  if (/gqeberha|port elizabeth|eastern cape|makhanda/.test(value)) return 'Eastern Cape';
  if (/bloemfontein|free state|vrystaat/.test(value)) return 'Free State';
  if (/mbombela|nelspruit|mpumalanga/.test(value)) return 'Mpumalanga';
  if (/polokwane|limpopo/.test(value)) return 'Limpopo';
  if (/mahikeng|north west|noordwes/.test(value)) return 'North West';
  if (/kimberley|northern cape|noordkaap/.test(value)) return 'Northern Cape';
  return null;
}

export function parseJ193Record(record: string, source: { url: string; publishedDate: string; gazetteNumber: string; page: number }): { estate: DeceasedEstate | null; warning?: string } {
  const match = record.match(/^(\d{3,6}\/\d{4})\s*[—-]\s*\(2\)\s*([^;]+);\s*\(3\)\s*([^;]+);\s*\(4\)\s*([^;]*);\s*\(5\)\s*([^;]+);\s*\(6\)\s*([^.;]*)(?:\.|$)/i);
  if (!match) return { estate: null, warning: 'Record does not match numbered J193 fields' };
  const [, estateNumber, deceasedField, deathField, spouseField, executorField, claimField] = match;
  const deceasedParts = deceasedField.split(',').map((part) => part.trim());
  const deceasedName = deceasedParts.slice(0, 2).filter(Boolean).join(', ');
  const dateOfBirth = deceasedParts.find((part) => isValidDate(part));
  const idNumber = deceasedParts.find((part) => /^\d{13}$/.test(part));
  const lastAddress = deceasedParts.slice(Math.max(deceasedParts.findIndex((part) => /^\d{13}$/.test(part)) + 1, 2)).join(', ');
  const deathParts = deathField.split(',').map((part) => part.trim());
  const dateOfDeath = deathParts.find((part) => isValidDate(part));
  const masterOffice = deathParts.filter((part) => part !== dateOfDeath).join(', ') || 'Unknown';
  const province = provinceFor(masterOffice, lastAddress);
  if (!deceasedName || !dateOfDeath || !province) return { estate: null, warning: 'Missing required deceased name, date of death, or province' };
  const executorParts = executorField.split(',').map((part) => part.trim());
  const executorName = executorParts.shift() || 'Unknown';
  const id = `est-${createHash('sha256').update(`${source.url}|${estateNumber}`).digest('hex').slice(0, 24)}`;
  return { estate: {
    id, sourceId: `${source.gazetteNumber}:${estateNumber}`, deceasedName, idNumberMasked: maskSouthAfricanId(idNumber),
    idNumberHash: isValidSouthAfricanId(idNumber) && process.env.IDENTITY_MATCH_SECRET ? identityFingerprint(idNumber) : undefined,
    dateOfBirth, lastAddress, dateOfDeath, gazetteDate: source.publishedDate, province, district: masterOffice,
    masterOffice, estateNumber, executorName, executorAddress: executorParts.join(', '), executorContact: 'Unknown',
    executorEmail: '', spouseDetails: /^[- N\/A]+$/i.test(spouseField.trim()) ? undefined : spouseField.trim(),
    claimPeriodDays: Number(claimField.match(/\d+/)?.[0]) || undefined, gazetteNumber: source.gazetteNumber,
    gazettePage: source.page, sourceUrl: source.url, parserVersion: PARSER_VERSION, valueBand: 'Unknown',
    assetTypes: ['unknown'], rawNoticeSnippet: scrubIdentityNumbers(record).slice(0, 1000), gazetteRef: `Government Gazette ${source.gazetteNumber}`,
    status: 'pending', hasProperty: false,
  }};
}
