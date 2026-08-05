// Starter ingestion helper (Node/TypeScript)
// Responsibilities:
// - Given a PDF URL or local path, attempt direct text extraction (pdf-parse)
// - If extracted text is below a quality threshold, mark for OCR
// - Provide a small adapter interface used by the Firecrawl post-processor

import fs from 'fs';
import fetch from 'node-fetch';
import crypto from 'crypto';

// Note: pdf-parse is lightweight and reads embedded text layers when present.
// Install with: npm install pdf-parse node-fetch

async function downloadPdf(url: string, outPath: string): Promise<void> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to download PDF ${url}: ${res.status}`);
  const buffer = await res.arrayBuffer();
  fs.writeFileSync(outPath, Buffer.from(buffer));
}

async function extractEmbeddedTextFromPdf(path: string): Promise<string> {
  try {
    // dynamic import to avoid adding pdf-parse to runtime until developer installs it
    const pdfParse = (await import('pdf-parse')).default;
    const data = fs.readFileSync(path);
    const parsed = await pdfParse(data);
    return parsed.text || '';
  } catch (err) {
    return '';
  }
}

export async function ingestPdfUrl(url: string, destDir = './data/pdf') {
  fs.mkdirSync(destDir, { recursive: true });
  const filename = `${Date.now()}-${crypto.createHash('sha1').update(url).digest('hex')}.pdf`;
  const outPath = `${destDir}/${filename}`;
  await downloadPdf(url, outPath);
  const extracted = await extractEmbeddedTextFromPdf(outPath);
  const wordCount = (extracted || '').trim().split(/\s+/).filter(Boolean).length;
  return {
    url,
    outPath,
    extractedText: extracted,
    textWordCount: wordCount,
    needsOcr: wordCount < 40
  };
}

export default ingestPdfUrl;
