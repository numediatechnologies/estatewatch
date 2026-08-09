import { Router } from 'express';
import { query } from '../db.js';
import { estateSchema } from '../types.js';
import { mapEstateRow, mapEstatePreview } from '../mappers.js';
import { getEntitlement } from '../entitlements.js';
import { validate } from '../validate.js';
import { readSession } from '../auth.js';

export const estatesRouter = Router();

estatesRouter.get('/', async (req, res) => {
  try {
    const result = await query('SELECT * FROM estates ORDER BY created_at DESC;');
    const entitled = (await getEntitlement(readSession(req))).active;
    res.json(result.rows.map((row) => entitled ? mapEstateRow(row) : mapEstatePreview(row)));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

estatesRouter.get('/:id/source', async (req, res) => {
  try {
    const session = readSession(req);
    if (!session) return res.status(401).json({ error: 'Sign in to view the original Gazette PDF' });
    let entitled = session.role === 'admin';
    if (!entitled) {
      const profile = await query(`SELECT subscription_status,subscription_expires_at FROM user_profiles WHERE auth_subject=$1`, [session.sub]);
      const row = profile.rows[0];
      entitled = row?.subscription_status === 'active' && (!row.subscription_expires_at || new Date(row.subscription_expires_at) > new Date());
    }
    if (!entitled) return res.status(403).json({ error: 'An active subscription is required to view the original Gazette PDF' });
    const result = await query('SELECT source_url FROM estates WHERE id=$1', [req.params.id]);
    if (!result.rows[0]) return res.status(404).json({ error: 'Estate record not found' });
    if (!result.rows[0].source_url) return res.status(404).json({ error: 'Original Gazette PDF is not available for this record' });
    res.json({ url: result.rows[0].source_url });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

estatesRouter.get('/:id', async (req, res) => {
  try {
    const result = await query('SELECT * FROM estates WHERE id = $1', [req.params.id]);
    if (!result.rows[0]) return res.status(404).json({ error: 'Estate record not found' });
    const entitled = (await getEntitlement(readSession(req))).active;
    res.json(entitled ? mapEstateRow(result.rows[0]) : mapEstatePreview(result.rows[0]));
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
