import { mkdir, writeFile } from 'node:fs/promises';
import { GEO_LOCATIONS, SITE_URL } from '../src/seo.js';

const paths = ['/', ...GEO_LOCATIONS.map(([slug]) => `/deceased-estate-alerts/${slug}`)];
const entries = paths.map((path) => `  <url>\n    <loc>${SITE_URL}${path}</loc>\n    <changefreq>${path === '/' ? 'daily' : 'weekly'}</changefreq>\n    <priority>${path === '/' ? '1.0' : '0.8'}</priority>\n  </url>`).join('\n');
const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries}\n</urlset>\n`;
await mkdir('public', { recursive: true });
await writeFile('public/sitemap.xml', xml);
console.log(`Generated sitemap with ${paths.length} canonical URLs.`);
