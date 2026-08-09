#!/usr/bin/env node
import 'dotenv/config';
import { createFirecrawlClient, discoverGazettes } from '../server/firecrawlDiscovery.js';

async function main() {
  const result = await discoverGazettes(createFirecrawlClient(), {
    maxPages: Number(process.env.FIRECRAWL_MAX_PAGES) || 10,
  });
  console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
