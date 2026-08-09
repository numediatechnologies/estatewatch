import { Router } from 'express';
import { query } from '../db.js';
import { mapEstateRow } from '../mappers.js';
import { pipelineCreateSchema, pipelineUpdateSchema } from '../types.js';
import { validate } from '../validate.js';

export const pipelineRouter = Router();

pipelineRouter.get('/', async (_req, res) => {
  try {
    const result = await query(`
      SELECT p.*, e.id as estate_id, e.source_id, e.deceased_name, e.id_number_masked,
             e.date_of_death, e.gazette_date, e.province, e.district, e.master_office,
             e.estate_number, e.executor_name, e.executor_contact, e.executor_email,
             e.value_band, e.asset_types, e.raw_notice_snippet, e.gazette_ref,
             e.status as estate_status, e.has_property, e.property_details
      FROM pipeline p
      JOIN estates e ON p.estate_id = e.id
      ORDER BY p.updated_at DESC;
    `);
    const items = result.rows.map((row) => ({
      id: row.id,
      estateId: row.estate_id,
      estate: mapEstateRow(row),
      stage: row.stage,
      notes: row.notes,
      valueEstimate: Number(row.value_estimate) || 0,
      updatedAt: row.updated_at,
      priority: row.priority,
      tags: row.tags || [],
      followUpAt: row.follow_up_at || undefined,
    }));
    res.json(items);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

pipelineRouter.post('/', validate(pipelineCreateSchema), async (req, res) => {
  try {
    const p = req.body;
    const id = p.id || `pip-${Date.now()}`;
    await query(
      `INSERT INTO pipeline (id, estate_id, stage, notes, value_estimate, priority, tags, updated_at, follow_up_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT (id) DO UPDATE SET stage = EXCLUDED.stage, notes = EXCLUDED.notes, updated_at = EXCLUDED.updated_at, follow_up_at = EXCLUDED.follow_up_at;`,
      [id, p.estateId, p.stage, p.notes || '', p.valueEstimate || 0, p.priority, p.tags || [], p.updatedAt || new Date().toISOString().substring(0, 10), p.followUpAt || null]
    );
    res.status(201).json({ id, ...p });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

pipelineRouter.patch('/:id', validate(pipelineUpdateSchema), async (req, res) => {
  try {
    const { id } = req.params;
    const body = req.body;
    const updatedAt = new Date().toISOString().substring(0, 10);
    let queryText = 'UPDATE pipeline SET updated_at = $1';
    const params: any[] = [updatedAt];
    if (body.stage) { params.push(body.stage); queryText += `, stage = $${params.length}`; }
    if (body.notes !== undefined) { params.push(body.notes); queryText += `, notes = $${params.length}`; }
    if (body.valueEstimate !== undefined) { params.push(body.valueEstimate); queryText += `, value_estimate = $${params.length}`; }
    if (body.priority) { params.push(body.priority); queryText += `, priority = $${params.length}`; }
    if (body.followUpAt !== undefined) { params.push(body.followUpAt); queryText += `, follow_up_at = $${params.length}`; }
    params.push(id);
    queryText += ` WHERE id = $${params.length}`;
    await query(queryText, params);
    res.json({ id, ...body, updatedAt });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

pipelineRouter.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await query('DELETE FROM pipeline WHERE id = $1', [id]);
    res.json({ success: true, id });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
