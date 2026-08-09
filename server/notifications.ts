import { query } from './db.js';
import { sendEstateAlertEmail } from './emailService.js';
import { DeceasedEstate } from './types.js';
import { MatchResult } from './matching.js';

export interface DispatchedEvent {
  id: string;
  alertId: string;
  alertName: string;
  estateId: string;
  deceasedName: string;
  estateNumber: string;
  channel: string;
  sentAt: string;
  status: string;
  recipient: string;
  emailPreviewUrl?: string;
}

export async function recordMatches(
  estate: DeceasedEstate,
  matches: MatchResult[],
  recipientOverride?: string
): Promise<DispatchedEvent[]> {
  const events: DispatchedEvent[] = [];
  const recipient = recipientOverride || process.env.ESTATEWATCH_ALERT_EMAIL || '';

  for (const match of matches) {
    const sentAt = new Date().toISOString().replace('T', ' ').substring(0, 16);
    const event: DispatchedEvent = {
      id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      alertId: match.alertId,
      alertName: match.alertName,
      estateId: estate.id,
      deceasedName: estate.deceasedName,
      estateNumber: estate.estateNumber,
      channel: 'email',
      sentAt,
      status: 'delivered',
      recipient,
    };

    try {
      await query(
        `INSERT INTO notifications (id, alert_id, alert_name, estate_id, deceased_name, estate_number, channel, sent_at, status, recipient)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         ON CONFLICT (id) DO NOTHING;`,
        [event.id, match.alertId, match.alertName, estate.id, estate.deceasedName, estate.estateNumber, 'email', sentAt, event.status, recipient]
      );

      await query('UPDATE alerts SET match_count = match_count + 1, last_triggered = $1 WHERE id = $2', [sentAt, match.alertId]);
    } catch (err) {
      console.error('Failed to record notification event:', err);
      event.status = 'failed';
      events.push(event);
      continue;
    }

    if (recipient) {
      const emailResult = await sendEstateAlertEmail({
        to: recipient,
        subject: `[EstateWatch Alert] Match Found: ${estate.deceasedName} (${estate.estateNumber})`,
        estateName: estate.deceasedName,
        estateNumber: estate.estateNumber,
        province: estate.province,
        district: estate.district,
        valueBand: estate.valueBand,
        executorName: estate.executorName,
        executorContact: estate.executorContact,
        executorEmail: estate.executorEmail,
        gazetteRef: estate.gazetteRef,
        rawSnippet: estate.rawNoticeSnippet,
        alertName: match.alertName,
      });
      if (emailResult.success) {
        event.emailPreviewUrl = emailResult.previewUrl;
      } else {
        event.status = 'failed';
      }
    }

    events.push(event);
  }

  return events;
}
