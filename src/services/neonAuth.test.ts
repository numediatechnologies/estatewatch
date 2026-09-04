import { describe, expect, it } from 'vitest';
import { hasPasswordResetLink, passwordResetToken } from './neonAuth';

describe('password reset links', () => {
  it('opens reset mode for Neon token_hash query links', () => {
    const location = { search: '?reset-password=1&token_hash=provider-token', hash: '' };
    expect(passwordResetToken(location)).toBe('provider-token');
    expect(hasPasswordResetLink(location)).toBe(true);
  });

  it('accepts tokens delivered in the URL fragment', () => {
    const location = { search: '?type=recovery', hash: '#token=fragment-token' };
    expect(passwordResetToken(location)).toBe('fragment-token');
    expect(hasPasswordResetLink(location)).toBe(true);
  });

  it('does not treat an unrelated callback as a reset link', () => {
    expect(hasPasswordResetLink({ search: '?code=ordinary-callback', hash: '' })).toBe(false);
  });
});
