import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { query } from './db.js';
import { initializeDatabase } from './initDb.js';
import { sendEstateAlertEmail } from './emailService.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5050;

app.use(cors());
app.use(express.json());

// Initialize DB schema & seeds on startup
initializeDatabase().catch((err) => {
  console.error('Initial DB sync warning:', err);
});

// Helper for DB row transformation
const mapEstateRow = (row: any) => ({
  id: row.id,
  sourceId: row.source_id,
  deceasedName: row.deceased_name,
  idNumberMasked: row.id_number_masked,
  dateOfDeath: row.date_of_death,
  gazetteDate: row.gazette_date,
  province: row.province,
  district: row.district,
  masterOffice: row.master_office,
  estateNumber: row.estate_number,
  executorName: row.executor_name,
  executorContact: row.executor_contact,
  executorEmail: row.executor_email,
  valueBand: row.value_band,
  assetTypes: row.asset_types || [],
  rawNoticeSnippet: row.raw_notice_snippet,
  gazetteRef: row.gazette_ref,
  status: row.status,
  hasProperty: row.has_property,
  propertyDetails: row.property_details,
});

const mapAlertRow = (row: any) => ({
  id: row.id,
  name: row.name,
  surnameMatch: row.surname_match,
  provinces: row.provinces || [],
  districts: row.districts || [],
  valueBands: row.value_bands || [],
  assetTypes: row.asset_types || [],
  executorStatus: row.executor_status || [],
  channels: row.channels || [],
  isActive: row.is_active,
  matchCount: row.match_count,
  lastTriggered: row.last_triggered,
  createdAt: row.created_at,
});

// Health check endpoint
app.get('/api/health', async (req, res) => {
  try {
    const dbResult = await query('SELECT NOW() as db_time');
    res.json({
      status: 'ok',
      service: 'EstateWatch API',
      database: 'connected',
      neonHost: process.env.PGHOST || 'ep-super-art-awvpe4nf-pooler',
      timestamp: dbResult.rows[0].db_time,
    });
  } catch (err: any) {
    res.status(500).json({
      status: 'error',
      database: 'disconnected',
      error: err.message,
    });
  }
});

