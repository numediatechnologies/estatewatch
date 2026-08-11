import { createHmac, timingSafeEqual } from 'node:crypto';
import { request as httpsRequest } from 'node:https';
import type { Request, Response } from 'express';
import { query } from './db.js';

const COOKIE_NAME = 'estatewatch_session';
const DEFAULT_APP_URL = 'https://estatewatch-ivory.vercel.app';
const adminEmail = () => (process.env.ADMIN_EMAIL || 'support@marketdirect.co.za').toLowerCase();
export const roleForEmail = (email: string): AppSession['role'] => email.toLowerCase() === adminEmail() ? 'admin' : 'user';

export function applicationUrl() {
  const configured = String(process.env.APP_URL || '').trim();
  try {
    const url = new URL(configured || DEFAULT_APP_URL);
    if (url.protocol !== 'https:' && url.protocol !== 'http:') throw new Error('Unsupported application URL protocol');
    return url.origin;
  } catch {
    return DEFAULT_APP_URL;
  }
}

export interface AppSession {
  sub: string;
  email: string;
  name: string;
  role: 'user' | 'admin';
  subscriptionActive?: boolean;
  companyName?: string;
  phoneMasked?: string;
  phoneVerified?: boolean;
  subscriptionStatus?: string;
  subscriptionExpiresAt?: string | null;
  exp: number;
}

type AuthTransport = (url: string, body: object, origin: string) => Promise<{ status: number; data: any }>;

const postAuthJson: AuthTransport = (url, body, _origin) => new Promise((resolve, reject) => {
  const payload = JSON.stringify(body);
  const request = httpsRequest(url, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'content-length': Buffer.byteLength(payload),
    },
  }, (response) => {
    let responseBody = '';
    response.setEncoding('utf8');
    response.on('data', (chunk) => { responseBody += chunk; });
    response.on('end', () => {
      let data: any = {};
      try { data = responseBody ? JSON.parse(responseBody) : {}; } catch { data = {}; }
      resolve({ status: response.statusCode || 500, data });
    });
  });
  request.on('error', reject);
  request.setTimeout(15_000, () => request.destroy(new Error('Neon Auth request timed out')));
  request.end(payload);
});

async function callNeonAuth(path: string, body: object, transport: AuthTransport = postAuthJson) {
  const baseUrl = process.env.NEON_AUTH_BASE_URL?.replace(/\/$/, '');
  if (!baseUrl) throw new Error('NEON_AUTH_BASE_URL is required');
  const origin = applicationUrl();
  const response = await transport(`${baseUrl}/${path}`, body, origin);
  if (response.status < 200 || response.status >= 300) {
    throw Object.assign(new Error(response.data.message || response.data.error || 'Authentication failed'), { status: response.status });
  }
  return response.data;
}

function secret() {
  const value = process.env.AUTH_SESSION_SECRET || process.env.ADMIN_API_TOKEN;
  if (!value) throw new Error('AUTH_SESSION_SECRET is required');
  return value;
}

function encode(value: object) {
  return Buffer.from(JSON.stringify(value)).toString('base64url');
}

function sign(payload: string) {
  return createHmac('sha256', secret()).update(payload).digest('base64url');
}

export function createSessionToken(session: Omit<AppSession, 'exp'>) {
  const payload = encode({ ...session, exp: Date.now() + 7 * 24 * 60 * 60 * 1000 });
  return `${payload}.${sign(payload)}`;
}

export function readSession(req: Request): AppSession | null {
  const cookie = req.headers.cookie?.split(';').map((part) => part.trim()).find((part) => part.startsWith(`${COOKIE_NAME}=`));
  if (!cookie) return null;
  const [payload, signature] = decodeURIComponent(cookie.slice(COOKIE_NAME.length + 1)).split('.');
  if (!payload || !signature) return null;
  const expected = sign(payload);
  const actualBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (actualBuffer.length !== expectedBuffer.length || !timingSafeEqual(actualBuffer, expectedBuffer)) return null;
  try {
    const session = JSON.parse(Buffer.from(payload, 'base64url').toString()) as AppSession;
    return session.exp > Date.now() ? session : null;
  } catch { return null; }
}

