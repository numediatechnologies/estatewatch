import { query } from './db.js';

export type AuditActor = { id?: string | null; email?: string | null; role?: string | null };

export async function recordAuditEvent(input: {
  eventType: string;
  actor?: AuditActor;
  userId?: string | null;
  channel?: string | null;
  status?: string | null;
  subjectType?: string | null;
  subjectId?: string | null;
  idempotencyKey?: string | null;
  metadata?: Record<string, unknown>;
}) {
  try {
    await query(
      `INSERT INTO audit_events
       (event_type, actor_id, actor_email, actor_role, user_id, channel, status, subject_type, subject_id, idempotency_key, metadata)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11::jsonb)
       ON CONFLICT (idempotency_key) DO NOTHING`,
      [input.eventType, input.actor?.id || null, input.actor?.email || null, input.actor?.role || null,
        input.userId || input.actor?.id || null, input.channel || null, input.status || null,
        input.subjectType || null, input.subjectId || null, input.idempotencyKey || null,
        JSON.stringify(input.metadata || {})]
    );
  } catch (error) {
    // Audit writes must never expose secrets or prevent the primary operation from
    // completing when an older database has not yet received the migration.
    console.error('Audit event could not be recorded:', error);
  }
}

export function maskedPhone(value?: string | null) {
  if (!value) return null;
  const digits = value.replace(/\D/g, '');
  return `***${digits.slice(-4)}`;
}
