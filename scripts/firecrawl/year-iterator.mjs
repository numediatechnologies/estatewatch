#!/usr/bin/env node
// Year-iterator for Gazettes.Africa backfill and incremental runs
// Usage examples:
//  node scripts/firecrawl/year-iterator.mjs --backlog-years 5 --discover --out ./data/gazette-urls.jsonl
//  node scripts/firecrawl/year-iterator.mjs --start-year 2024 --end-year 2026 --out ./data/gazette-urls.jsonl --run-ingest

import fs from 'fs/promises';
import {existsSync, mkdirSync} from 'fs';
import {spawnSync} from 'child_process';

const BASE = 'https://gazettes.africa';
const overviewUrl = `${BASE}/gazettes/za/`;

function usage(){
  console.log('Year-iterator for gazettes.africa - enumerate PDF URLs by year');
  console.log('Options: --backlog-years N (default 5), --discover (try to read overview page),');
  console.log('--start-year YYYY --end-year YYYY, --out <path> (default ./data/gazette-urls.jsonl), --run-ingest (invoke scripts/run-ingest.mjs on collected URLs)');
}

function parseArgs(){
  const args = process.argv.slice(2);
  const out = { backlogYears: 5, discover: false, startYear: null, endYear: null, outPath: './data/gazette-urls.jsonl', runIngest: false, batchSize: 20, query: 'Legal Gazette', noNature: false };
  for(let i=0;i<args.length;i++){
    const a = args[i];
    if(a==='--backlog-years') out.backlogYears = Number(args[++i]);
    else if(a==='--discover') out.discover = true;
    else if(a==='--start-year') out.startYear = Number(args[++i]);
    else if(a==='--end-year') out.endYear = Number(args[++i]);
    else if(a==='--out') out.outPath = args[++i];
    else if(a==='--run-ingest') out.runIngest = true;
    else if(a==='--batch-size') out.batchSize = Number(args[++i]);
    else if(a==='--query') out.query = args[++i];
    else if(a==='--no-nature') out.noNature = true;
    else if(a==='--help' || a==='-h'){ usage(); process.exit(0); }
    else { console.warn('Unknown arg', a); usage(); process.exit(1); }
  }
  return out;
}

