export interface IngestResult {
  ingestionId: string;
  timestamp: string;
  status: string;
  stats: {
    totalGazettes: number;
    successfulParses: number;
    failedParses: number;
    estatesCreated: number;
    duplicatesSkipped: number;
    matchedAlerts: number;
    rejected: number;
    recordsDetected: number;
    missingRequired: number;
    recordsReview: number;
    retentionQuarantined: number;
  };
  estates: Array<{
    estateNumber: string;
    deceasedName: string;
    province: string;
    valueBand: string;
    source: string;
    matchedAlerts: string[];
  }>;
  errors: Array<{ url: string; error: string }>;
  notifications: Array<{ alertId: string; alertName: string; estateNumber: string; status: string }>;
}

export function emptyIngestResult(): IngestResult {
  return {
    ingestionId: `ingest-${Date.now()}`,
    timestamp: new Date().toISOString(),
    status: 'completed',
    stats: { totalGazettes: 0, successfulParses: 0, failedParses: 0, estatesCreated: 0, duplicatesSkipped: 0, matchedAlerts: 0, rejected: 0, recordsDetected: 0, missingRequired: 0, recordsReview: 0, retentionQuarantined: 0 },
    estates: [],
    errors: [],
    notifications: [],
  };
}
