export const SITE_URL = 'https://estatewatch.marketdirect.co.za';

export const GEO_LOCATIONS = [
  ['south-africa', 'South Africa'], ['gauteng', 'Gauteng'], ['western-cape', 'Western Cape'],
  ['kwazulu-natal', 'KwaZulu-Natal'], ['eastern-cape', 'Eastern Cape'], ['free-state', 'Free State'],
  ['mpumalanga', 'Mpumalanga'], ['limpopo', 'Limpopo'], ['north-west', 'North West'],
  ['northern-cape', 'Northern Cape'], ['johannesburg', 'Johannesburg'], ['pretoria', 'Pretoria'],
  ['cape-town', 'Cape Town'], ['durban', 'Durban'], ['bloemfontein', 'Bloemfontein'],
  ['polokwane', 'Polokwane'], ['mbombela', 'Mbombela'], ['mahikeng', 'Mahikeng'], ['kimberley', 'Kimberley'],
] as const;

export function geographicPage(pathname = window.location.pathname) {
  const match = pathname.match(/^\/deceased-estate-alerts\/([^/]+)\/?$/);
  if (!match) return null;
  const location = GEO_LOCATIONS.find(([slug]) => slug === match[1]);
  return location ? { slug: location[0], name: location[1] } : null;
}
