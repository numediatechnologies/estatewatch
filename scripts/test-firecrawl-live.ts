#!/usr/bin/env node
import 'dotenv/config';
import { createFirecrawlClient, discoverGazettes } from '../server/firecrawlDiscovery.js';

async function main() {
  if (!process.env.FIRECRAWL_API_KEY) throw new Error('FIRECRAWL_API_KEY is required for the live smoke test');
  const result = await discoverGazettes(createFirecrawlClient(), { maxPages: 1 });
  if (!result.gazettes.length) throw new Error('No in-window South African J193 gazettes were returned');
  console.log(JSON.stringify({
    success: true,
    results: result.gazettes.length,
    pagesInspected: result.pagesInspected,
    dateWindow: result.dateWindow,
    firstResult: result.gazettes[0],
  }, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
