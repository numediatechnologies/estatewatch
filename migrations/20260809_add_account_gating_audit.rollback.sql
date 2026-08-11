DROP INDEX IF EXISTS audit_events_type_idx;
DROP INDEX IF EXISTS audit_events_user_idx;
DROP TABLE IF EXISTS audit_events;
DROP INDEX IF EXISTS alerts_owner_idx;
ALTER TABLE alerts DROP COLUMN IF EXISTS delivery_state;
