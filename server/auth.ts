import { createHmac, timingSafeEqual } from 'node:crypto';
import { request as httpsRequest } from 'node:https';
import type { Request, Response } from 'express';
import { query } from './db.js';

const COOKIE_NAME = 'estatewatch_session';
const adminEmail = () => (process.env.ADMIN_EMAIL || 'support@marketdirecto.co.za').toLowerCase();
export const roleForEmail = (email: string): AppSession['role'] => email.toLowerCase() === adminEmail() ? 'admin' : 'user';

export interface AppSession {
  sub: string;
  email: string;
  name: string;
  role: 'user' | 'admin';
  subscriptionActive?: boolean;
  companyName?: string;
  exp: number;
}

type AuthTransport = (url: string, body: object, origin: string) => Promise<{ status: number; data: any }>;

const postAuthJson: AuthTransport = (url, body, origin) => new Promise((resolve, reject) => {
  const payload = JSON.stringify(body);
  const request = httpsRequest(url, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'content-length': Buffer.byteLength(payload),
      origin,
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
  const origin = new URL(process.env.APP_URL || 'http://localhost:3000').origin;
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

export async function authenticateWithNeon(mode: 'sign-in' | 'sign-up', body: { email: string; password: string; name?: string; companyName?: string }, transport: AuthTransport = postAuthJson) {
  const requestBody = mode === 'sign-up' ? { ...body, callbackURL: process.env.APP_URL || '/' } : body;
  const result = await callNeonAuth(`${mode}/email`, requestBody, transport);
  const user = result.user;
  if (!user?.id || !user?.email) throw new Error(mode === 'sign-up' ? 'Check your email to verify the new account before signing in.' : 'Neon did not return a verified user.');
  const email = String(user.email).toLowerCase();
  const role = roleForEmail(email);
  const name = user.name || body.name || email.split('@')[0];
  await query('ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS company_name VARCHAR(255)');
  const companyName = body.companyName?.trim() || undefined;
  const profile = await query(`INSERT INTO user_profiles(auth_subject,email,display_name,company_name,role) VALUES($1,$2,$3,$4,$5)
    ON CONFLICT(auth_subject) DO UPDATE SET email=EXCLUDED.email,display_name=EXCLUDED.display_name,company_name=COALESCE(EXCLUDED.company_name,user_profiles.company_name),role=EXCLUDED.role
    RETURNING subscription_status,subscription_expires_at,company_name`, [user.id, email, name, companyName || null, role]);
  const row = profile.rows?.[0];
  const subscriptionActive = role === 'admin' || (row?.subscription_status === 'active' && (!row.subscription_expires_at || new Date(row.subscription_expires_at) > new Date()));
  return { sub: user.id as string, email, name, role, subscriptionActive, companyName: row?.company_name || companyName };
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
