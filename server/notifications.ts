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
  for (const match of matches) {
    const recipient = recipientOverride || match.recipientEmail || '';
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
      status: 'queued',
      recipient,
    };

    try {
      const inserted = await query(
        `INSERT INTO notifications (id, alert_id, alert_name, estate_id, deceased_name, estate_number, channel, sent_at, status, recipient)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         ON CONFLICT (alert_id, estate_id, channel) DO NOTHING;`,
        [event.id, match.alertId, match.alertName, estate.id, estate.deceasedName, estate.estateNumber, 'email', sentAt, event.status, recipient]
      );
      if (inserted.rowCount === 0) continue;
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
        recipientName: match.ownerName,
        matchReasons: match.reasons,
        idNumberMasked: estate.idNumberMasked,
        dateOfDeath: estate.dateOfDeath,
        gazetteDate: estate.gazetteDate,
        claimPeriodDays: estate.claimPeriodDays,
        sourceUrl: estate.sourceUrl,
      });
      if (emailResult.success) {
        event.status = 'sent';
        await query('UPDATE notifications SET status=$1,provider_message_id=$2,attempts=attempts+1 WHERE alert_id=$3 AND estate_id=$4 AND channel=$5', ['sent', emailResult.messageId, match.alertId, estate.id, 'email']);
        await query('UPDATE alerts SET match_count=match_count+1,last_triggered=$1 WHERE id=$2', [sentAt, match.alertId]);
      } else {
        event.status = 'failed';
        await query('UPDATE notifications SET status=$1,error=$2,attempts=attempts+1 WHERE alert_id=$3 AND estate_id=$4 AND channel=$5', ['failed', emailResult.error, match.alertId, estate.id, 'email']);
      }
    } else {
      event.status = 'failed';
      await query(
        'UPDATE notifications SET status=$1,error=$2,attempts=attempts+1 WHERE alert_id=$3 AND estate_id=$4 AND channel=$5',
        ['failed', 'No recipient email configured', match.alertId, estate.id, 'email']
      );
    }

    events.push(event);
  }

  return events;
}
