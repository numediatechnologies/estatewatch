import { useEffect } from 'react';
import { geographicPage, SITE_URL, SOCIAL_IMAGE_URL } from '../seo';

function setMeta(selector: string, attributes: Record<string, string>) {
  let element = document.head.querySelector(selector) as HTMLMetaElement | null;
  if (!element) { element = document.createElement('meta'); document.head.appendChild(element); }
  Object.entries(attributes).forEach(([key, value]) => element!.setAttribute(key, value));
}

export function SeoHead() {
  useEffect(() => {
    const page = geographicPage();
    const canonicalPath = page ? `/deceased-estate-alerts/${page.slug}` : '/';
    const title = page ? `Deceased Estate Alerts in ${page.name} | ESTATEWATCH` : 'South African Deceased Estate Alerts | ESTATEWATCH';
    const description = page
      ? `Find South African Government Gazette deceased-estate notices relevant to ${page.name}. Set a surname, province or identity-number alert and take a clear next step.`
      : 'Find South African Government Gazette deceased-estate notices. Set precise alerts by identity number, surname or province with ESTATEWATCH by MarketDirect.co.za.';
    document.title = title;
    setMeta('meta[name="description"]', { name: 'description', content: description });
    setMeta('meta[name="robots"]', { name: 'robots', content: 'index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1' });
    setMeta('meta[property="og:title"]', { property: 'og:title', content: title });
    setMeta('meta[property="og:description"]', { property: 'og:description', content: description });
    setMeta('meta[property="og:url"]', { property: 'og:url', content: `${SITE_URL}${canonicalPath}` });
    setMeta('meta[property="og:locale"]', { property: 'og:locale', content: 'en_ZA' });
    setMeta('meta[property="og:type"]', { property: 'og:type', content: 'website' });
    setMeta('meta[property="og:image"]', { property: 'og:image', content: SOCIAL_IMAGE_URL });
    setMeta('meta[property="og:image:width"]', { property: 'og:image:width', content: '1200' });
    setMeta('meta[property="og:image:height"]', { property: 'og:image:height', content: '630' });
    setMeta('meta[name="twitter:card"]', { name: 'twitter:card', content: 'summary_large_image' });
    setMeta('meta[property="og:image:alt"]', { property: 'og:image:alt', content: 'ESTATEWATCH eye brand mark with South African estate alert imagery' });
    setMeta('meta[name="twitter:title"]', { name: 'twitter:title', content: title });
    setMeta('meta[name="twitter:description"]', { name: 'twitter:description', content: description });
    setMeta('meta[name="twitter:image"]', { name: 'twitter:image', content: SOCIAL_IMAGE_URL });
    setMeta('meta[name="twitter:image:alt"]', { name: 'twitter:image:alt', content: 'ESTATEWATCH eye brand mark with South African estate alert imagery' });
    let canonical = document.head.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!canonical) { canonical = document.createElement('link'); canonical.rel = 'canonical'; document.head.appendChild(canonical); }
    canonical.href = `${SITE_URL}${canonicalPath}`;
    let script = document.head.querySelector('#estatewatch-structured-data') as HTMLScriptElement | null;
    if (!script) { script = document.createElement('script'); script.id = 'estatewatch-structured-data'; script.type = 'application/ld+json'; document.head.appendChild(script); }
    script.text = JSON.stringify({ '@context': 'https://schema.org', '@type': 'WebApplication', name: 'EstateWatch', url: `${SITE_URL}${canonicalPath}`, description, applicationCategory: 'BusinessApplication', areaServed: { '@type': 'Country', name: 'South Africa' }, provider: { '@type': 'Organization', name: 'MarketDirect.co.za', url: 'https://www.marketdirect.co.za' } });
  }, []);
  return null;
}
