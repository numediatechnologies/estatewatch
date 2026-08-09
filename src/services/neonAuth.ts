export const neonAuthConfigured = true;

async function request(path: string, body?: object) {
  const response = await fetch(`/api/auth/${path}`, {
    method: body ? 'POST' : 'GET', credentials: 'include',
    headers: body ? { 'content-type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || 'Authentication request failed');
  return result.user as { id: string; email: string; name: string; role: 'user' | 'admin' };
}

export const signInWithNeon = (email: string, password: string) => request('login', { email, password });
export const registerWithNeon = (name: string, email: string, password: string) => request('register', { name, email, password });
export async function restoreNeonSession() { try { return await request('session'); } catch { return null; } }
export async function signOutFromNeon() { await request('logout', {}); }
