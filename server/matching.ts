import { AlertCriteria, DeceasedEstate } from './types.js';

export interface MatchResult {
  alertId: string;
  alertName: string;
  score: number;
  reasons: string[];
  recipientEmail?: string;
  recipientPhone?: string;
  channels: string[];
  ownerName?: string;
}

export const MIN_MATCH_SCORE = 20;

const VALUE_BAND_RANK: Record<string, number> = {
  'Unknown': -1,
  '< R250,000': 1,
  'R250,000 - R1,000,000': 2,
  'R1,000,000 - R5,000,000': 3,
  'R5,000,000 - R20,000,000': 4,
  'R20,000,000+': 5,
};

function bandRank(band: string): number {
  return VALUE_BAND_RANK[band] ?? -1;
}

function surnameTokens(name: string): string[] {
  return name
    .replace(/^(estate|boedel|late|wyle|of|the)\s+/gi, '')
    .replace(/[^a-zA-Z\s-]/g, ' ')
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean);
}

function surnameMatches(estate: DeceasedEstate, query: string): boolean {
  const q = query.toLowerCase().trim();
  if (!q) return false;
  const estateTokens = surnameTokens(estate.deceasedName);
  const queryTokens = surnameTokens(q);
  return queryTokens.some((qt) => estateTokens.some((et) => et.includes(qt) || qt.includes(et)));
}

function valueBandMatches(estateBand: string, alertBands: string[]): boolean {
  if (!alertBands.length) return true;
  const estateRank = bandRank(estateBand);
  if (estateRank < 0) return false;
  const minAlertRank = Math.min(...alertBands.map(bandRank));
  return estateRank >= minAlertRank;
}

export function matchEstateToAlerts(estate: DeceasedEstate, alerts: AlertCriteria[]): MatchResult[] {
  return alerts
    .filter((a) => a.isActive)
    .map((a) => {
      const reasons: string[] = [];
      let score = 0;

      if (a.surnameMatch) {
        if (!surnameMatches(estate, a.surnameMatch)) {
          return { alertId: a.id, alertName: a.name, score: 0, reasons, recipientEmail: a.recipientEmail, recipientPhone: a.recipientPhone, channels: a.channels, ownerName: a.ownerName };
        }
        reasons.push(`Surname "${a.surnameMatch}"`);
        score += 40;
      }

      if (a.provinces.length) {
        if (!a.provinces.includes(estate.province)) {
          return { alertId: a.id, alertName: a.name, score: 0, reasons, recipientEmail: a.recipientEmail, recipientPhone: a.recipientPhone, channels: a.channels, ownerName: a.ownerName };
        }
        reasons.push(`Province ${estate.province}`);
        score += 20;
      }

      if (a.districts && a.districts.length) {
        const districtHit = a.districts.some(
          (d) =>
            estate.district.toLowerCase().includes(d.toLowerCase()) ||
            d.toLowerCase().includes(estate.district.toLowerCase())
        );
        if (districtHit) {
          reasons.push(`District ${estate.district}`);
          score += 15;
        } else {
          return { alertId: a.id, alertName: a.name, score: 0, reasons, recipientEmail: a.recipientEmail, recipientPhone: a.recipientPhone, channels: a.channels, ownerName: a.ownerName };
        }
      }

      if (a.valueBands.length && !valueBandMatches(estate.valueBand, a.valueBands)) {
        return { alertId: a.id, alertName: a.name, score: 0, reasons, recipientEmail: a.recipientEmail, recipientPhone: a.recipientPhone, channels: a.channels, ownerName: a.ownerName };
      }
      if (a.valueBands.length) {
        reasons.push(`Value ${estate.valueBand}`);
        score += 10;
      }

      if (a.assetTypes.length) {
        const overlap = estate.assetTypes.filter((t) => a.assetTypes.includes(t));
        if (overlap.length) {
          reasons.push(`Assets ${overlap.join(', ')}`);
          score += 10;
        } else {
          return { alertId: a.id, alertName: a.name, score: 0, reasons, recipientEmail: a.recipientEmail, recipientPhone: a.recipientPhone, channels: a.channels, ownerName: a.ownerName };
        }
      }

      if (a.executorStatus && a.executorStatus.length) {
        if (a.executorStatus.includes(estate.status)) {
          reasons.push(`Status ${estate.status}`);
          score += 5;
        } else {
          return { alertId: a.id, alertName: a.name, score: 0, reasons, recipientEmail: a.recipientEmail, recipientPhone: a.recipientPhone, channels: a.channels, ownerName: a.ownerName };
        }
      }

      const matched = score >= MIN_MATCH_SCORE && reasons.length > 0;
      return { alertId: a.id, alertName: a.name, score: matched ? score : 0, reasons, recipientEmail: a.recipientEmail, recipientPhone: a.recipientPhone, channels: a.channels, ownerName: a.ownerName };
    })
    .filter((r) => r.score >= MIN_MATCH_SCORE);
}
