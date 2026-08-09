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

  it('maps Afrikaans Free State records and preserves absent spouse and claim values', () => {
    const record = `004977/2026—(2) ERASMUS, ANNA MARIA, 1950-02-03, 5002030067081, Kerkstraat 10, Bloemfontein, Vrystaat; (3) 2026-05-01, BLOEMFONTEIN; (4) -; (5) MARIUS ERASMUS, Posbus 1, Bloemfontein; (6) -.`;
    const result = parseJ193Record(record, { url: 'https://archive.example/55077.pdf', publishedDate: '2026-07-31', gazetteNumber: '55077', page: 77 });
    expect(result.estate).toMatchObject({ deceasedName: 'ERASMUS, ANNA MARIA', province: 'Free State', spouseDetails: undefined, claimPeriodDays: undefined, valueBand: 'Unknown', assetTypes: ['unknown'] });
  });

  it('masks malformed identity numbers as Unknown instead of publishing them', () => {
    const invalidId = hoosain.replace('4409280400085', '4409280400086');
    expect(parseJ193Record(invalidId, { url: 'x', publishedDate: '2026-07-31', gazetteNumber: '55077', page: 58 }).estate?.idNumberMasked).toBe('Unknown');
  });

  it('rejects impossible death dates and unmappable locations for review', () => {
    const impossibleDate = hoosain.replace('2023-05-21', '2023-19-44');
    expect(parseJ193Record(impossibleDate, { url: 'x', publishedDate: '2026-07-31', gazetteNumber: '55077', page: 58 }).estate).toBeNull();
    const unknownProvince = hoosain.replace('JOHANNESBURG', 'UNKNOWN OFFICE').replace('LENASIA EXT 1', 'UNKNOWN PLACE');
    expect(parseJ193Record(unknownProvince, { url: 'x', publishedDate: '2026-07-31', gazetteNumber: '55077', page: 58 }).estate).toBeNull();
  });
});
