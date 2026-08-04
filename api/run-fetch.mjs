import { Firecrawl } from 'firecrawl';
import { z } from 'zod';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed. Use POST.' });
    return;
  }

  const apiKey = process.env.FIRECRAWL_API_KEY;
  if (!apiKey) {
    res.status(403).json({ error: 'FIRECRAWL_API_KEY not configured in environment.' });
    return;
  }

  const firecrawl = new Firecrawl({ apiKey });

  // Determine date range for the last 4 months
  const now = new Date();
  const past = new Date(now);
  past.setMonth(now.getMonth() - 4);

  const currentYear = now.getFullYear();
  const previousYear = past.getFullYear();

  const baseUrl = 'https://gazettes.africa/search/?q=Legal+Gazette&ordering=-date&jurisdiction=South+Africa&year=';
  const urls = [`${baseUrl}${currentYear}`];
  if (previousYear < currentYear) urls.push(`${baseUrl}${previousYear}`);

  const prompt = `1. Determine the current date and calculate the date range for the last 4 months.\n2. Navigate to https://gazettes.africa/search/?q=Legal+Gazette&ordering=-date&jurisdiction=South+Africa&year=${currentYear}.\n3. If the 4-month window extends into the previous year, also navigate to the URL for ${previousYear}.\n4. Extract all 'Legal Gazette' entries published within the last 4 months (inclusive), where the publication date is between ${past.toISOString().slice(0,10)} and ${now.toISOString().slice(0,10)}.\n5. For each entry, extract the title, publication date, and the direct PDF download URL.\n6. Ensure the results are filtered strictly to the last 4 months from today's date.`;

  const schema = z.object({
    gazettes: z.array(z.object({
      title: z.string(),
      title_citation: z.string().optional(),
      date_published: z.string(),
      date_published_citation: z.string().optional(),
      download_url: z.string(),
      download_url_citation: z.string().optional()
    }))
  });

  try {
    const result = await firecrawl.agent({ prompt, schema, urls, model: 'spark-1-mini' });
    const parsed = schema.parse(result);
    res.status(200).json({ ok: true, parsed });
  } catch (err) {
    res.status(500).json({ error: 'Fetch failed', details: String(err) });
  }
}
