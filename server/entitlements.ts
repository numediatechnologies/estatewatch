import type { Request, Response, NextFunction } from 'express';
import { query } from './db.js';
import { readSession, type AppSession } from './auth.js';

export interface Entitlement {
  active: boolean;
  role: 'user' | 'admin';
  status: string;
  expiresAt?: string | null;
}

export async function getEntitlement(session: AppSession | null): Promise<Entitlement> {
  if (!session) return { active: false, role: 'user', status: 'anonymous' };
  if (session.role === 'admin') return { active: true, role: 'admin', status: 'admin' };
  const result = await query('SELECT subscription_status, subscription_expires_at FROM user_profiles WHERE auth_subject=$1', [session.sub]);
  const row = result.rows[0];
  const active = row?.subscription_status === 'active' && (!row.subscription_expires_at || new Date(row.subscription_expires_at) > new Date());
  return { active, role: 'user', status: row?.subscription_status || 'inactive', expiresAt: row?.subscription_expires_at || null };
}

export async function requireSession(req: Request, res: Response, next: NextFunction) {
  const session = readSession(req);
  if (!session) return res.status(401).json({ error: 'Sign in to continue' });
  res.locals.session = session;
  res.locals.entitlement = await getEntitlement(session);
  next();
}

export async function requireEntitled(req: Request, res: Response, next: NextFunction) {
  const session = readSession(req);
  if (!session) return res.status(401).json({ error: 'Sign in with an active subscription to continue' });
  const entitlement = await getEntitlement(session);
  if (!entitlement.active) return res.status(403).json({ error: 'An active subscription is required for this action' });
  res.locals.session = session;
  res.locals.entitlement = entitlement;
  next();
}

export async function isEntitled(session: AppSession | null) {
  return (await getEntitlement(session)).active;
}
