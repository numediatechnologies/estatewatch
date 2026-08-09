import { afterEach, describe, expect, it } from 'vitest';
import { identityFingerprint, isValidSouthAfricanId, maskSouthAfricanId, scrubIdentityNumbers } from './identity.js';

describe('privacy-preserving South African identity matching', () => {
  afterEach(() => delete process.env.IDENTITY_MATCH_SECRET);

  it('validates the date and Luhn checksum', () => {
    expect(isValidSouthAfricanId('8001015009087')).toBe(true);
    expect(isValidSouthAfricanId('8001015009088')).toBe(false);
  });

  it('masks and fingerprints without retaining the raw number', () => {
    process.env.IDENTITY_MATCH_SECRET = 'test-only-secret';
    const fingerprint = identityFingerprint('8001015009087');
    expect(maskSouthAfricanId('8001015009087')).toBe('800101****087');
    expect(fingerprint).toMatch(/^[a-f0-9]{64}$/);
    expect(fingerprint).not.toContain('8001015009087');
  });

  it('scrubs identity numbers from source snippets', () => {
    expect(scrubIdentityNumbers('Person 8001015009087 record')).toBe('Person 800101****087 record');
  });
});