export function setSessionCookie(res: Response, token: string) {
  res.cookie(COOKIE_NAME, token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', maxAge: 7 * 24 * 60 * 60 * 1000, path: '/' });
}

export function clearSessionCookie(res: Response) {
  res.clearCookie(COOKIE_NAME, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/' });
}

export async function authenticateWithNeon(mode: 'sign-in' | 'sign-up', body: { email: string; password: string; name?: string; firstName?: string; surname?: string; companyName?: string; phone?: string }, transport: AuthTransport = postAuthJson) {
  // Email/password signup does not require a redirect target. Omitting callbackURL
  // avoids Neon Auth redirect-domain validation failures; verification still uses
  // Neon Auth's email flow and the user can return to the app and sign in.
  // Neon Auth's email signup schema still requires its legacy `name` field.
  // Keep the UI and profile data split while sending the provider one derived
  // display name for compatibility.
  const requestBody = mode === 'sign-up'
    ? { ...body, name: body.name || [body.firstName, body.surname].filter(Boolean).join(' ') }
    : body;
  const result = await callNeonAuth(`${mode}/email`, requestBody, transport);
  const user = result.user;
  if (!user?.id || !user?.email) throw new Error(mode === 'sign-up' ? 'Check your email to verify the new account before signing in.' : 'Neon did not return a verified user.');
  const email = String(user.email).toLowerCase();
  const role = roleForEmail(email);
  const firstName = body.firstName?.trim() || undefined;
  const surname = body.surname?.trim() || undefined;
  const name = user.name || body.name || [firstName, surname].filter(Boolean).join(' ') || email.split('@')[0];
  await query('ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS company_name VARCHAR(255)');
  await query('ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS first_name VARCHAR(120)');
  await query('ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS surname VARCHAR(120)');
  const companyName = body.companyName?.trim() || undefined;
  const profile = await query(`INSERT INTO user_profiles(auth_subject,email,display_name,first_name,surname,company_name,role,phone_number) VALUES($1,$2,$3,$4,$5,$6,$7,$8)
    ON CONFLICT(auth_subject) DO UPDATE SET email=EXCLUDED.email,display_name=EXCLUDED.display_name,first_name=COALESCE(EXCLUDED.first_name,user_profiles.first_name),surname=COALESCE(EXCLUDED.surname,user_profiles.surname),company_name=COALESCE(EXCLUDED.company_name,user_profiles.company_name),role=EXCLUDED.role
    RETURNING subscription_status,subscription_expires_at,company_name,phone_number,phone_verified_at,first_name,surname`, [user.id, email, name, firstName || null, surname || null, companyName || null, role, body.phone || null]);
  const row = profile.rows?.[0];
  const subscriptionActive = role === 'admin' || (row?.subscription_status === 'active' && (!row.subscription_expires_at || new Date(row.subscription_expires_at) > new Date()));
  const phoneDigits = row?.phone_number ? String(row.phone_number).replace(/\D/g, '') : '';
  return { sub: user.id as string, email, name, firstName: row?.first_name || firstName, surname: row?.surname || surname, role, subscriptionActive, companyName: row?.company_name || companyName,
    phoneMasked: phoneDigits ? `***${phoneDigits.slice(-4)}` : undefined, phoneVerified: Boolean(row?.phone_verified_at),
    subscriptionStatus: row?.subscription_status || 'inactive', subscriptionExpiresAt: row?.subscription_expires_at || null };
}

export async function requestPasswordResetWithNeon(email: string, transport: AuthTransport = postAuthJson) {
  // Better Auth validates callback destinations against trusted origins. A
  // relative callback stays on the requesting EstateWatch origin in every env.
  const redirectTo = '/?reset-password=1';
  await callNeonAuth('request-password-reset', { email, redirectTo }, transport);
}

export async function resetPasswordWithNeon(token: string, newPassword: string, transport: AuthTransport = postAuthJson) {
  await callNeonAuth('reset-password', { token, newPassword }, transport);
}
