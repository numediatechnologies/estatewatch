import { DeceasedEstate, AlertCriteria, PipelineItem, NotificationEvent } from '../types';

export interface AdminSettings {
  legalCompanyName: string;
  tradingName: string;
  notificationEmail: string;
  adminEmail: string;
  resendConfigured: boolean;
  zeptomailConfigured: boolean;
  emailProvider: string;
  incidentRecipientConfigured?: boolean;
  neonAuthConfigured: boolean;
}
export interface OperationalIncident { id:string; incident_type:string; severity:string; status:string; summary:string; detail:string; alert_id?:string|null; estate_id?:string|null; notification_id?:string|null; ingestion_id?:string|null; provider?:string|null; provider_attempts?:Array<{provider:string;success:boolean;error?:string}>; email_status?:string|null; occurrence_count:number; last_occurred_at:string; resolved_at?:string|null; }
export interface AdminSubscriptionUser { id:string; email:string; name?:string; role:string; phoneMasked?:string|null; phoneVerified:boolean; subscriptionStatus:string; subscriptionExpiresAt?:string|null; createdAt?:string; }
export interface AuditEvent { id:string; event_type:string; actor_email?:string; user_id?:string; channel?:string; status?:string; subject_type?:string; subject_id?:string; metadata?:Record<string,unknown>; created_at:string; }
export interface DataQualityReport {
  summary: { live_count:number; oldest_live_date?:string; newest_live_date?:string; outside_window:number; missing_provenance:number; missing_required:number };
  quarantine: { quarantined_count:number; outside_window:number; missing_provenance:number };
  duplicateCount:number;
  issues:Array<{ id:string; title:string; published_date:string; source_url:string; status:string; records_detected:number; records_accepted:number; records_rejected:number; duplicates_skipped:number; missing_required:number; records_review:number; parser_version?:string; quality_status:string; quality_detail?:string; processed_at?:string }>;
  retentionRuns:Array<{ id:string; cutoff_date:string; quarantined_count:number; duplicate_count:number; created_at:string }>;
}

const API_BASE = '/api';
const apiFetch: typeof fetch = (input, init = {}) => fetch(input, { ...init, credentials: 'include' });

export async function fetchHealthCheck() {
  try {
    const res = await apiFetch(`${API_BASE}/health`);
    if (!res.ok) throw new Error('Health check failed');
    return await res.json();
  } catch (err) {
    console.warn('API backend health check offline:', err);
    return null;
  }
}

export async function fetchAdminSettings(): Promise<AdminSettings | null> {
  try {
    const res = await apiFetch(`${API_BASE}/admin/settings`);
    if (!res.ok) throw new Error('Failed to fetch admin settings');
    return await res.json();
  } catch (err) {
    console.error('Error loading admin settings:', err);
    return null;
  }
}

export async function updateAdminSettings(settings: Pick<AdminSettings, 'legalCompanyName' | 'tradingName' | 'notificationEmail'>): Promise<AdminSettings | null> {
  try {
    const res = await apiFetch(`${API_BASE}/admin/settings`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(settings) });
    if (!res.ok) throw new Error('Failed to save admin settings');
    return await res.json();
  } catch (err) {
    console.error('Error saving admin settings:', err);
    return null;
  }
}

export async function sendAdminTestEmail(to: string): Promise<{ success: boolean; error?: string; messageId?: string; provider?: string; attempts?: Array<{ provider: string; success: boolean; error?: string }> }> {
  try {
    const res = await apiFetch(`${API_BASE}/admin/settings/test-email`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ to }) });
    return await res.json();
  } catch (err) {
    console.error('Error sending admin test email:', err);
    return { success: false, error: 'The test email request failed.' };
  }
}
export async function fetchAdminIncidents(): Promise<OperationalIncident[] | null> { try { const res=await apiFetch(`${API_BASE}/admin/incidents?limit=100`); if(!res.ok)throw new Error('Failed to load incidents'); return await res.json(); } catch(err){ console.error(err); return null; } }
export async function resolveAdminIncident(id:string): Promise<boolean> { try { const res=await apiFetch(`${API_BASE}/admin/incidents/${encodeURIComponent(id)}/resolve`,{method:'PATCH'}); return res.ok; } catch(err){ console.error(err); return false; } }
export async function fetchAdminSubscriptions(): Promise<AdminSubscriptionUser[] | null> { try { const res=await apiFetch(`${API_BASE}/admin/subscriptions`); if(!res.ok)throw new Error('Failed to load subscriptions'); return await res.json(); } catch(err){ console.error(err); return null; } }
export async function updateAdminSubscription(id:string, status:string, expiresAt?:string): Promise<boolean> { try { const res=await apiFetch(`${API_BASE}/admin/subscriptions/${encodeURIComponent(id)}`,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({status,expiresAt:expiresAt||null})}); return res.ok; } catch(err){console.error(err);return false;} }
export async function fetchAdminAudit(): Promise<AuditEvent[] | null> { try { const res=await apiFetch(`${API_BASE}/admin/audit?limit=300`); if(!res.ok)throw new Error('Failed to load audit history'); return await res.json(); } catch(err){console.error(err);return null;} }
export async function fetchAdminDataQuality(): Promise<DataQualityReport | null> { try { const res=await apiFetch(`${API_BASE}/admin/data-quality`); if(!res.ok) throw new Error('Failed to load data quality'); return await res.json(); } catch(err){ console.error(err); return null; } }

