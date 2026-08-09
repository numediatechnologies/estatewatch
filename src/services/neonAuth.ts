const authUrl = (import.meta.env.VITE_NEON_AUTH_URL as string | undefined)?.replace(/\/$/, '');

export const neonAuthConfigured = Boolean(authUrl);

async function authRequest(path: string, init: RequestInit = {}) {
  if (!authUrl) throw new Error('Neon Auth is not configured for this deployment.');
  const response = await fetch(`${authUrl}/${path}`, {
    ...init,
    credentials: 'include',
    headers: { 'content-type': 'application/json', ...init.headers },
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.message || body.error || 'Authentication request failed');
  return body;
}

export async function signInWithNeon(email: string, password: string) {
  const result = await authRequest('sign-in/email', { method: 'POST', body: JSON.stringify({ email, password }) });
  const user = result.user;
  if (!user?.id || !user?.email) throw new Error('Sign-in did not create a valid session.');
  return user as { id: string; email: string; name?: string };
}

export async function restoreNeonSession() {
  if (!authUrl) return null;
  const result = await authRequest('get-session');
  return result.user || null;
}

export async function signOutFromNeon() {
  if (authUrl) await authRequest('sign-out', { method: 'POST', body: '{}' });
}
