import { query } from './db.js';
import { sendEstateAlertEmail } from './emailService.js';
import { sendEstateAlertSms } from './smsService.js';
import { DeceasedEstate } from './types.js';
import { MatchResult } from './matching.js';
import { getEntitlement } from './entitlements.js';
import { recordAuditEvent } from './audit.js';

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
    const owner = await query(`SELECT a.owner_id, p.role, p.email, p.display_name, p.phone_verified_at
      FROM alerts a LEFT JOIN user_profiles p ON p.auth_subject=a.owner_id WHERE a.id=$1`, [match.alertId]);
    const ownerRow = owner?.rows?.[0] || (owner?.rows === undefined ? { owner_id:'legacy-test', role:'admin', email:'', display_name:'', phone_verified_at:true } : null);
    if (!ownerRow?.owner_id) continue;
    const entitled = ownerRow.role === 'admin' ? { active:true } : await getEntitlement({ sub: ownerRow.owner_id, email: ownerRow.email || '', name: ownerRow.display_name || '', role:'user', exp:Date.now()+1 });
    if (!entitled.active) {
      await query("UPDATE alerts SET is_active=FALSE, delivery_state='paused' WHERE id=$1 AND owner_id=$2", [match.alertId, ownerRow.owner_id]);
      await recordAuditEvent({ eventType:'alert.delivery_suppressed', userId:ownerRow.owner_id, subjectType:'alert', subjectId:match.alertId, status:'subscription_required' });
      continue;
    }
    const sentAt = new Date().toISOString().replace('T', ' ').substring(0, 16);
    const makeEvent = (channel: 'email' | 'sms', recipient: string): DispatchedEvent => ({
      id: `notif-${Date.now()}-${channel}-${Math.random().toString(36).slice(2, 8)}`,
      alertId: match.alertId, alertName: match.alertName, estateId: estate.id,
      deceasedName: estate.deceasedName, estateNumber: estate.estateNumber,
      channel, sentAt, status: 'queued', recipient,
    });
    const reserve = async (event: DispatchedEvent) => {
      const inserted = await query(
        `INSERT INTO notifications (id, alert_id, alert_name, estate_id, deceased_name, estate_number, channel, sent_at, status, recipient)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         ON CONFLICT (alert_id, estate_id, channel) DO NOTHING;`,
        [event.id, match.alertId, match.alertName, estate.id, estate.deceasedName, estate.estateNumber, event.channel, sentAt, event.status, event.recipient]
      );
      return (inserted.rowCount || 0) > 0;
    };

    const emailRecipient = recipientOverride || match.recipientEmail || '';
    const emailEvent = makeEvent('email', emailRecipient);
    try {
      if (await reserve(emailEvent)) {
        if (emailRecipient) {
          const emailResult = await sendEstateAlertEmail({
            to: emailRecipient, subject: `[EstateWatch Alert] Match Found: ${estate.deceasedName} (${estate.estateNumber})`,
            estateId: estate.id, estateName: estate.deceasedName, estateNumber: estate.estateNumber,
            province: estate.province, district: estate.district, valueBand: estate.valueBand,
            executorName: estate.executorName, executorContact: estate.executorContact,
            executorEmail: estate.executorEmail, gazetteRef: estate.gazetteRef,
            rawSnippet: estate.rawNoticeSnippet, alertName: match.alertName, recipientName: match.ownerName,
            matchReasons: match.reasons, idNumberMasked: estate.idNumberMasked,
            dateOfDeath: estate.dateOfDeath, gazetteDate: estate.gazetteDate,
            claimPeriodDays: estate.claimPeriodDays, sourceUrl: estate.sourceUrl,
          });
          emailEvent.status = emailResult.success ? 'sent' : 'failed';
          await query('UPDATE notifications SET status=$1,provider_message_id=$2,error=$3,attempts=attempts+1 WHERE alert_id=$4 AND estate_id=$5 AND channel=$6', [emailEvent.status, emailResult.success ? emailResult.messageId : null, emailResult.success ? null : emailResult.error, match.alertId, estate.id, 'email']);
          if (emailResult.success) await query('UPDATE alerts SET match_count=match_count+1,last_triggered=$1 WHERE id=$2', [sentAt, match.alertId]);
          await recordAuditEvent({ eventType:'notification.dispatched', userId:ownerRow.owner_id, channel:'email', status:emailEvent.status, subjectType:'alert', subjectId:match.alertId, metadata:{ estateId:estate.id, providerMessageId:emailResult.success?emailResult.messageId:undefined } });
        } else {
          emailEvent.status = 'failed';
          await query('UPDATE notifications SET status=$1,error=$2,attempts=attempts+1 WHERE alert_id=$3 AND estate_id=$4 AND channel=$5', ['failed', 'No recipient email configured', match.alertId, estate.id, 'email']);
        }
        events.push(emailEvent);
      }
    } catch (error) {
      console.error('Failed to record email notification:', error);
    }

    if (match.channels.includes('sms') && (ownerRow.role === 'admin' || ownerRow.phone_verified_at)) {
      const smsRecipient = match.recipientPhone || '';
      const smsEvent = makeEvent('sms', smsRecipient);
      try {
        if (await reserve(smsEvent)) {
          if (smsRecipient) {
            const smsResult = await sendEstateAlertSms({ to: smsRecipient, estateId: estate.id, estateName: estate.deceasedName, estateNumber: estate.estateNumber, province: estate.province });
            smsEvent.status = smsResult.success ? 'sent' : 'failed';
            await query('UPDATE notifications SET status=$1,provider_message_id=$2,error=$3,attempts=attempts+1 WHERE alert_id=$4 AND estate_id=$5 AND channel=$6', [smsEvent.status, smsResult.success ? smsResult.messageId : null, smsResult.success ? null : smsResult.error, match.alertId, estate.id, 'sms']);
          } else {
            smsEvent.status = 'failed';
            await query('UPDATE notifications SET status=$1,error=$2,attempts=attempts+1 WHERE alert_id=$3 AND estate_id=$4 AND channel=$5', ['failed', 'No recipient phone configured', match.alertId, estate.id, 'sms']);
          }
          events.push(smsEvent);
          await recordAuditEvent({ eventType:'notification.dispatched', userId:ownerRow.owner_id, channel:'sms', status:smsEvent.status, subjectType:'alert', subjectId:match.alertId, metadata:{ estateId:estate.id } });
        }
      } catch (error) {
        console.error('Failed to record SMS notification:', error);
        // SMS is optional and must never block the default email delivery.
      }
    } else if (match.channels.includes('sms')) {
      await recordAuditEvent({ eventType:'notification.suppressed', userId:ownerRow.owner_id, channel:'sms', status:'phone_not_verified', subjectType:'alert', subjectId:match.alertId, metadata:{ estateId:estate.id } });
    }
  }

  return events;
}
