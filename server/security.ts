import type { Request, Response } from 'express';

const CONTACT_WINDOW_MS = 15 * 60 * 1000;
const CONTACT_MAX_REQUESTS = 5;
const contactAttempts = new Map<string, { startedAt: number; count: number }>();

export const CONTACT_FIELD_LIMITS = {
  name: 120,
  company: 200,
  email: 254,
  phone: 30,
  enquiry: 100,
  message: 5000,
} as const;

export const ALLOWED_CONTACT_ENQUIRIES = new Set([
  'EstateWatch alerts',
  'Registration or account access',
  'Admin support',
  'Estate notice support',
  'Partnership or sales enquiry',
  'Other',
]);

function clientAddress(req: Request) {
  return req.ip || req.header('x-real-ip') || req.header('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
}

export function consumeContactRateLimit(req: Request, res: Response) {
  const now = Date.now();
  const key = clientAddress(req);
  const current = contactAttempts.get(key);
  const entry = !current || now - current.startedAt >= CONTACT_WINDOW_MS
    ? { startedAt: now, count: 0 }
    : current;
  entry.count += 1;
  contactAttempts.set(key, entry);

  // Keep this process-local map bounded on long-lived Node instances.
  if (contactAttempts.size > 10_000) {
    for (const [address, attempt] of contactAttempts) {
      if (now - attempt.startedAt >= CONTACT_WINDOW_MS) contactAttempts.delete(address);
    }
  }

  const remaining = Math.max(0, CONTACT_MAX_REQUESTS - entry.count);
  const retryAfter = Math.max(1, Math.ceil((entry.startedAt + CONTACT_WINDOW_MS - now) / 1000));
  res.setHeader('RateLimit-Limit', CONTACT_MAX_REQUESTS);
  res.setHeader('RateLimit-Remaining', remaining);
  res.setHeader('RateLimit-Reset', Math.ceil((entry.startedAt + CONTACT_WINDOW_MS) / 1000));
  if (entry.count > CONTACT_MAX_REQUESTS) {
    res.setHeader('Retry-After', retryAfter);
    return false;
  }
  return true;
}

export function applySecurityHeaders(res: Response) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  if (process.env.NODE_ENV === 'production') res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
}
