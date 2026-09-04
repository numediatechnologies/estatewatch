/** Morning ingest is 04:45 UTC; afternoon ingest is 11:45 UTC. Watchdog runs 30 minutes later. */
const MORNING_SLOT_HOUR = 4;
const AFTERNOON_SLOT_HOUR = 11;
const AFTERNOON_CUTOVER_HOUR = 10;

export function gazetteIngestSlotStart(now: Date): Date {
  const hour = now.getUTCHours();
  const slotHour = hour < AFTERNOON_CUTOVER_HOUR ? MORNING_SLOT_HOUR : AFTERNOON_SLOT_HOUR;
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), slotHour, 0, 0, 0));
}

export function isTerminalIngestionStatus(status: string | null | undefined): boolean {
  return status === 'completed' || status === 'flagged';
}

export const SLOT_RUN_QUERY = `SELECT ingestion_id, status, completed_at, started_at FROM ingestion_runs
      WHERE completed_at >= $1 AND status IN ('completed','flagged') ORDER BY completed_at DESC LIMIT 1`;

export interface SlotIngestionRun {
  ingestion_id: string;
  status: string;
  completed_at: string | Date;
  started_at?: string | Date;
}

export function missedRunDetail(slotStart: Date): string {
  return `No completed Gazette ingestion was recorded after ${slotStart.toISOString()}. The scheduled run may have been missed or failed before completion.`;
}
