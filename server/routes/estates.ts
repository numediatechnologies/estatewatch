import { Router } from 'express';
import { query } from '../db.js';
import { estateSchema } from '../types.js';
import { mapEstateRow } from '../mappers.js';
import { validate } from '../validate.js';

export const estatesRouter = Router();

estatesRouter.get('/', async (_req, res) => {
  try {
    const result = await query('SELECT * FROM estates ORDER BY created_at DESC;');
    res.json(result.rows.map(mapEstateRow));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

estatesRouter.get('/:id', async (req, res) => {
  try {
    const result = await query('SELECT * FROM estates WHERE id = $1', [req.params.id]);
    if (!result.rows[0]) return res.status(404).json({ error: 'Estate record not found' });
    res.json(mapEstateRow(result.rows[0]));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

estatesRouter.post('/', validate(estateSchema), async (req, res) => {
  try {
    const e = req.body;
    const id = e.id || `est-${Date.now()}`;
    await query(
      `INSERT INTO estates (
        id, source_id, deceased_name, id_number_masked, date_of_death, gazette_date,
        province, district, master_office, estate_number, executor_name, executor_contact,
        executor_email, value_band, asset_types, raw_notice_snippet, gazette_ref,
        status, has_property, property_details
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
      ON CONFLICT (id) DO UPDATE SET
        deceased_name = EXCLUDED.deceased_name,
        executor_name = EXCLUDED.executor_name,
        executor_contact = EXCLUDED.executor_contact,
        executor_email = EXCLUDED.executor_email,
        status = EXCLUDED.status;`,
      [
        id, e.sourceId, e.deceasedName, e.idNumberMasked, e.dateOfDeath, e.gazetteDate,
        e.province, e.district, e.masterOffice, e.estateNumber, e.executorName, e.executorContact,
        e.executorEmail, e.valueBand, e.assetTypes, e.rawNoticeSnippet, e.gazetteRef,
        e.status, e.hasProperty, e.propertyDetails || null,
      ]
    );
    const saved = await query('SELECT * FROM estates WHERE id = $1', [id]);
    res.status(201).json(mapEstateRow(saved.rows[0]));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
