import { Router } from 'express';
import { query } from '../db.js';
import { alertSchema } from '../types.js';
import { mapAlertRow } from '../mappers.js';
import { validate } from '../validate.js';
import { identityFingerprint, isValidSouthAfricanId, maskSouthAfricanId } from '../identity.js';

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
    if (a.idNumberMatch && !isValidSouthAfricanId(a.idNumberMatch)) return res.status(400).json({ error: 'Enter a valid South African identity number' });
    const idNumberHash = a.idNumberMatch ? identityFingerprint(a.idNumberMatch) : null;
    const idNumberMatchMasked = a.idNumberMatch ? maskSouthAfricanId(a.idNumberMatch) : null;
    const id = a.id || `alt-${Date.now()}`;
    await query(
      `INSERT INTO alerts (
        id, name, surname_match, provinces, districts, value_bands, asset_types,
        executor_status, channels, is_active, match_count, last_triggered, created_at, recipient_email, recipient_phone, owner_name,
        id_number_hash, id_number_match_masked
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        surname_match = EXCLUDED.surname_match,
        provinces = EXCLUDED.provinces,
        districts = EXCLUDED.districts,
        value_bands = EXCLUDED.value_bands,
        asset_types = EXCLUDED.asset_types,
        executor_status = EXCLUDED.executor_status,
        channels = EXCLUDED.channels,
        is_active = EXCLUDED.is_active,
        recipient_email = EXCLUDED.recipient_email,
        recipient_phone = EXCLUDED.recipient_phone,
        owner_name = EXCLUDED.owner_name,
        id_number_hash = EXCLUDED.id_number_hash,
        id_number_match_masked = EXCLUDED.id_number_match_masked;`,
      [
        id, a.name, a.surnameMatch || null, a.provinces, a.districts || [],
        a.valueBands, a.assetTypes, a.executorStatus || [], a.channels,
        a.isActive ?? true, a.matchCount || 0, a.lastTriggered || null,
        a.createdAt || new Date().toISOString().substring(0, 10), a.recipientEmail || null, a.recipientPhone || null, a.ownerName || null,
        idNumberHash, idNumberMatchMasked,
      ]
    );
    const saved = await query('SELECT * FROM alerts WHERE id = $1', [id]);
    res.status(201).json(mapAlertRow(saved.rows[0]));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

alertsRouter.patch('/:id', validate(alertSchema), async (req, res) => {
  try {
    const { id } = req.params;
    const a = req.body;
    const current = await query('SELECT id_number_hash, id_number_match_masked FROM alerts WHERE id = $1', [id]);
    if (current.rowCount === 0) return res.status(404).json({ error: 'Alert not found' });
    if (a.idNumberMatch && !isValidSouthAfricanId(a.idNumberMatch)) return res.status(400).json({ error: 'Enter a valid South African identity number' });
    const idNumberHash = a.idNumberMatch ? identityFingerprint(a.idNumberMatch) : current.rows[0].id_number_hash;
    const idNumberMatchMasked = a.idNumberMatch ? maskSouthAfricanId(a.idNumberMatch) : current.rows[0].id_number_match_masked;
    await query(
      `UPDATE alerts SET name = $1, surname_match = $2, provinces = $3, districts = $4, value_bands = $5,
       asset_types = $6, executor_status = $7, channels = $8, is_active = $9, recipient_email = $10,
       recipient_phone = $11, owner_name = $12, id_number_hash = $13, id_number_match_masked = $14 WHERE id = $15`,
      [a.name, a.surnameMatch || null, a.provinces, a.districts || [], a.valueBands, a.assetTypes,
       a.executorStatus || [], a.channels, a.isActive ?? true, a.recipientEmail || null, a.recipientPhone || null,
       a.ownerName || null, idNumberHash, idNumberMatchMasked, id]
    );
    const saved = await query('SELECT * FROM alerts WHERE id = $1', [id]);
    res.json(mapAlertRow(saved.rows[0]));
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
    const result = await query('DELETE FROM alerts WHERE id = $1', [id]);
    if (result.rowCount === 0) return res.status(404).json({ error: 'Alert not found' });
    res.json({ success: true, id });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
