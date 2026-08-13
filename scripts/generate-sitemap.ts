import { mkdir, writeFile } from 'node:fs/promises';
import { GEO_LOCATIONS, SITE_URL } from '../src/seo.js';

const paths = ['/', ...GEO_LOCATIONS.map(([slug]) => `/deceased-estate-alerts/${slug}`)];
// Public SEO is intentionally allowlisted to geographic landing pages only.
// Never add person names, estate IDs, identity numbers, contact details or
// authenticated/search-result URLs here.
const invalidPath = paths.find((path) => path !== '/' && !/^\/deceased-estate-alerts\/[a-z0-9-]+$/.test(path));
if (invalidPath) throw new Error(`Non-public or non-geographic sitemap path: ${invalidPath}`);
const entries = paths.map((path) => `  <url>\n    <loc>${SITE_URL}${path}</loc>\n    <changefreq>${path === '/' ? 'daily' : 'weekly'}</changefreq>\n    <priority>${path === '/' ? '1.0' : '0.8'}</priority>\n  </url>`).join('\n');
const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries}\n</urlset>\n`;
await mkdir('public', { recursive: true });
await writeFile('public/sitemap.xml', xml);
console.log(`Generated sitemap with ${paths.length} canonical URLs.`);
