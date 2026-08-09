export type UserRole = 
  | 'attorney' 
  | 'investor' 
  | 'tracer' 
  | 'funeral' 
  | 'debt_collector' 
  | 'financial_advisor';

export type Province = 
  | 'Gauteng' 
  | 'Western Cape' 
  | 'KwaZulu-Natal' 
  | 'Eastern Cape' 
  | 'Free State' 
  | 'Mpumalanga' 
  | 'Limpopo' 
  | 'North West' 
  | 'Northern Cape';

export type EstateValueBand = 
  | 'Unknown'
  | '< R250,000' 
  | 'R250,000 - R1,000,000' 
  | 'R1,000,000 - R5,000,000' 
  | 'R5,000,000 - R20,000,000' 
  | 'R20,000,000+';

export type AssetType = 
  | 'unknown'
  | 'property' 
  | 'business' 
  | 'vehicle' 
  | 'shares' 
  | 'bank_accounts' 
  | 'other';

export type ExecutorStatus = 
  | 'pending' 
  | 'executor_appointed' 
  | 'ld_account_lodged';

export type NotificationChannel = 
  | 'email' 
  | 'whatsapp' 
  | 'sms' 
  | 'push';

export interface AlertCriteria {
  id: string;
  name: string;
  surnameMatch?: string;
  idNumberMatch?: string;
  idNumberMatchMasked?: string;
  provinces: Province[];
  districts?: string[];
  valueBands: EstateValueBand[];
  assetTypes: AssetType[];
  executorStatus?: ExecutorStatus[];
  channels: NotificationChannel[];
  isActive: boolean;
  matchCount: number;
  lastTriggered?: string;
  createdAt: string;
  recipientEmail?: string;
  recipientPhone?: string;
  ownerName?: string;
}

export interface DeceasedEstate {
  id: string;
  sourceId: string;
  deceasedName: string;
  idNumberMasked: string; // POPIA compliant
  dateOfDeath: string;
  gazetteDate: string;
  province: Province;
  district: string;
  masterOffice: string;
  estateNumber: string; // e.g. 01482/2025/JHB
  executorName: string;
  executorContact: string;
  executorEmail: string;
  valueBand: EstateValueBand;
  assetTypes: AssetType[];
  rawNoticeSnippet: string;
  gazetteRef: string; // e.g. Govt Gazette Vol 712 No 50281
  status: ExecutorStatus;
  hasProperty: boolean;
  propertyDetails?: string;
  matchScore?: number;
  matchedAlertIds?: string[];
}

export type PipelineStage = 
  | 'new' 
  | 'contacted' 
  | 'pitched' 
  | 'won' 
  | 'archived';

export interface PipelineItem {
  id: string;
  estateId: string;
  estate: DeceasedEstate;
  stage: PipelineStage;
  notes: string;
  valueEstimate?: number; // Estimated commission or lead value in ZAR (R)
  updatedAt: string;
  priority: 'low' | 'medium' | 'high';
  tags: string[];
}

export interface IngestionLog {
  id: string;
  timestamp: string;
  gazetteIssue: string;
  totalNoticesParsed: number;
  matchedAlertsCount: number;
  ocrConfidence: number; // percentage
  status: 'completed' | 'processing' | 'flagged';
}

export interface GazetteIngestionSchedule {
  enabled: boolean;
  frequencyPerDay: number;
  intervalHours: number;
  lastRunAt: string;
  nextRunAt: string;
  recommendedCadence: string;
}

export interface NotificationEvent {
  id: string;
  alertId: string;
  alertName: string;
  estateId: string;
  deceasedName: string;
  estateNumber: string;
  channel: NotificationChannel;
  sentAt: string;
  status: 'delivered' | 'pending' | 'failed';
  recipient: string;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  phone: string;
  companyName: string;
  role: UserRole;
  planTier: 'free' | 'pro' | 'agency' | 'pay_per_lead';
  leadsRemaining?: number;
}

export type SystemRole = 'admin' | 'user';

export interface UserAccount {
  id: string;
  email: string;
  name: string;
  role: SystemRole;
  userPersona: UserRole;
  avatarUrl?: string;
}

export interface ScraperPipelineResult {
  sourceUrl?: string;
  rawText: string;
  extractionMethod: 'direct' | 'ocr' | 'ai_fallback';
  ocrConfidence: number;
  aiEnriched: boolean;
  extractedEstate: DeceasedEstate;
  pipelineLogs: string[];
}
