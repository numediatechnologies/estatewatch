import { describe, expect, it } from 'vitest';
import { parseJ193Record, splitJ193Records } from './j193.js';

const hoosain = `018808/2023—(2) HOOSAIN, ROKEYA, 1944-09-28, 4409280400085, 55 WOODPECKER STREET, LENASIA EXT 1; (3) 2023-05-21, JOHANNESBURG; (4) N/A N/A, -, -; (5) HAWA BIBI MOYA, 30 HOLT STREET, GLENADRIENNE, PARKMORE; (6) 30 DAYS.`;

describe('J193 parser', () => {
  it('splits numbered records and preserves page', () => {
    const records = splitJ193Records(`[[PAGE:58]]\n${hoosain}\n4977/2026—(2) ERASMUS, ANNA; (3) 2026-05-01, PRETORIA; (4) -; (5) MARIUS, PRETORIA; (6) -.`);
    expect(records).toHaveLength(2);
    expect(records[0].page).toBe(58);
  });

  it('parses and masks the genuine HOOSAIN record', () => {
    const result = parseJ193Record(hoosain, { url: 'https://archive.example/55077.pdf', publishedDate: '2026-07-31', gazetteNumber: '55077 part 1', page: 58 });
    expect(result.estate).toMatchObject({ estateNumber: '018808/2023', deceasedName: 'HOOSAIN, ROKEYA', idNumberMasked: '440928****085', dateOfDeath: '2023-05-21', province: 'Gauteng', executorName: 'HAWA BIBI MOYA', claimPeriodDays: 30, gazettePage: 58, valueBand: 'Unknown' });
  });

  it('rejects malformed records', () => {
    expect(parseJ193Record('not a record', { url: 'x', publishedDate: '2026-07-31', gazetteNumber: 'x', page: 1 }).estate).toBeNull();
  });
});
