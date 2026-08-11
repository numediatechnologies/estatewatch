export const neonAuthConfigured = true;

async function request(path: string, body?: object) {
  const response = await fetch(`/api/auth/${path}`, {
    method: body ? 'POST' : 'GET', credentials: 'include',
    headers: body ? { 'content-type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || 'Authentication request failed');
  return result.user as { id: string; email: string; name: string; role: 'user' | 'admin'; subscriptionActive?: boolean; companyName?: string; phoneMasked?: string; phoneVerified?: boolean; subscriptionStatus?: string; subscriptionExpiresAt?: string | null };
}

async function action<T extends { success: true; message: string } = { success: true; message: string }>(path: string, body: object): Promise<T> {
  const response = await fetch(`/api/auth/${path}`, { method: 'POST', credentials: 'include', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || 'Authentication request failed');
  return result as T;
}

export const signInWithNeon = (email: string, password: string) => request('login', { email, password });
export const registerWithEmail = (firstName: string, surname: string, companyName: string, email: string, password: string, phone?: string) => action('register', { firstName, surname, companyName, email, password, phone, verificationMethod: 'email' });
export const startSmsRegistration = (email: string, phone: string) => action<{ success: true; message: string; challengeId: string; phoneMasked: string }>('register/sms/start', { email, phone });
export const verifySmsRegistration = (challengeId: string, code: string, firstName: string, surname: string, email: string, password: string) => request('register/sms/verify', { challengeId, code, firstName, surname, email, password });
export const requestPasswordReset = (email: string) => action('forgot-password', { email });
export const resetPassword = (token: string, newPassword: string) => action('reset-password', { token, newPassword });
export async function restoreNeonSession() { try { return await request('session'); } catch { return null; } }
export async function signOutFromNeon() { await request('logout', {}); }
