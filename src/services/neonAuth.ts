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

async function action(path: string, body: object) {
  const response = await fetch(`/api/auth/${path}`, { method: 'POST', credentials: 'include', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || 'Authentication request failed');
  return result as { success: true; message: string };
}

export const signInWithNeon = (email: string, password: string) => request('login', { email, password });
export const registerWithNeon = (name: string, email: string, password: string) => request('register', { name, email, password });
export const requestPasswordReset = (email: string) => action('forgot-password', { email });
export const resetPassword = (token: string, newPassword: string) => action('reset-password', { token, newPassword });
export async function restoreNeonSession() { try { return await request('session'); } catch { return null; } }
export async function signOutFromNeon() { await request('logout', {}); }
