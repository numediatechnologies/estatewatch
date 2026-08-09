import { Router } from 'express';
import { query } from '../db.js';
import { alertSchema } from '../types.js';
import { mapAlertRow } from '../mappers.js';
import { validate } from '../validate.js';

export const alertsRouter = Router();

alertsRouter.get('/', async (_req, res) => {
  try {
    const result = await query('SELECT * FROM alerts ORDER BY created_at DESC;');
    res.json(result.rows.map(mapAlertRow));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

alertsRouter.post('/', validate(alertSchema), async (req, res) => {
  try {
    const a = req.body;
    const id = a.id || `alt-${Date.now()}`;
    await query(
      `INSERT INTO alerts (
        id, name, surname_match, provinces, districts, value_bands, asset_types,
        executor_status, channels, is_active, match_count, last_triggered, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        provinces = EXCLUDED.provinces,
        value_bands = EXCLUDED.value_bands,
        channels = EXCLUDED.channels;`,
      [
        id, a.name, a.surnameMatch || null, a.provinces, a.districts || [],
        a.valueBands, a.assetTypes, a.executorStatus || [], a.channels,
        a.isActive ?? true, a.matchCount || 0, a.lastTriggered || null,
        a.createdAt || new Date().toISOString().substring(0, 10),
      ]
    );
    const saved = await query('SELECT * FROM alerts WHERE id = $1', [id]);
    res.status(201).json(mapAlertRow(saved.rows[0]));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

alertsRouter.patch('/:id/toggle', async (req, res) => {
  try {
    const { id } = req.params;
    const current = await query('SELECT is_active FROM alerts WHERE id = $1', [id]);
    if (current.rowCount === 0) return res.status(404).json({ error: 'Alert not found' });
    const newActiveState = !current.rows[0].is_active;
    await query('UPDATE alerts SET is_active = $1 WHERE id = $2', [newActiveState, id]);
    res.json({ id, isActive: newActiveState });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

alertsRouter.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await query('DELETE FROM alerts WHERE id = $1', [id]);
    res.json({ success: true, id });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
