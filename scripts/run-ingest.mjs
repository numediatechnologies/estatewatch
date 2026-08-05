#!/usr/bin/env node
// scripts/run-ingest.mjs
// Usage: node scripts/run-ingest.mjs <pdf-url-1> <pdf-url-2> ...
// Installs: npm install pdf-parse

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function downloadToFile(url, outPath) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`);
  const buffer = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(outPath, buffer);
}

async function extractTextWithPdfParse(filePath) {
  try {
    const pdfParse = (await import('pdf-parse')).default;
    const data = fs.readFileSync(filePath);
    const parsed = await pdfParse(data);
    return parsed.text || '';
  } catch (err) {
    return '';
  }
}

async function run() {
  const urls = process.argv.slice(2);
  if (!urls.length) {
    console.error('Usage: node scripts/run-ingest.mjs <pdf-url-1> <pdf-url-2> ...');
    process.exit(1);
  }

  const outDir = path.join(process.cwd(), 'data', 'pdf');
  fs.mkdirSync(outDir, { recursive: true });

  for (const url of urls) {
    try {
      console.log('---');
      console.log('Processing:', url);
      const hash = crypto.createHash('sha1').update(url).digest('hex').slice(0, 10);
      const filename = `${Date.now()}-${hash}.pdf`;
      const outPath = path.join(outDir, filename);
      await downloadToFile(url, outPath);
      console.log('Saved to', outPath);
      const extracted = await extractTextWithPdfParse(outPath);
      const wordCount = (extracted || '').trim().split(/\s+/).filter(Boolean).length;
      console.log('Extracted word count:', wordCount);
      const needsOcr = wordCount < 40;
      console.log('Needs OCR?', needsOcr);
      if (!needsOcr) {
        const snippet = extracted.trim().slice(0, 800).replace(/\n+/g, '\n');
        console.log('Text snippet:\n', snippet);
      } else {
        console.log('Embedded text insufficient — run OCR as fallback (Google Vision / Azure / Textract)');
      }
    } catch (err) {
      console.error('Error:', err.message || err);
    }
  }
}

run();
