import { createHash } from 'node:crypto';
import { query } from './db.js';
import { sendIngestionFailureEmail } from './emailService.js';

export type IncidentType = 'cron_failure' | 'alert_delivery_failure' | 'provider_failure';

export interface OperationalIncidentInput {
  type: IncidentType;
  severity?: 'low' | 'medium' | 'high' | 'critical';
  summary: string;
  detail: string;
  alertId?: string;
  estateId?: string;
  notificationId?: string;
  ingestionId?: string;
  provider?: string;
  providerAttempts?: unknown[];
  dedupeKey?: string;
}

const safeText = (value: unknown, max: number) => String(value ?? '').replace(/[\u0000-\u001f\u007f]/g, ' ').slice(0, max);

export async function recordOperationalIncident(input: OperationalIncidentInput) {
  if (process.env.NODE_ENV === 'test') return null;
  try {
    const detail = safeText(input.detail, 8000);
    const summary = safeText(input.summary, 500);
    const fingerprint = createHash('sha256').update(input.dedupeKey || `${input.type}:${input.alertId || ''}:${input.estateId || ''}:${input.provider || ''}:${summary}`).digest('hex');
    const result = await query(`
    INSERT INTO operational_incidents
      (incident_type,severity,status,fingerprint,summary,detail,alert_id,estate_id,notification_id,ingestion_id,provider,provider_attempts)
    VALUES($1,$2,'open',$3,$4,$5,$6,$7,$8,$9,$10,$11::jsonb)
    ON CONFLICT (fingerprint,status) DO UPDATE SET
      detail=EXCLUDED.detail,
      provider_attempts=EXCLUDED.provider_attempts,
      occurrence_count=operational_incidents.occurrence_count+1,
      last_occurred_at=CURRENT_TIMESTAMP,
      email_status=NULL
    RETURNING id, occurrence_count`,
    [input.type, input.severity || 'high', fingerprint, summary, detail, input.alertId || null, input.estateId || null,
      input.notificationId || null, input.ingestionId || null, input.provider || null, JSON.stringify(input.providerAttempts || [])]);
    return result.rows[0] || null;
  } catch (error) {
    console.error('Operational incident could not be recorded:', error);
    return null;
  }
}

export async function notifyAdminOfIncident(input: OperationalIncidentInput) {
  const incident = await recordOperationalIncident(input);
  const emailResult = await sendIngestionFailureEmail(`[${input.type}] ${input.summary}\n\n${input.detail}`);
  if (incident?.id) {
    await query('UPDATE operational_incidents SET email_status=$1, provider=$2, provider_attempts=$3::jsonb WHERE id=$4', [
      emailResult.success ? 'sent' : 'failed',
      emailResult.success ? emailResult.provider : null,
      JSON.stringify(emailResult.attempts || []), incident.id]);
  }
  if (!emailResult.success) {
    await recordOperationalIncident({ ...input, type: 'provider_failure', severity: 'critical', provider: 'admin-incident-email', summary: 'Administrator incident email failed', detail: emailResult.error, dedupeKey: `provider-failure:${input.type}:${input.dedupeKey || input.summary}` });
  }
  return { incident, email: emailResult };
}

export async function listOperationalIncidents(limit = 100) {
  const result = await query(`SELECT * FROM operational_incidents ORDER BY CASE WHEN status='open' THEN 0 ELSE 1 END, last_occurred_at DESC LIMIT $1`, [Math.min(Math.max(limit, 1), 500)]);
  return result.rows;
}

export async function resolveOperationalIncident(id: string) {
  const result = await query(`UPDATE operational_incidents SET status='resolved', resolved_at=CURRENT_TIMESTAMP WHERE id=$1 RETURNING *`, [id]);
  return result.rows[0] || null;
}
