import cors from 'cors';
import dotenv from 'dotenv';
import express, { NextFunction, Request, Response } from 'express';
import { fileURLToPath } from 'node:url';
import { alertsRouter } from './routes/alerts.js';
import { estatesRouter } from './routes/estates.js';
import { notificationsRouter } from './routes/notificationsRoutes.js';
import { pipelineRouter } from './routes/pipeline.js';
import { createFirecrawlClient, discoverGazettes } from './firecrawlDiscovery.js';
import { runIngestion } from './ingestService.js';
import { query } from './db.js';
import { initializeDatabase } from './initDb.js';
import { authenticateWithNeon, clearSessionCookie, createSessionToken, readSession, requestPasswordResetWithNeon, resetPasswordWithNeon, setSessionCookie } from './auth.js';
import { createHmac, randomInt, randomUUID, timingSafeEqual } from 'node:crypto';
import { normalizeSmsRecipient, sendVerificationSms } from './smsService.js';
import { sendContactMessage, sendIngestionFailureEmail, sendTestEmail } from './emailService.js';

dotenv.config({ path: '.env.local' });
dotenv.config();

interface AppDependencies {
  discover: typeof discoverGazettes;
  createClient: typeof createFirecrawlClient;
  ingest: typeof runIngestion;
}

function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const configuredToken = process.env.ADMIN_API_TOKEN;
  if (!configuredToken && process.env.NODE_ENV !== 'production') return next();
  if (!configuredToken) return res.status(503).json({ error: 'ADMIN_API_TOKEN is required in production' });
  const session = readSession(req);
  if (req.header('authorization') !== `Bearer ${configuredToken}` && session?.role !== 'admin') {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

function requireCron(req: Request, res: Response, next: NextFunction) {
  if (!process.env.CRON_SECRET) return res.status(503).json({ error: 'CRON_SECRET is required' });
  if (req.header('authorization') !== `Bearer ${process.env.CRON_SECRET}`) return res.status(401).json({ error: 'Unauthorized' });
  next();
}

export function createApp(dependencies: AppDependencies = {
  discover: discoverGazettes,
  createClient: createFirecrawlClient,
  ingest: runIngestion,
}) {
const application = express();
application.use(cors());
application.use(express.json({ limit: '1mb' }));
application.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password, name, companyName, verificationMethod = 'email' } = req.body || {};
    if (typeof email !== 'string' || typeof password !== 'string' || password.length < 8) return res.status(400).json({ error: 'A valid email and password of at least 8 characters are required' });
    if (verificationMethod !== 'email') return res.status(400).json({ error: 'Use the SMS verification start endpoint for mobile verification' });
    const session = await authenticateWithNeon('sign-up', { email, password, name, companyName });
    res.status(202).json({ success: true, verificationRequired: true, method: 'email', message: `Great! Check ${session.email} and follow the verification link, then sign in.` });
  } catch (error: any) { res.status(error.status || 400).json({ error: error.message }); }
});
application.post('/api/contact', async (req, res) => {
  try {
    if (String(req.body?.website || '').trim()) return res.json({ success: true, message: 'Thanks — your message has been received.' });
    const name = String(req.body?.name || '').trim();
    const company = String(req.body?.company || '').trim();
    const email = String(req.body?.email || '').trim().toLowerCase();
    const phone = String(req.body?.phone || '').trim();
    const enquiry = String(req.body?.enquiry || '').trim();
    const message = String(req.body?.message || '').trim();
    if (name.length < 2) return res.status(400).json({ error: 'Please enter your name.' });
    if (!/^\S+@\S+\.\S+$/.test(email)) return res.status(400).json({ error: 'Please enter a valid email address.' });
    if (!enquiry) return res.status(400).json({ error: 'Please select an enquiry type.' });
    if (message.length < 10) return res.status(400).json({ error: 'Please add at least 10 characters to your message.' });
    const result = await sendContactMessage({ name, company, email, phone, enquiry, message });
    if (!result.success) return res.status(502).json({ error: result.error || 'Contact email could not be sent.' });
    res.json({ success: true, message: 'Thanks — your message has been sent to the EstateWatch team.' });
  } catch (error: any) { res.status(500).json({ error: error.message || 'Contact email could not be sent.' }); }
});
const verificationHash = (id: string, code: string) => {
  const secret = process.env.AUTH_SESSION_SECRET || process.env.ADMIN_API_TOKEN;
  if (!secret) throw Object.assign(new Error('Registration verification is not configured'), { status: 503 });
  return createHmac('sha256', secret).update(`${id}:${code}`).digest('hex');
};
application.post('/api/auth/register/sms/start', async (req, res) => {
  try {
    const email = String(req.body?.email || '').trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(email)) return res.status(400).json({ error: 'Enter a valid email address' });
    const phone = normalizeSmsRecipient(String(req.body?.phone || ''));
    if (!phone.startsWith('27')) return res.status(400).json({ error: 'Enter a South African mobile number' });
    const recent = await query(`SELECT count(*)::int count FROM registration_verifications WHERE (email=$1 OR phone_number=$2) AND created_at > NOW() - INTERVAL '10 minutes'`, [email, phone]);
    if (Number(recent.rows[0]?.count) >= 3) return res.status(429).json({ error: 'Too many verification requests. Please wait 10 minutes and try again.' });
    const id = randomUUID(); const code = String(randomInt(100000, 1000000));
    await query(`INSERT INTO registration_verifications(id,email,phone_number,code_hash,expires_at) VALUES($1,$2,$3,$4,NOW()+INTERVAL '5 minutes')`, [id, email, phone, verificationHash(id, code)]);
    const sent = await sendVerificationSms(phone, code);
    if (!sent.success) { await query('DELETE FROM registration_verifications WHERE id=$1', [id]); throw Object.assign(new Error('We could not send the SMS. Choose email verification or try again.'), { status: 502 }); }
    res.status(202).json({ success: true, challengeId: id, phoneMasked: `***${phone.slice(-4)}`, message: `We sent a six-digit code to ***${phone.slice(-4)}.` });
  } catch (error: any) { res.status(error.status || 400).json({ error: error.message }); }
});
application.post('/api/auth/register/sms/verify', async (req, res) => {
  try {
    const { challengeId, code, email, password, name, companyName } = req.body || {};
    if (!/^[0-9]{6}$/.test(String(code || '')) || typeof password !== 'string' || password.length < 8) return res.status(400).json({ error: 'Enter the six-digit code and a password of at least 8 characters' });
    const result = await query(`SELECT * FROM registration_verifications WHERE id=$1 AND used_at IS NULL`, [challengeId]);
    const challenge = result.rows[0];
    if (!challenge || challenge.expires_at < new Date() || challenge.attempts >= 5 || challenge.email !== String(email).toLowerCase()) return res.status(400).json({ error: 'That code is invalid or expired. Request a new code.' });
    const expected = Buffer.from(challenge.code_hash); const actual = Buffer.from(verificationHash(challengeId, String(code)));
    if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) { await query('UPDATE registration_verifications SET attempts=attempts+1 WHERE id=$1', [challengeId]); return res.status(400).json({ error: 'That code is incorrect.' }); }
    const session = await authenticateWithNeon('sign-up', { email: challenge.email, password, name, companyName });
    await query('UPDATE registration_verifications SET used_at=NOW() WHERE id=$1', [challengeId]);
    await query('UPDATE user_profiles SET phone_number=$1,phone_verified_at=NOW() WHERE auth_subject=$2', [challenge.phone_number, session.sub]);
    setSessionCookie(res, createSessionToken(session));
    res.status(201).json({ user: { id: session.sub, email: session.email, name: session.name, role: session.role, subscriptionActive: session.subscriptionActive, companyName: session.companyName } });
  } catch (error: any) { res.status(error.status || 400).json({ error: error.message }); }
});
application.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (typeof email !== 'string' || typeof password !== 'string') return res.status(400).json({ error: 'Email and password are required' });
    const session = await authenticateWithNeon('sign-in', { email, password });
    setSessionCookie(res, createSessionToken(session));
    res.json({ user: { id: session.sub, email: session.email, name: session.name, role: session.role, subscriptionActive: session.subscriptionActive, companyName: session.companyName } });
  } catch (error: any) { res.status(error.status || 401).json({ error: error.message }); }
});
application.post('/api/auth/forgot-password', async (req, res) => {
  const email = req.body?.email;
  if (typeof email !== 'string' || !/^\S+@\S+\.\S+$/.test(email)) return res.status(400).json({ error: 'A valid email address is required' });
  try {
    await requestPasswordResetWithNeon(email.toLowerCase());
  } catch (error: any) {
    // Preserve a generic response for valid addresses so this endpoint cannot be
    // used to discover which people have EstateWatch accounts.
    if (error.status !== 400 && error.status !== 404) return res.status(error.status || 502).json({ error: 'Password reset service is temporarily unavailable' });
  }
  res.json({ success: true, message: 'If an account exists for that email, a password reset link has been sent.' });
});
application.post('/api/auth/reset-password', async (req, res) => {
  const { token, newPassword } = req.body || {};
  if (typeof token !== 'string' || token.length < 10) return res.status(400).json({ error: 'A valid password reset token is required' });
  if (typeof newPassword !== 'string' || newPassword.length < 8) return res.status(400).json({ error: 'The new password must be at least 8 characters' });
  try {
    await resetPasswordWithNeon(token, newPassword);
    clearSessionCookie(res);
    res.json({ success: true, message: 'Password updated. You can now sign in.' });
  } catch (error: any) { res.status(error.status || 400).json({ error: error.message || 'The reset link is invalid or expired' }); }
});
application.get('/api/auth/session', (req, res) => {
  const session = readSession(req);
  if (!session) return res.status(401).json({ user: null });
  res.json({ user: { id: session.sub, email: session.email, name: session.name, role: session.role, subscriptionActive: session.subscriptionActive, companyName: session.companyName } });
});
application.post('/api/auth/logout', (_req, res) => { clearSessionCookie(res); res.json({ success: true }); });
application.get('/api/health', async (_req, res) => {
  if (!process.env.DATABASE_URL && !process.env.POSTGRES_URL) {
    return res.status(503).json({ status: 'degraded', database: 'not_configured' });
  }
  try {
    await query('SELECT 1');
    res.json({ status: 'ok', database: 'connected', version: process.env.VERCEL_GIT_COMMIT_SHA || process.env.npm_package_version || 'local' });
  } catch {
    res.status(503).json({ status: 'degraded', database: 'unavailable' });
  }
});
application.use('/api/estates', estatesRouter);
application.use('/api/alerts', (req, res, next) => {
  if (req.method !== 'GET') return requireAdmin(req, res, next);
  next();
}, alertsRouter);
application.use('/api/pipeline', pipelineRouter);
application.use('/api/notifications', requireAdmin, notificationsRouter);

