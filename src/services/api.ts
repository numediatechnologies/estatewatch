import { DeceasedEstate, AlertCriteria, PipelineItem, NotificationEvent } from '../types';

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

export async function updatePipelineStage(id: string, stage: string, notes?: string, valueEstimate?: number) {
  try {
    const res = await apiFetch(`${API_BASE}/pipeline/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stage, notes, valueEstimate }),
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
