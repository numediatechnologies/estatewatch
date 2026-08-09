import { describe, expect, it } from 'vitest';
import { applySecurityHeaders, consumeContactRateLimit } from './security';

const requestFor = (ip: string) => ({ ip } as any);
const responseFor = () => {
  const headers = new Map<string, unknown>();
  return { headers, setHeader(name: string, value: unknown) { headers.set(name, value); } } as any;
};

describe('contact endpoint security controls', () => {
  it('throttles repeated requests and publishes retry metadata', () => {
    const request = requestFor(`security-test-${Date.now()}-${Math.random()}`);
    const response = responseFor();
    for (let attempt = 0; attempt < 5; attempt += 1) expect(consumeContactRateLimit(request, response)).toBe(true);
    expect(consumeContactRateLimit(request, response)).toBe(false);
    expect(response.headers.get('Retry-After')).toBeGreaterThan(0);
    expect(response.headers.get('RateLimit-Remaining')).toBe(0);
  });

  it('sets browser hardening headers', () => {
    const response = responseFor();
    applySecurityHeaders(response);
    expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff');
    expect(response.headers.get('X-Frame-Options')).toBe('DENY');
    expect(response.headers.get('Referrer-Policy')).toBe('strict-origin-when-cross-origin');
  });
});