// ---------------- ESTATES ENDPOINTS ----------------
app.get('/api/estates', async (req, res) => {
  try {
    const result = await query('SELECT * FROM estates ORDER BY created_at DESC;');
    res.json(result.rows.map(mapEstateRow));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/estates', async (req, res) => {
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
        id, e.sourceId || 'gazette', e.deceasedName, e.idNumberMasked, e.dateOfDeath, e.gazetteDate,
        e.province, e.district, e.masterOffice, e.estateNumber, e.executorName, e.executorContact,
        e.executorEmail, e.valueBand, e.assetTypes, e.rawNoticeSnippet, e.gazetteRef,
        e.status, e.hasProperty, e.propertyDetails || null
      ]
    );

    const saved = await query('SELECT * FROM estates WHERE id = $1', [id]);
    res.status(201).json(mapEstateRow(saved.rows[0]));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------- ALERTS ENDPOINTS ----------------
app.get('/api/alerts', async (req, res) => {
  try {
    const result = await query('SELECT * FROM alerts ORDER BY created_at DESC;');
    res.json(result.rows.map(mapAlertRow));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/alerts', async (req, res) => {
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
        a.isActive ?? true, a.matchCount || 0, a.lastTriggered || null, a.createdAt || new Date().toISOString().substring(0, 10)
      ]
    );

    const saved = await query('SELECT * FROM alerts WHERE id = $1', [id]);
    res.status(201).json(mapAlertRow(saved.rows[0]));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.patch('/api/alerts/:id/toggle', async (req, res) => {
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

app.delete('/api/alerts/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await query('DELETE FROM alerts WHERE id = $1', [id]);
    res.json({ success: true, id });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------- PIPELINE CRM ENDPOINTS ----------------
app.get('/api/pipeline', async (req, res) => {
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
    }));

    res.json(items);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/pipeline', async (req, res) => {
  try {
    const p = req.body;
    const id = p.id || `pip-${Date.now()}`;
    await query(
      `INSERT INTO pipeline (id, estate_id, stage, notes, value_estimate, priority, tags, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (id) DO UPDATE SET stage = EXCLUDED.stage, notes = EXCLUDED.notes, updated_at = EXCLUDED.updated_at;`,
      [
        id, p.estateId, p.stage || 'new', p.notes || '', p.valueEstimate || 0,
        p.priority || 'high', p.tags || [], p.updatedAt || new Date().toISOString().substring(0, 10)
      ]
    );

    res.status(201).json({ id, ...p });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.patch('/api/pipeline/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { stage, notes, valueEstimate, priority } = req.body;
    const updatedAt = new Date().toISOString().substring(0, 10);

    let queryText = 'UPDATE pipeline SET updated_at = $1';
    const params: any[] = [updatedAt];

    if (stage) { params.push(stage); queryText += `, stage = $${params.length}`; }
    if (notes !== undefined) { params.push(notes); queryText += `, notes = $${params.length}`; }
    if (valueEstimate !== undefined) { params.push(valueEstimate); queryText += `, value_estimate = $${params.length}`; }
    if (priority) { params.push(priority); queryText += `, priority = $${params.length}`; }

    params.push(id);
    queryText += ` WHERE id = $${params.length}`;

    await query(queryText, params);
    res.json({ id, stage, notes, valueEstimate, updatedAt });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/pipeline/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await query('DELETE FROM pipeline WHERE id = $1', [id]);
    res.json({ success: true, id });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------- NOTIFICATIONS & EMAIL ENDPOINTS ----------------
app.get('/api/notifications', async (req, res) => {
  try {
    const result = await query('SELECT * FROM notifications ORDER BY sent_at DESC LIMIT 50;');
    const notifs = result.rows.map(row => ({
      id: row.id,
      alertId: row.alert_id,
      alertName: row.alert_name,
      estateId: row.estate_id,
      deceasedName: row.deceased_name,
      estateNumber: row.estate_number,
      channel: row.channel,
      sentAt: row.sent_at,
      status: row.status,
      recipient: row.recipient
    }));
    res.json(notifs);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Send custom email notification for an estate
app.post('/api/notifications/send-email', async (req, res) => {
  try {
    const { recipientEmail, estate, alertName } = req.body;

    if (!recipientEmail || !estate) {
      return res.status(400).json({ error: 'recipientEmail and estate details are required.' });
    }

    const emailResult = await sendEstateAlertEmail({
      to: recipientEmail,
      subject: `[EstateWatch Alert] Match Found: ${estate.deceasedName} (${estate.estateNumber})`,
      estateName: estate.deceasedName,
      estateNumber: estate.estateNumber,
      province: estate.province,
      district: estate.district,
      valueBand: estate.valueBand,
      executorName: estate.executorName || 'N/A',
      executorContact: estate.executorContact || 'N/A',
      executorEmail: estate.executorEmail || '',
      gazetteRef: estate.gazetteRef || 'Govt Gazette Deceased Section',
      rawSnippet: estate.rawNoticeSnippet || 'No snippet provided',
      alertName: alertName || 'General Estate Watch Criteria',
    });

    if (emailResult.success) {
      // Record notification event in DB
      const notifId = `notif-${Date.now()}`;
      const sentAt = new Date().toISOString().replace('T', ' ').substring(0, 16);
      await query(
        `INSERT INTO notifications (id, alert_id, alert_name, estate_id, deceased_name, estate_number, channel, sent_at, status, recipient)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10);`,
        [notifId, 'alt-manual', alertName || 'Manual Dispatch', estate.id, estate.deceasedName, estate.estateNumber, 'email', sentAt, 'delivered', recipientEmail]
      );

      res.json({
        success: true,
        message: `Email notification sent successfully to ${recipientEmail}!`,
        messageId: emailResult.messageId,
        previewUrl: emailResult.previewUrl,
        sentAt,
      });
    } else {
      res.status(500).json({ success: false, error: emailResult.error });
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------- SIMULATION ENDPOINT ----------------
app.post('/api/simulate-match', async (req, res) => {
  try {
    const newEstate = req.body;
    const id = newEstate.id || `est-${Date.now()}`;

    // 1. Insert into Neon DB
    await query(
      `INSERT INTO estates (
        id, source_id, deceased_name, id_number_masked, date_of_death, gazette_date,
        province, district, master_office, estate_number, executor_name, executor_contact,
        executor_email, value_band, asset_types, raw_notice_snippet, gazette_ref,
        status, has_property, property_details
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
      ON CONFLICT (id) DO NOTHING;`,
      [
        id, newEstate.sourceId || 'simulated', newEstate.deceasedName, newEstate.idNumberMasked,
        newEstate.dateOfDeath, newEstate.gazetteDate, newEstate.province, newEstate.district,
        newEstate.masterOffice, newEstate.estateNumber, newEstate.executorName, newEstate.executorContact,
        newEstate.executorEmail, newEstate.valueBand, newEstate.assetTypes, newEstate.rawNoticeSnippet,
        newEstate.gazetteRef, newEstate.status, newEstate.hasProperty, newEstate.propertyDetails || null
      ]
    );

    // 2. Increment match count for matching alert
    await query("UPDATE alerts SET match_count = match_count + 1, last_triggered = NOW() WHERE id = 'alt-1'");

    // 3. Log notification in DB
    const notifId = `notif-${Date.now()}`;
    const sentAt = new Date().toISOString().replace('T', ' ').substring(0, 16);
    await query(
      `INSERT INTO notifications (id, alert_id, alert_name, estate_id, deceased_name, estate_number, channel, sent_at, status, recipient)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10);`,
      [notifId, 'alt-1', 'Gauteng High-Value Estate Alert', id, newEstate.deceasedName, newEstate.estateNumber, 'email', sentAt, 'delivered', newEstate.executorEmail || 'client@estatewatch.co.za']
    );

    // 4. Optionally attempt real email dispatch to client/executor if email provided
    if (newEstate.executorEmail) {
      sendEstateAlertEmail({
        to: newEstate.executorEmail,
        subject: `[EstateWatch Simulation] Alert Triggered for ${newEstate.deceasedName}`,
        estateName: newEstate.deceasedName,
        estateNumber: newEstate.estateNumber,
        province: newEstate.province,
        district: newEstate.district,
        valueBand: newEstate.valueBand,
        executorName: newEstate.executorName,
        executorContact: newEstate.executorContact,
        executorEmail: newEstate.executorEmail,
        gazetteRef: newEstate.gazetteRef,
        rawSnippet: newEstate.rawNoticeSnippet,
        alertName: 'Gauteng High-Value Estate Alert',
      }).catch(err => console.error('Simulated match email background error:', err));
    }

    res.status(201).json({
      success: true,
      estate: { ...newEstate, id },
      notification: {
        id: notifId,
        alertId: 'alt-1',
        alertName: 'Gauteng High-Value Estate Alert',
        estateId: id,
        deceasedName: newEstate.deceasedName,
        estateNumber: newEstate.estateNumber,
        channel: 'email',
        sentAt,
        status: 'delivered',
        recipient: newEstate.executorEmail || 'client@estatewatch.co.za',
      }
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 EstateWatch API Server running on http://localhost:${PORT}`);
  console.log(`📡 Connected to Neon PostgreSQL Database`);
});
