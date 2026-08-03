import { PipelineItem } from '../types';
import { INITIAL_ESTATES } from './mockEstates';

export const INITIAL_PIPELINE: PipelineItem[] = [
  {
    id: 'pip-1',
    estateId: 'est-101',
    estate: INITIAL_ESTATES[0], // Van Der Merwe
    stage: 'contacted',
    notes: 'Called Lombard & Partners on 25 Jan. Spoke with executor assistant regarding property valuation in Sandton.',
    valueEstimate: 45000, // Estimated mandate or referral value in ZAR
    updatedAt: '2025-01-25 14:20',
    priority: 'high',
    tags: ['Sandton', 'Commercial', 'Valuation Mandate']
  },
  {
    id: 'pip-2',
    estateId: 'est-102',
    estate: INITIAL_ESTATES[1], // Naidoo
    stage: 'pitched',
    notes: 'Submitted off-market cash purchase proposal for Umhlanga Arch unit. Awaiting heir review.',
    valueEstimate: 120000,
    updatedAt: '2025-01-26 10:05',
    priority: 'high',
    tags: ['Umhlanga', 'Off-Market Deal', 'Cash Offer']
  },
  {
    id: 'pip-3',
    estateId: 'est-104',
    estate: INITIAL_ESTATES[3], // Smith
    stage: 'new',
    notes: 'Gazetted notice found on 17 Jan. High net worth estate with Constantia wine farm portion. Researching executor contact.',
    valueEstimate: 250000,
    updatedAt: '2025-01-24 16:45',
    priority: 'medium',
    tags: ['Constantia', 'HNW Estate', 'Legal Pitch']
  }
];
