export const SITE_URL = 'https://estatewatch.marketdirect.co.za';
export const SITEMAP_URL = `${SITE_URL}/sitemap.xml`;
export const ROBOTS_URL = `${SITE_URL}/robots.txt`;
export const SOCIAL_IMAGE_URL = `${SITE_URL}/social/estatewatch-og.png`;

export const GEO_LOCATIONS = [
  ['south-africa', 'South Africa'], ['gauteng', 'Gauteng'], ['western-cape', 'Western Cape'],
  ['kwazulu-natal', 'KwaZulu-Natal'], ['eastern-cape', 'Eastern Cape'], ['free-state', 'Free State'],
  ['mpumalanga', 'Mpumalanga'], ['limpopo', 'Limpopo'], ['north-west', 'North West'],
  ['northern-cape', 'Northern Cape'], ['johannesburg', 'Johannesburg'], ['pretoria', 'Pretoria'],
  ['cape-town', 'Cape Town'], ['durban', 'Durban'], ['bloemfontein', 'Bloemfontein'],
  ['polokwane', 'Polokwane'], ['mbombela', 'Mbombela'], ['mahikeng', 'Mahikeng'], ['kimberley', 'Kimberley'],
  // Additional regional and smaller-town landing pages, kept geographic-only.
  ['midrand', 'Midrand'], ['centurion', 'Centurion'], ['benoni', 'Benoni'], ['boksburg', 'Boksburg'],
  ['germiston', 'Germiston'], ['kempton-park', 'Kempton Park'], ['alberton', 'Alberton'], ['springs', 'Springs'],
  ['stellenbosch', 'Stellenbosch'], ['paarl', 'Paarl'], ['george', 'George'], ['mossel-bay', 'Mossel Bay'],
  ['knysna', 'Knysna'], ['worcester', 'Worcester'],
  ['pietermaritzburg', 'Pietermaritzburg'], ['richards-bay', 'Richards Bay'], ['newcastle', 'Newcastle'], ['ballito', 'Ballito'],
  ['gqeberha', 'Gqeberha'], ['east-london', 'East London'], ['makhanda', 'Makhanda'],
  ['welkom', 'Welkom'], ['bethlehem', 'Bethlehem'], ['kroonstad', 'Kroonstad'],
  ['middelburg-mpumalanga', 'Middelburg'], ['secunda', 'Secunda'], ['ermelo', 'Ermelo'],
  ['tzaneen', 'Tzaneen'], ['thohoyandou', 'Thohoyandou'], ['mokopane', 'Mokopane'],
  ['rustenburg', 'Rustenburg'], ['potchefstroom', 'Potchefstroom'], ['klerksdorp', 'Klerksdorp'],
  ['upington', 'Upington'], ['springbok', 'Springbok'], ['de-aar', 'De Aar'],
] as const;

export function geographicPage(pathname = window.location.pathname) {
  const match = pathname.match(/^\/deceased-estate-alerts\/([^/]+)\/?$/);
  if (!match) return null;
  const location = GEO_LOCATIONS.find(([slug]) => slug === match[1]);
  return location ? { slug: location[0], name: location[1] } : null;
}
