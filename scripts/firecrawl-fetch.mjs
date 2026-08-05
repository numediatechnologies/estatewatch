#!/usr/bin/env node
import { Firecrawl } from 'firecrawl';
import { z } from 'zod';

// Small helper to compute date range for the last N months
function dateMonthsAgo(months) {
  const now = new Date();
  const past = new Date(now);
  past.setMonth(now.getMonth() - months);
  return past;
}

async function main() {
  const apiKey = process.env.FIRECRAWL_API_KEY;
  if (!apiKey) {
    console.error('FIRECRAWL_API_KEY not set. Set it in the environment and re-run. Exiting.');
    process.exit(2);
  }

  const firecrawl = new Firecrawl({ apiKey });

  // Determine date range for the last 4 months
  const now = new Date();
  const past = dateMonthsAgo(4);

  const currentYear = now.getFullYear();
  const previousYear = past.getFullYear();

  // Compose the search URLs for gazettes.africa
  const baseUrl = 'https://gazettes.africa/search/?q=Legal+Gazette&ordering=-date&jurisdiction=South+Africa&year=';
  const urls = [`${baseUrl}${currentYear}`];
  if (previousYear < currentYear) urls.push(`${baseUrl}${previousYear}`);

  // Build the prompt with explicit instructions and date range
  const prompt = `1. Determine the current date and calculate the date range for the last 4 months.
2. Navigate to https://gazettes.africa/search/?q=Legal+Gazette&ordering=-date&jurisdiction=South+Africa&year=${currentYear}.
3. If the 4-month window extends into the previous year, also navigate to the URL for ${previousYear}.
4. Extract all 'Legal Gazette' entries published within the last 4 months (inclusive), where the publication date is between ${past.toISOString().slice(0,10)} and ${now.toISOString().slice(0,10)}.
5. For each entry, extract the title, publication date, and the direct PDF download URL.
6. Ensure the results are filtered strictly to the last 4 months from today's date.`;

  // Zod schema for validation
  const schema = z.object({
    gazettes: z.array(z.object({
      title: z.string().describe('The full title of the gazette'),
      title_citation: z.string().optional(),
      date_published: z.string().describe('The specific publication date'),
      date_published_citation: z.string().optional(),
      download_url: z.string().describe('The direct URL for the PDF download'),
      download_url_citation: z.string().optional()
    }))
  });

  console.log('Calling Firecrawl agent with URLs:', urls);

  try {
    const result = await firecrawl.agent({
      prompt,
      schema,
      urls,
      model: 'spark-1-mini'
    });

    // Validate with zod locally (the agent was already given the schema, but double-check)
    const parsed = schema.parse(result);
    console.log('Found gazettes:', JSON.stringify(parsed, null, 2));
  } catch (err) {
    console.error('Error during Firecrawl agent run:', err?.message || err);
    process.exit(3);
  }
}

if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith('firecrawl-fetch.mjs')) {
  main();
}
