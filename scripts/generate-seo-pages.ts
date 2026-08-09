import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { GEO_LOCATIONS, SITE_URL } from '../src/seo.js';

const template = await readFile('dist/index.html', 'utf8');
for (const [slug, name] of GEO_LOCATIONS) {
  const canonical = `${SITE_URL}/deceased-estate-alerts/${slug}`;
  const title = `Deceased Estate Alerts in ${name} | EstateWatch`;
  const description = `Find South African Government Gazette deceased-estate notices relevant to ${name}. Set a surname, province or identity-number alert and take a clear next step.`;
  const html = template
    .replace(/<title>.*?<\/title>/, `<title>${title}</title>`)
    .replace(/<meta name="description" content="[^"]*"\s*\/>/, `<meta name="description" content="${description}" />`)
    .replace(/<link rel="canonical" href="[^"]*"\s*\/>/, `<link rel="canonical" href="${canonical}" />`)
    .replace(/<meta property="og:title" content="[^"]*"\s*\/>/, `<meta property="og:title" content="${title}" />`)
    .replace(/<meta property="og:description" content="[^"]*"\s*\/>/, `<meta property="og:description" content="${description}" />`)
    .replace(/<meta property="og:url" content="[^"]*"\s*\/>/, `<meta property="og:url" content="${canonical}" />`);
  const directory = `dist/deceased-estate-alerts/${slug}`;
  await mkdir(directory, { recursive: true });
  await writeFile(`${directory}/index.html`, html);
}
console.log(`Generated ${GEO_LOCATIONS.length} static geographic SEO pages.`);
