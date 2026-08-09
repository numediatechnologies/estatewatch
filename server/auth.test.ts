import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Request } from 'express';
const { queryMock } = vi.hoisted(() => ({ queryMock: vi.fn() }));
vi.mock('./db.js', () => ({ query: queryMock }));
import { authenticateWithNeon, createSessionToken, readSession, roleForEmail } from './auth.js';

describe('application authentication', () => {
  afterEach(() => { vi.unstubAllGlobals(); queryMock.mockReset(); });
  it('assigns admin only to the configured verified email', () => {
    process.env.ADMIN_EMAIL = 'support@marketdirecto.co.za';
    expect(roleForEmail('SUPPORT@marketdirecto.co.za')).toBe('admin');
    expect(roleForEmail('someone@marketdirecto.co.za')).toBe('user');
  });

  it('signs, verifies, and rejects tampered HttpOnly session values', () => {
    process.env.AUTH_SESSION_SECRET = 'test-session-secret-with-enough-entropy';
    const token = createSessionToken({ sub: 'neon-1', email: 'support@marketdirecto.co.za', name: 'Support', role: 'admin' });
    const request = { headers: { cookie: `estatewatch_session=${token}` } } as Request;
    expect(readSession(request)?.role).toBe('admin');
    const tampered = { headers: { cookie: `estatewatch_session=${token}x` } } as Request;
    expect(readSession(tampered)).toBeNull();
  });

  it('registers through Neon and persists the administrator role server-side', async () => {
    process.env.NEON_AUTH_BASE_URL = 'https://auth.example.test';
    process.env.APP_URL = 'https://estatewatch.marketdirect.co.za/';
    process.env.ADMIN_EMAIL = 'support@marketdirecto.co.za';
    const transportMock = vi.fn().mockResolvedValue({ status: 200, data: { user: { id: 'neon-admin', email: 'support@marketdirecto.co.za', name: 'Support' } } });
    queryMock.mockResolvedValue({ rowCount: 1 });
    const result = await authenticateWithNeon('sign-up', { name: 'Support', email: 'support@marketdirecto.co.za', password: 'valid-password' }, transportMock);
    expect(result.role).toBe('admin');
    expect(transportMock).toHaveBeenCalledWith('https://auth.example.test/sign-up/email', expect.any(Object), 'https://estatewatch.marketdirect.co.za');
    expect(queryMock).toHaveBeenCalledWith(expect.stringContaining('user_profiles'), expect.arrayContaining(['admin']));
  });
});