async function fetchText(url){
  try{
    const res = await fetch(url, { headers: { 'User-Agent': 'EstateWatchBot/1.0 (backfill-script)' } });
    if(!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
    return await res.text();
  }catch(e){
    console.error('fetch error', e.message);
    return null;
  }
}

function extractYearsFromOverview(html){
  if(!html) return [];
  const years = new Set();
  // Look for href like /gazettes/za/2026/ or link text with 4-digit years
  const hrefRe = /\/gazettes\/za\/(\d{4})\//g;
  let m;
  while((m = hrefRe.exec(html)) !== null){ years.add(Number(m[1])); }
  const textYearRe = />(\d{4})<\/a>/g;
  while((m = textYearRe.exec(html)) !== null){ years.add(Number(m[1])); }
  return Array.from(years).sort((a,b)=>a-b);
}

function range(start, end){
  const r = [];
  for(let y=start; y<=end; y++) r.push(y);
  return r;
}

function normalizePdfUrl(url){
  if(!url) return null;
  // Trim and remove surrounding quotes/parentheses
  url = url.trim().replace(/^['"]|['"]$/g, '');
  if(url.startsWith('//')) url = 'https:' + url;
  if(url.startsWith('/')) url = BASE + url;
  // Only accept http/https
  if(/^https?:\/\//i.test(url) && /\.pdf(\?|$)/i.test(url)) return url.split('#')[0];
  return null;
}

async function collectPdfLinksForYear(year, query, noNature=false){
  console.log(`Collecting PDF links for year ${year} ...`);
  const collected = new Set();
  let page = 1;
  const maxPages = 30; // safety cap
  const qparam = encodeURIComponent(query || '');
  while(page <= maxPages){
    const naturePart = noNature ? '' : '&nature=Gazette';
    const url = `${BASE}/search/?q=${qparam}&ordering=-date${naturePart}&jurisdiction=South+Africa&year=${year}&page=${page}`;
    const html = await fetchText(url);
    if(!html){
      console.warn(`No HTML for ${url} (stopping pagination for year ${year})`);
      break;
    }
    // Find absolute PDF links
    const absRe = /https?:[^\s'"\)<>]+\.pdf(\?[^'"\s<>]*)?/gi;
    let found = 0;
    let m;
    while((m = absRe.exec(html)) !== null){
      const norm = normalizePdfUrl(m[0]);
      if(norm && !collected.has(norm)){
        collected.add(norm); found++;
      }
    }
    // Find relative links like /downloads/...pdf
    const relRe = /href\s*=\s*["']([^"']+?\.pdf)(?:["'])/gi;
    while((m = relRe.exec(html)) !== null){
      const candidate = m[1];
      const norm = normalizePdfUrl(candidate);
      if(norm && !collected.has(norm)){ collected.add(norm); found++; }
    }
    console.log(`  page ${page}: found ${found} new PDF links (total so far: ${collected.size})`);
    // Heuristic: stop if this page returned no new PDFs
    if(found === 0) break;
    page++;
    // small delay to be polite
    await new Promise(r=>setTimeout(r, 300));
  }
  return Array.from(collected);
}

async function ensureDataDir(path){
  const dir = path.replace(/\\/g, '/').split('/').slice(0,-1).join('/') || '.';
  if(!existsSync(dir)) mkdirSync(dir, { recursive: true });
}

async function writeJsonl(outPath, entries){
  await ensureDataDir(outPath);
  const lines = entries.map(e => JSON.stringify(e)).join('\n') + '\n';
  await fs.writeFile(outPath, lines, 'utf8');
  console.log(`Wrote ${entries.length} rows to ${outPath}`);
}

async function runIngestOnBatches(urls, batchSize=20){
  console.log(`Invoking scripts/run-ingest.mjs on ${urls.length} URLs in batches of ${batchSize}`);
  for(let i=0;i<urls.length;i+=batchSize){
    const batch = urls.slice(i,i+batchSize);
    console.log(`  running batch ${i/batchSize + 1}: ${batch.length} URLs`);
    const args = ['scripts/run-ingest.mjs', ...batch];
    const res = spawnSync('node', args, { stdio: 'inherit' });
    if(res.error){
      console.error('Failed to run run-ingest.mjs', res.error);
    }
    if(res.status !== 0){
      console.warn('run-ingest.mjs exited with status', res.status);
    }
  }
}

async function main(){
  const opts = parseArgs();
  const now = new Date();
  const currentYear = now.getFullYear();
  let years = [];
  if(opts.startYear && opts.endYear){
    years = range(opts.startYear, opts.endYear);
  }else if(opts.discover){
    console.log('Discovering available years from', overviewUrl);
    const html = await fetchText(overviewUrl);
    const discovered = extractYearsFromOverview(html);
    if(discovered.length>0){
      const max = Math.max(...discovered);
      const min = Math.min(...discovered);
      console.log('Discovered years on overview:', discovered.join(', '));
      // choose backlog range up to backlogYears
      const start = Math.max(min, currentYear - opts.backlogYears + 1);
      years = discovered.filter(y => y >= start && y <= currentYear).sort((a,b)=>a-b);
    }else{
      console.warn('No years discovered; falling back to configured backlog years');
      years = range(currentYear - opts.backlogYears + 1, currentYear);
    }
  }else{
    years = range(currentYear - opts.backlogYears + 1, currentYear);
  }

  if(years.length === 0){
    console.error('No years to process. Exiting.');
    process.exit(1);
  }

  console.log('Years to process:', years.join(', '));
  const allUrls = new Set();
  const results = [];

  for(const y of years){
    const urls = await collectPdfLinksForYear(y, opts.query, opts.noNature);
    for(const u of urls){
      if(!allUrls.has(u)){
        allUrls.add(u);
        results.push({ year: y, pdf_url: u, discovered_at: (new Date()).toISOString() });
      }
    }
  }

  if(results.length === 0){
    console.warn('No PDF URLs discovered for requested years. Exiting.');
    await writeJsonl(opts.outPath, []);
    process.exit(0);
  }

  await writeJsonl(opts.outPath, results);

  if(opts.runIngest){
    const urls = results.map(r => r.pdf_url);
    await runIngestOnBatches(urls, opts.batchSize);
  }

  console.log('Year-iterator finished.');
}

main().catch(err => { console.error(err); process.exit(1); });
