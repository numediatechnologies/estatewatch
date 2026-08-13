import type { Request, Response, NextFunction } from 'express';
import { query } from './db.js';
import { readSession, type AppSession } from './auth.js';
import { FREE_TIER_LIMITS } from './payments.js';

export interface Entitlement {
  active: boolean;
  role: 'user' | 'admin';
  status: string;
  expiresAt?: string | null;
  plan: 'free' | 'pro' | 'agency';
  limits: typeof FREE_TIER_LIMITS;
  usage?: { savedAlerts: number; estateViews: number; pipelineOpportunities: number };
}

export async function getEntitlement(session: AppSession | null): Promise<Entitlement> {
  if (!session) return { active: false, role: 'user', status: 'anonymous', plan: 'free', limits: FREE_TIER_LIMITS };
  if (session.role === 'admin') return { active: true, role: 'admin', status: 'admin', plan: 'agency', limits: FREE_TIER_LIMITS };
  const result = await query('SELECT subscription_status, subscription_expires_at, subscription_plan FROM user_profiles WHERE auth_subject=$1', [session.sub]);
  const row = result.rows[0];
  const active = row?.subscription_status === 'active' && (!row.subscription_expires_at || new Date(row.subscription_expires_at) > new Date());
  const plan = row?.subscription_plan === 'agency' ? 'agency' : row?.subscription_plan === 'pro' && active ? 'pro' : 'free';
  const usage = await getUsage(session.sub);
  return { active, role: 'user', status: row?.subscription_status || 'inactive', expiresAt: row?.subscription_expires_at || null, plan, limits: FREE_TIER_LIMITS, usage };
}

export async function getUsage(userId: string) {
  const month = new Date().toISOString().slice(0, 7) + '-01';
  const [alerts, views, pipeline] = await Promise.all([
    query('SELECT count(*)::int AS count FROM alerts WHERE owner_id=$1', [userId]),
    query('SELECT estate_views, pipeline_opportunities FROM billing_usage_monthly WHERE user_id=$1 AND usage_month=$2', [userId, month]),
    query('SELECT count(*)::int AS count FROM pipeline WHERE owner_id=$1', [userId]),
  ]);
  return { savedAlerts: Number(alerts.rows[0]?.count || 0), estateViews: Number(views.rows[0]?.estate_views || 0), pipelineOpportunities: Number(pipeline.rows[0]?.count || 0) };
}

export async function consumeEstateView(userId: string) {
  const month = new Date().toISOString().slice(0, 7) + '-01';
  const result = await query(`INSERT INTO billing_usage_monthly(user_id,usage_month,estate_views) VALUES($1,$2,1)
    ON CONFLICT(user_id,usage_month) DO UPDATE SET estate_views=billing_usage_monthly.estate_views+1,updated_at=NOW() RETURNING estate_views`, [userId, month]);
  return Number(result.rows[0]?.estate_views || 0);
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
