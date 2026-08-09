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
import { authenticateWithNeon, clearSessionCookie, createSessionToken, readSession, setSessionCookie } from './auth.js';

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
    const { email, password, name } = req.body || {};
    if (typeof email !== 'string' || typeof password !== 'string' || password.length < 8) return res.status(400).json({ error: 'A valid email and password of at least 8 characters are required' });
    const session = await authenticateWithNeon('sign-up', { email, password, name });
    setSessionCookie(res, createSessionToken(session));
    res.status(201).json({ user: { id: session.sub, email: session.email, name: session.name, role: session.role } });
  } catch (error: any) { res.status(error.status || 400).json({ error: error.message }); }
});
application.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (typeof email !== 'string' || typeof password !== 'string') return res.status(400).json({ error: 'Email and password are required' });
    const session = await authenticateWithNeon('sign-in', { email, password });
    setSessionCookie(res, createSessionToken(session));
    res.json({ user: { id: session.sub, email: session.email, name: session.name, role: session.role } });
  } catch (error: any) { res.status(error.status || 401).json({ error: error.message }); }
});
application.get('/api/auth/session', (req, res) => {
  const session = readSession(req);
  if (!session) return res.status(401).json({ user: null });
  res.json({ user: { id: session.sub, email: session.email, name: session.name, role: session.role } });
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
application.get('/api/cron/ingest', requireCron, async (_req, res) => {
  try {
    const result = await dependencies.ingest();
    res.status(result.status === 'completed' ? 200 : 502).json({ success: result.status === 'completed', data: result });
  } catch (error: any) {
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
