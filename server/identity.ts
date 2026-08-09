import { createHmac } from 'node:crypto';

export function isValidSouthAfricanId(value?: string): value is string {
  if (!value || !/^\d{13}$/.test(value)) return false;
  const birthDate = `${Number(value.slice(0, 2)) >= 30 ? '19' : '20'}${value.slice(0, 2)}-${value.slice(2, 4)}-${value.slice(4, 6)}`;
  const date = new Date(`${birthDate}T00:00:00Z`);
  if (Number.isNaN(date.valueOf()) || date.toISOString().slice(0, 10) !== birthDate) return false;
  const digits = [...value].map(Number);
  let sum = 0;
  for (let index = 0; index < 12; index += 1) sum += index % 2 === 0 ? digits[index] : Math.floor(digits[index] * 2 / 10) + (digits[index] * 2 % 10);
  return (10 - (sum % 10)) % 10 === digits[12];
}

export function maskSouthAfricanId(value?: string) {
  return isValidSouthAfricanId(value) ? `${value.slice(0, 6)}****${value.slice(-3)}` : 'Unknown';
}

export function identityFingerprint(value: string) {
  if (!isValidSouthAfricanId(value)) throw new Error('A valid South African ID number is required');
  const secret = process.env.IDENTITY_MATCH_SECRET;
  if (!secret) throw new Error('IDENTITY_MATCH_SECRET is required for identity matching');
  return createHmac('sha256', secret).update(value).digest('hex');
}

export function scrubIdentityNumbers(value: string) {
  return value.replace(/\b\d{13}\b/g, (candidate) => maskSouthAfricanId(candidate));
}
