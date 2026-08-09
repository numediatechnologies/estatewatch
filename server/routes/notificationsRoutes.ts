import { Router } from 'express';
import { query } from '../db.js';
import { sendEstateAlertEmail } from '../emailService.js';
import { sendEmailSchema } from '../types.js';
import { validate } from '../validate.js';

export const notificationsRouter = Router();

notificationsRouter.get('/', async (_req, res) => {
  try {
    const result = await query('SELECT * FROM notifications ORDER BY sent_at DESC LIMIT 50;');
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
      }))
    );
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

notificationsRouter.post('/send-email', validate(sendEmailSchema), async (req, res) => {
  try {
    const { recipientEmail, estate, alertName } = req.body;
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

    if (!emailResult.success) {
      return res.status(500).json({ success: false, error: emailResult.error });
    }

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
      sentAt,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
