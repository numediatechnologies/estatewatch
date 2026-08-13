import { Router } from 'express';
import { query } from '../db.js';
import { sendEstateAlertEmail } from '../emailService.js';
import { recordOperationalIncident } from '../operationalIncidents.js';
import { sendEmailSchema } from '../types.js';
import { validate } from '../validate.js';
import { readSession } from '../auth.js';
import { liveEstatePredicate, isWithinLiveWindow } from '../estateRetention.js';

export const notificationsRouter = Router();

function sessionOr401(req: any, res: any) {
  const session = readSession(req);
  if (!session) {
    res.status(401).json({ error: 'Sign in to view alert delivery history' });
    return null;
  }
  return session;
}

notificationsRouter.get('/', async (req, res) => {
  try {
    const session = sessionOr401(req, res);
    if (!session) return;
    const alertId = typeof req.query.alertId === 'string' ? req.query.alertId : null;
    const result = await query(`SELECT n.* FROM notifications n
      LEFT JOIN alerts a ON a.id=n.alert_id
      JOIN estates e ON e.id=n.estate_id
      WHERE ($1::text IS NULL OR n.alert_id=$1)
        AND ${liveEstatePredicate('e')}
        AND ($2='admin' OR a.owner_id=$3)
      ORDER BY n.sent_at DESC LIMIT 2000;`, [alertId, session.role, session.sub]);
    res.json(
      result.rows.map((row) => ({
        id: row.id,
        alertId: row.alert_id,
        alertName: row.alert_name,
        estateId: row.estate_id,
        deceasedName: row.deceased_name,
        estateNumber: row.estate_number,
        channel: row.channel,
        sentAt: row.sent_at,
        status: row.status,
        recipient: row.recipient,
        providerMessageId: row.provider_message_id,
        attempts: row.attempts,
        error: row.error,
      }))
    );
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

notificationsRouter.post('/send-email', validate(sendEmailSchema), async (req, res) => {
  try {
    const session = sessionOr401(req, res);
    if (!session) return;
    const { recipientEmail, estate, alertName } = req.body;
    if (!isWithinLiveWindow(String(estate?.gazetteDate || ''))) return res.status(400).json({ error: 'Notifications are limited to the current four-month Gazette window' });
    const emailResult = await sendEstateAlertEmail({
      to: recipientEmail,
      subject: `[EstateWatch Alert] Match Found: ${estate.deceasedName} (${estate.estateNumber})`,
      estateId: estate.id,
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

    if (!emailResult.success) {
      return res.status(500).json({ success: false, error: emailResult.error });
    }

    const notifId = `notif-${Date.now()}`;
    const sentAt = new Date().toISOString().replace('T', ' ').substring(0, 16);
    await query(
      `INSERT INTO notifications (id, alert_id, alert_name, estate_id, deceased_name, estate_number, channel, sent_at, status, recipient, provider_message_id, attempts, error)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 1, NULL);`,
      [notifId, 'alt-manual', alertName || 'Manual Dispatch', estate.id, estate.deceasedName, estate.estateNumber, 'email', sentAt, 'sent', recipientEmail, emailResult.messageId || null]
    );

    res.json({
      success: true,
      message: `Email notification sent successfully to ${recipientEmail}!`,
      messageId: emailResult.messageId,
      sentAt,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

notificationsRouter.post('/:id/retry', async (req, res) => {
  try {
    const session = sessionOr401(req, res);
    if (!session) return;
    const result = await query(`SELECT n.*, e.* FROM notifications n
      JOIN estates e ON e.id=n.estate_id
      LEFT JOIN alerts a ON a.id=n.alert_id
      WHERE n.id=$1 AND n.channel='email' AND n.status='failed'
        AND ${liveEstatePredicate('e')}
        AND ($2='admin' OR a.owner_id=$3)`, [req.params.id, session.role, session.sub]);
    const row = result.rows[0];
    if (!row) return res.status(404).json({ error: 'Failed email notification not found' });
    const emailResult = await sendEstateAlertEmail({
      to: row.recipient, subject: `[EstateWatch Alert] Match Found: ${row.deceased_name} (${row.estate_number})`,
      estateId: row.estate_id, estateName: row.deceased_name, estateNumber: row.estate_number,
      province: row.province, district: row.district, valueBand: row.value_band,
      executorName: row.executor_name, executorContact: row.executor_contact, executorEmail: row.executor_email,
      gazetteRef: row.gazette_ref, rawSnippet: row.raw_notice_snippet, alertName: row.alert_name,
      idNumberMasked: row.id_number_masked, dateOfDeath: row.date_of_death, gazetteDate: row.gazette_date,
      claimPeriodDays: row.claim_period_days, sourceUrl: row.source_url,
    });
    await query('UPDATE notifications SET status=$1,provider_message_id=$2,error=$3,attempts=attempts+1,last_attempt_at=NOW(),sent_at=$4 WHERE id=$5', [emailResult.success ? 'sent' : 'failed', emailResult.success ? emailResult.messageId : null, emailResult.success ? null : emailResult.error, new Date().toISOString().replace('T', ' ').substring(0, 16), row.id]);
    if (!emailResult.success) await recordOperationalIncident({ type: 'alert_delivery_failure', severity: 'high', summary: `Retry failed for ${row.alert_name}`, detail: emailResult.error, alertId: row.alert_id, estateId: row.estate_id, notificationId: row.id, providerAttempts: emailResult.attempts, dedupeKey: `alert-email-retry:${row.alert_id}:${row.estate_id}` });
    res.status(emailResult.success ? 200 : 502).json({ success: emailResult.success, provider: emailResult.success ? emailResult.provider : undefined, attempts: emailResult.attempts, error: emailResult.success ? undefined : emailResult.error });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});
