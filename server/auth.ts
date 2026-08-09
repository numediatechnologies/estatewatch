import { createHmac, timingSafeEqual } from 'node:crypto';
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
  exp: number;
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

export async function authenticateWithNeon(mode: 'sign-in' | 'sign-up', body: { email: string; password: string; name?: string }) {
  const baseUrl = process.env.NEON_AUTH_BASE_URL?.replace(/\/$/, '');
  if (!baseUrl) throw new Error('NEON_AUTH_BASE_URL is required');
  const origin = process.env.APP_URL || 'http://localhost:3000';
  const response = await fetch(`${baseUrl}/${mode}/email`, { method: 'POST', headers: { 'content-type': 'application/json', origin }, body: JSON.stringify(body) });
  const result: any = await response.json().catch(() => ({}));
  if (!response.ok) throw Object.assign(new Error(result.message || result.error || 'Authentication failed'), { status: response.status });
  const user = result.user;
  if (!user?.id || !user?.email) throw new Error(mode === 'sign-up' ? 'Check your email to verify the new account before signing in.' : 'Neon did not return a verified user.');
  const email = String(user.email).toLowerCase();
  const role = roleForEmail(email);
  const name = user.name || body.name || email.split('@')[0];
  await query(`INSERT INTO user_profiles(auth_subject,email,display_name,role) VALUES($1,$2,$3,$4)
    ON CONFLICT(auth_subject) DO UPDATE SET email=EXCLUDED.email,display_name=EXCLUDED.display_name,role=EXCLUDED.role`, [user.id, email, name, role]);
  return { sub: user.id as string, email, name, role };
}