application.post('/api/run-fetch', requireAdmin, async (req, res) => {
  try {
    const result = await dependencies.discover(dependencies.createClient(), {
      maxPages: Number(req.body?.maxPages) || 10,
    });
    res.json({ success: true, ...result });
  } catch (error: any) {
    const status = /FIRECRAWL_API_KEY/.test(error.message) ? 503 : 502;
    res.status(status).json({ success: false, error: error.message });
  }
});

application.post('/api/ingest-gazettes', requireAdmin, async (req, res) => {
  try {
    const sourceUrls = Array.isArray(req.body?.sourceUrls) ? req.body.sourceUrls.filter((url: unknown) => typeof url === 'string') : undefined;
    const result = await dependencies.ingest({ sourceUrls });
    res.status(result.status === 'completed' ? 200 : 502).json({ success: result.status === 'completed', data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});
application.post('/api/admin/migrate', requireAdmin, async (_req, res) => {
  try {
    await initializeDatabase();
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});
application.get('/api/admin/settings', requireAdmin, async (_req, res) => {
  try {
    await query(`CREATE TABLE IF NOT EXISTS app_settings (setting_key VARCHAR(100) PRIMARY KEY, setting_value TEXT NOT NULL, updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP)`);
    const result = await query(`SELECT setting_key, setting_value FROM app_settings WHERE setting_key = ANY($1::text[])`, [['legalCompanyName', 'tradingName', 'notificationEmail']]);
    const values = Object.fromEntries(result.rows.map((row: any) => [row.setting_key, row.setting_value]));
    res.json({
      legalCompanyName: values.legalCompanyName || 'NuMedia Direct Marketing (Pty) Ltd',
      tradingName: values.tradingName || 'EstateWatch',
      notificationEmail: values.notificationEmail || process.env.ADMIN_EMAIL || '',
      adminEmail: process.env.ADMIN_EMAIL || '',
      resendConfigured: Boolean(process.env.RESEND_API_KEY),
      neonAuthConfigured: Boolean(process.env.NEON_AUTH_BASE_URL),
    });
  } catch (error: any) { res.status(500).json({ error: error.message }); }
});
application.patch('/api/admin/settings', requireAdmin, async (req, res) => {
  try {
    await query(`CREATE TABLE IF NOT EXISTS app_settings (setting_key VARCHAR(100) PRIMARY KEY, setting_value TEXT NOT NULL, updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP)`);
    const legalCompanyName = String(req.body?.legalCompanyName || '').trim();
    const tradingName = String(req.body?.tradingName || '').trim();
    const notificationEmail = String(req.body?.notificationEmail || '').trim().toLowerCase();
    if (legalCompanyName.length < 2 || legalCompanyName.length > 255) return res.status(400).json({ error: 'Enter a valid legal company name' });
    if (tradingName.length < 2 || tradingName.length > 255) return res.status(400).json({ error: 'Enter a valid trading name' });
    if (!/^\S+@\S+\.\S+$/.test(notificationEmail)) return res.status(400).json({ error: 'Enter a valid notification email address' });
    for (const [key, value] of [['legalCompanyName', legalCompanyName], ['tradingName', tradingName], ['notificationEmail', notificationEmail]]) {
      await query(`INSERT INTO app_settings(setting_key, setting_value, updated_at) VALUES($1,$2,NOW()) ON CONFLICT(setting_key) DO UPDATE SET setting_value=EXCLUDED.setting_value, updated_at=NOW()`, [key, value]);
    }
    res.json({ legalCompanyName, tradingName, notificationEmail, adminEmail: process.env.ADMIN_EMAIL || '', resendConfigured: Boolean(process.env.RESEND_API_KEY), neonAuthConfigured: Boolean(process.env.NEON_AUTH_BASE_URL) });
  } catch (error: any) { res.status(500).json({ error: error.message }); }
});
application.post('/api/admin/settings/test-email', requireAdmin, async (req, res) => {
  const to = String(req.body?.to || '').trim().toLowerCase();
  if (!/^\S+@\S+\.\S+$/.test(to)) return res.status(400).json({ error: 'Enter a valid test email address' });
  const result = await sendTestEmail(to);
  res.status(result.success ? 200 : 502).json(result);
});
application.get('/api/cron/ingest', requireCron, async (_req, res) => {
  try {
    const result = await dependencies.ingest();
    if (result.status !== 'completed') {
      const detail = result.errors.map((entry) => `${entry.url}: ${entry.error}`).join('; ') || 'Ingestion was flagged without an error detail';
      const incident = await sendIngestionFailureEmail(detail).catch((error) => ({ success: false, error: error.message }));
      return res.status(502).json({ success: false, data: result, incident: { operatorNotified: incident.success } });
    }
    res.status(200).json({ success: true, data: result });
  } catch (error: any) {
    await sendIngestionFailureEmail(error.message).catch(() => undefined);
    res.status(500).json({ success: false, error: error.message });
  }
});

application.use((_req, res) => res.status(404).json({ error: 'Not found' }));
return application;
}

export const app = createApp();

const isDirectRun = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isDirectRun) {
  const port = Number(process.env.PORT) || 5050;
  app.listen(port, () => console.log(`EstateWatch API listening on http://localhost:${port}`));
}

export default app;
export const maxDuration = 300;
