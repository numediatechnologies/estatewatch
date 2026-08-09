import { describe, expect, it } from 'vitest';
import { parseNotice } from './parser.js';

const fixture = `Notice to creditors in the estate of the late THABO MOKOENA
Estate No: 12345/2026/JHB ID Number: 7605181234088 Date of Death: 01/07/2026
Master of the High Court Johannesburg, Gauteng. Executor: JANE DOE Tel: 011 555 1234`;

describe('estate parser', () => {
  it('parses a known notice without inventing unavailable values', () => {
    const result = parseNotice(fixture, 'https://gazettes.africa/fixture.pdf', { publishedDate: '2026-08-01' });
    expect(result.warning).toBeUndefined();
    expect(result.estate).toMatchObject({
      estateNumber: '12345/2026/JHB',
      dateOfDeath: '2026-07-01',
      gazetteDate: '2026-08-01',
      province: 'Gauteng',
      valueBand: 'Unknown',
      district: 'Unknown',
      idNumberMasked: '760518****088',
    });
  });

  it('rejects incomplete content instead of fabricating a record', () => {
    expect(parseNotice('deceased estate with no reliable fields whatsoever', 'fixture').estate).toBeNull();
  });

  it('uses a deterministic identifier for repeat ingestion', () => {
    const first = parseNotice(fixture, 'https://gazettes.africa/fixture.pdf').estate;
    const second = parseNotice(fixture, 'https://gazettes.africa/fixture.pdf').estate;
    expect(first?.id).toBe(second?.id);
  });
});