export async function fetchEstates(): Promise<DeceasedEstate[] | null> {
  try {
    const res = await apiFetch(`${API_BASE}/estates`);
    if (!res.ok) throw new Error('Failed to fetch estates from DB');
    return await res.json();
  } catch (err) {
    console.warn('Falling back to local estates data:', err);
    return null;
  }
}

export async function fetchEstate(id: string): Promise<DeceasedEstate | null> {
  try {
    const res = await apiFetch(`${API_BASE}/estates/${encodeURIComponent(id)}`);
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    console.warn('Unable to load linked estate record:', err);
    return null;
  }
}

export async function fetchOriginalGazetteUrl(id: string): Promise<string> {
  const res = await apiFetch(`${API_BASE}/estates/${encodeURIComponent(id)}/source`);
  const result = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(result.error || 'Original Gazette PDF is unavailable');
  return result.url;
}

export async function createEstate(estate: DeceasedEstate): Promise<DeceasedEstate | null> {
  try {
    const res = await apiFetch(`${API_BASE}/estates`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(estate),
    });
    if (!res.ok) throw new Error('Failed to save estate');
    return await res.json();
  } catch (err) {
    console.error('Error saving estate to DB:', err);
    return null;
  }
}

export async function fetchAlerts(): Promise<AlertCriteria[] | null> {
  try {
    const res = await apiFetch(`${API_BASE}/alerts`);
    if (!res.ok) throw new Error('Failed to fetch alerts');
    return await res.json();
  } catch (err) {
    console.warn('Falling back to local alerts data:', err);
    return null;
  }
}

export async function createAlert(alert: AlertCriteria): Promise<AlertCriteria | null> {
  try {
    const res = await apiFetch(`${API_BASE}/alerts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(alert),
    });
    if (!res.ok) throw new Error('Failed to create alert');
    return await res.json();
  } catch (err) {
    console.error('Error saving alert to DB:', err);
    return null;
  }
}

export async function updateAlert(alert: AlertCriteria): Promise<AlertCriteria | null> {
  try {
    const res = await apiFetch(`${API_BASE}/alerts/${encodeURIComponent(alert.id)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(alert),
    });
    if (!res.ok) throw new Error('Failed to update alert');
    return await res.json();
  } catch (err) {
    console.error('Error updating alert:', err);
    return null;
  }
}

export async function toggleAlert(id: string): Promise<boolean> {
  try {
    const res = await apiFetch(`${API_BASE}/alerts/${id}/toggle`, { method: 'PATCH' });
    return res.ok;
  } catch (err) {
    console.error('Error toggling alert:', err);
    return false;
  }
}

export async function deleteAlert(id: string): Promise<boolean> {
  try {
    const res = await apiFetch(`${API_BASE}/alerts/${id}`, { method: 'DELETE' });
    return res.ok;
  } catch (err) {
    console.error('Error deleting alert:', err);
    return false;
  }
}

export async function fetchPipeline(): Promise<PipelineItem[] | null> {
  try {
    const res = await apiFetch(`${API_BASE}/pipeline`);
    if (!res.ok) throw new Error('Failed to fetch pipeline');
    return await res.json();
  } catch (err) {
    console.warn('Falling back to local pipeline data:', err);
    return null;
  }
}

export async function addPipelineItem(item: Partial<PipelineItem>): Promise<PipelineItem | null> {
  try {
    const res = await apiFetch(`${API_BASE}/pipeline`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(item),
    });
    if (!res.ok) throw new Error('Failed to add pipeline item');
    return await res.json();
  } catch (err) {
    console.error('Error adding pipeline item to DB:', err);
    return null;
  }
}

export async function updatePipelineStage(id: string, stage: string, notes?: string, valueEstimate?: number, followUpAt?: string | null) {
  try {
    const res = await apiFetch(`${API_BASE}/pipeline/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stage, notes, valueEstimate, followUpAt }),
    });
    return res.ok;
  } catch (err) {
    console.error('Error updating pipeline in DB:', err);
    return false;
  }
}

export async function removePipelineItem(id: string) {
  try {
    const res = await apiFetch(`${API_BASE}/pipeline/${id}`, { method: 'DELETE' });
    return res.ok;
  } catch (err) {
    console.error('Error removing pipeline item from DB:', err);
    return false;
  }
}

export async function fetchNotifications(): Promise<NotificationEvent[] | null> {
  try {
    const res = await apiFetch(`${API_BASE}/notifications`);
    if (!res.ok) throw new Error('Failed to fetch notifications');
    return await res.json();
  } catch (err) {
    console.warn('Falling back to local notifications data:', err);
    return null;
  }
}

export async function sendEmailNotification(recipientEmail: string, estate: DeceasedEstate, alertName?: string) {
  try {
    const res = await apiFetch(`${API_BASE}/notifications/send-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ recipientEmail, estate, alertName }),
    });
    return await res.json();
  } catch (err: any) {
    console.error('Error sending email via API:', err);
    return { success: false, error: err.message };
  }
}

export async function simulateMatchApi(estate: DeceasedEstate) {
  try {
    const res = await apiFetch(`${API_BASE}/simulate-match`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(estate),
    });
    if (!res.ok) throw new Error('Simulation endpoint returned error');
    return await res.json();
  } catch (err) {
    console.warn('Simulation API offline, using client fallback:', err);
    return null;
  }
}
