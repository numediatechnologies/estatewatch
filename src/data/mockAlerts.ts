import { AlertCriteria } from '../types';

export const INITIAL_ALERTS: AlertCriteria[] = [
  {
    id: 'alt-1',
    name: 'Gauteng High-Value Estate Alert',
    provinces: ['Gauteng'],
    districts: ['Johannesburg', 'Pretoria', 'Sandton', 'Centurion'],
    valueBands: ['R1,000,000 - R5,000,000', 'R5,000,000 - R20,000,000', 'R20,000,000+'],
    assetTypes: ['property', 'business'],
    executorStatus: ['pending', 'executor_appointed'],
    channels: ['whatsapp', 'email', 'push'],
    isActive: true,
    matchCount: 14,
    lastTriggered: '2025-01-24 09:15',
    createdAt: '2025-01-01'
  },
  {
    id: 'alt-2',
    name: 'KZN Coastal Probate Properties',
    provinces: ['KwaZulu-Natal'],
    districts: ['Durban Central', 'Umhlanga', 'Ballito', 'Pinetown'],
    valueBands: ['R1,000,000 - R5,000,000', 'R5,000,000 - R20,000,000'],
    assetTypes: ['property'],
    executorStatus: ['executor_appointed', 'ld_account_lodged'],
    channels: ['whatsapp', 'sms'],
    isActive: true,
    matchCount: 8,
    lastTriggered: '2025-01-24 09:18',
    createdAt: '2025-01-05'
  },
  {
    id: 'alt-3',
    name: 'Western Cape & Free State Luxury / Agricultural Estates',
    provinces: ['Western Cape', 'Free State'],
    valueBands: ['R5,000,000 - R20,000,000', 'R20,000,000+'],
    assetTypes: ['property', 'shares', 'business'],
    channels: ['email', 'push'],
    isActive: true,
    matchCount: 6,
    lastTriggered: '2025-01-17 11:30',
    createdAt: '2025-01-10'
  }
];
