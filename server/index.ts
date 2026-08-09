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
  if (req.header('authorization') !== `Bearer ${configuredToken}`) {
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
application.use('/api/notifications', (req, res, next) => {
  if (req.method === 'POST') return requireAdmin(req, res, next);
  next();
}, notificationsRouter);

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

application.post('/api/ingest-gazettes', requireAdmin, async (_req, res) => {
  try {
    const result = await dependencies.ingest();
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
