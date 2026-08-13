import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { GEO_LOCATIONS, SITE_URL } from '../src/seo.js';

const template = await readFile('dist/index.html', 'utf8');
const homepageData = JSON.stringify({ '@context': 'https://schema.org', '@type': 'WebSite', name: 'ESTATEWATCH', url: SITE_URL, description: 'South African deceased estate alerts for professionals.', publisher: { '@type': 'Organization', name: 'MarketDirect.co.za', url: 'https://www.marketdirect.co.za' } });
await writeFile('dist/index.html', template.replace('</head>', `<script type="application/ld+json">${homepageData}</script></head>`));
for (const [slug, name] of GEO_LOCATIONS) {
  const canonical = `${SITE_URL}/deceased-estate-alerts/${slug}`;
  const title = `Deceased Estate Alerts in ${name} | ESTATEWATCH`;
  const description = `Find South African Government Gazette deceased-estate notices relevant to ${name}. Set a surname, province or identity-number alert and take a clear next step.`;
  const structuredData = JSON.stringify({ '@context': 'https://schema.org', '@type': 'WebPage', name: title, url: canonical, description, isPartOf: { '@type': 'WebSite', name: 'EstateWatch', url: SITE_URL }, about: { '@type': 'Service', name: 'South African deceased estate alerts' } });
  const html = template
    .replace(/<title>.*?<\/title>/, `<title>${title}</title>`)
    .replace(/<meta name="description" content="[^"]*"\s*\/>/, `<meta name="description" content="${description}" />`)
    .replace(/<link rel="canonical" href="[^"]*"\s*\/>/, `<link rel="canonical" href="${canonical}" />`)
    .replace(/<meta property="og:title" content="[^"]*"\s*\/>/, `<meta property="og:title" content="${title}" />`)
    .replace(/<meta property="og:description" content="[^"]*"\s*\/>/, `<meta property="og:description" content="${description}" />`)
    .replace(/<meta property="og:url" content="[^"]*"\s*\/>/, `<meta property="og:url" content="${canonical}" />`)
    .replace('</head>', `<script type="application/ld+json">${structuredData}</script></head>`);
  const directory = `dist/deceased-estate-alerts/${slug}`;
  await mkdir(directory, { recursive: true });
  await writeFile(`${directory}/index.html`, html);
}
console.log(`Generated ${GEO_LOCATIONS.length} static geographic SEO pages.`);
