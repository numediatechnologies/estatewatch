import { access, readFile } from 'node:fs/promises';
import { GEO_LOCATIONS, SITE_URL } from '../src/seo';

const sitemap = await readFile('public/sitemap.xml', 'utf8');
const homepage = await readFile('dist/index.html', 'utf8');
const urls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
const expected = [`${SITE_URL}/`, ...GEO_LOCATIONS.map(([slug]) => `${SITE_URL}/deceased-estate-alerts/${slug}`)];
const failures: string[] = [];
if (!sitemap.startsWith('<?xml')) failures.push('sitemap is missing its XML declaration');
if (!sitemap.includes('</urlset>')) failures.push('sitemap is missing its closing urlset');
if (!homepage.includes('<div id="root"></div>')) failures.push('homepage is missing the application root');
if (homepage.includes('data-seo-content="true"')) failures.push('homepage contains visible SEO-only content outside the application');
if (!homepage.includes('application/ld+json')) failures.push('homepage is missing structured data');
if (new Set(urls).size !== urls.length) failures.push('sitemap contains duplicate URLs');
for (const url of expected) if (!urls.includes(url)) failures.push(`missing sitemap URL: ${url}`);
for (const url of urls) if (!url.startsWith(`${SITE_URL}/`)) failures.push(`non-canonical URL: ${url}`);
for (const url of urls) {
  const path = url.slice(SITE_URL.length);
  if (path !== '/' && !/^\/deceased-estate-alerts\/[a-z0-9-]+$/.test(path)) failures.push(`non-geographic or personal URL: ${url}`);
}
for (const [slug] of GEO_LOCATIONS) {
  try { await access(`dist/deceased-estate-alerts/${slug}/index.html`); }
  catch { failures.push(`missing generated page: ${slug}`); }
}
for (const asset of ['public/social/estatewatch-og.png', 'public/social/estatewatch-square.png', 'public/social/estatewatch-vertical.png']) {
  try { await access(asset); } catch { failures.push(`missing social asset: ${asset}`); }
}
if (failures.length) { console.error(failures.join('\n')); process.exit(1); }
console.log(`SEO output valid: ${urls.length} sitemap URLs, ${GEO_LOCATIONS.length} geographic pages, 3 social assets.`);
