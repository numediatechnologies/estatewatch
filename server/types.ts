import { z } from 'zod';

// ---------- API-facing types (camelCase, mirrors src/types.ts) ----------

export interface DeceasedEstate {
  id: string;
  sourceId: string;
  deceasedName: string;
  idNumberMasked: string;
  dateOfDeath: string;
  gazetteDate: string;
  province: string;
  district: string;
  masterOffice: string;
  estateNumber: string;
  executorName: string;
  executorContact: string;
  executorEmail: string;
  valueBand: string;
  assetTypes: string[];
  rawNoticeSnippet: string;
  gazetteRef: string;
  status: string;
  hasProperty: boolean;
  propertyDetails?: string;
  dateOfBirth?: string;
  lastAddress?: string;
  spouseDetails?: string;
  executorAddress?: string;
  claimPeriodDays?: number;
  gazetteNumber?: string;
  gazettePage?: number;
  sourceUrl?: string;
  parserVersion?: string;
  matchScore?: number;
  matchedAlertIds?: string[];
}

export interface AlertCriteria {
  id: string;
  name: string;
  surnameMatch?: string;
  provinces: string[];
  districts?: string[];
  valueBands: string[];
  assetTypes: string[];
  executorStatus?: string[];
  channels: string[];
  isActive: boolean;
  matchCount: number;
  lastTriggered?: string;
  createdAt: string;
  recipientEmail?: string;
  ownerName?: string;
}

export interface PipelineItem {
  id: string;
  estateId: string;
  estate: DeceasedEstate;
  stage: string;
  notes: string;
  valueEstimate: number;
  updatedAt: string;
  priority: string;
  tags: string[];
}

export interface NotificationEvent {
  id: string;
  alertId: string;
  alertName: string;
  estateId: string;
  deceasedName: string;
  estateNumber: string;
  channel: string;
  sentAt: string;
  status: string;
  recipient: string;
}

// ---------- Raw DB rows (snake_case) ----------

export interface DbEstateRow {
  id: string;
  source_id: string;
  deceased_name: string;
  id_number_masked: string;
  date_of_death: string;
  gazette_date: string;
  province: string;
  district: string;
  master_office: string;
  estate_number: string;
  executor_name: string;
  executor_contact: string;
  executor_email: string;
  value_band: string;
  asset_types: string[] | null;
  raw_notice_snippet: string;
  gazette_ref: string;
  status: string;
  has_property: boolean;
  property_details: string | null;
  created_at?: string;
}

// ---------- Known constants ----------

export const PROVINCES = [
  'Gauteng', 'Western Cape', 'KwaZulu-Natal', 'Eastern Cape', 'Free State',
  'Mpumalanga', 'Limpopo', 'North West', 'Northern Cape',
] as const;

export const VALUE_BANDS = [
  'Unknown',
  '< R250,000', 'R250,000 - R1,000,000', 'R1,000,000 - R5,000,000',
  'R5,000,000 - R20,000,000', 'R20,000,000+',
] as const;

export const ASSET_TYPES = ['unknown', 'property', 'business', 'vehicle', 'shares', 'bank_accounts', 'other'] as const;
export const EXECUTOR_STATUSES = ['pending', 'executor_appointed', 'ld_account_lodged'] as const;
export const CHANNELS = ['email', 'whatsapp', 'sms', 'push'] as const;
export const PIPELINE_STAGES = ['new', 'contacted', 'pitched', 'won', 'archived'] as const;

// ---------- Zod validation schemas ----------

const maskedIdSchema = z
  .string()
  .regex(/^(\d{6}\*{4}\d{1,4}|Unknown)$/, 'ID must be masked (e.g. 760518****088)');

export const estateSchema = z
  .object({
    id: z.string().min(1).optional(),
    sourceId: z.string().min(1),
    deceasedName: z.string().min(2).max(255),
    idNumberMasked: maskedIdSchema,
    dateOfDeath: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'dateOfDeath must be YYYY-MM-DD'),
    gazetteDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'gazetteDate must be YYYY-MM-DD'),
    province: z.enum(PROVINCES),
    district: z.string().max(100),
    masterOffice: z.string().max(255),
    estateNumber: z.string().min(3).max(100),
    executorName: z.string().max(255),
    executorContact: z.string().max(100),
    executorEmail: z.union([z.string().email().max(255), z.literal('')]),
    valueBand: z.enum(VALUE_BANDS),
    assetTypes: z.array(z.enum(ASSET_TYPES)).min(1),
    rawNoticeSnippet: z.string().max(5000),
    gazetteRef: z.string().max(255),
    status: z.enum(EXECUTOR_STATUSES),
    hasProperty: z.boolean(),
    propertyDetails: z.string().max(1000).nullable().optional(),
    matchScore: z.number().min(0).max(100).optional(),
    matchedAlertIds: z.array(z.string()).optional(),
  })
  .strict();

export const alertSchema = z
  .object({
    id: z.string().min(1).optional(),
    name: z.string().min(2).max(255),
    surnameMatch: z.string().max(255).optional(),
    provinces: z.array(z.enum(PROVINCES)).default([]),
    districts: z.array(z.string().max(100)).optional(),
    valueBands: z.array(z.enum(VALUE_BANDS)).default([]),
    assetTypes: z.array(z.enum(ASSET_TYPES)).default([]),
    executorStatus: z.array(z.enum(EXECUTOR_STATUSES)).optional(),
    channels: z.array(z.enum(CHANNELS)).min(1),
    isActive: z.boolean().optional(),
    matchCount: z.number().int().min(0).optional(),
    lastTriggered: z.string().max(50).nullable().optional(),
    createdAt: z.string().max(50).optional(),
    recipientEmail: z.string().email().optional(),
    ownerName: z.string().max(255).optional(),
  })
  .strict();

export const pipelineCreateSchema = z
  .object({
    id: z.string().min(1).optional(),
    estateId: z.string().min(1),
    stage: z.enum(PIPELINE_STAGES).default('new'),
    notes: z.string().max(5000).optional(),
    valueEstimate: z.number().min(0).optional(),
    priority: z.enum(['low', 'medium', 'high']).default('high'),
    tags: z.array(z.string().max(50)).optional(),
    updatedAt: z.string().max(50).optional(),
  })
  .strict();

export const pipelineUpdateSchema = z
  .object({
    stage: z.enum(PIPELINE_STAGES).optional(),
    notes: z.string().max(5000).optional(),
    valueEstimate: z.number().min(0).optional(),
    priority: z.enum(['low', 'medium', 'high']).optional(),
  })
  .strict()
  .refine((v) => Object.keys(v).length > 0, { message: 'At least one field to update is required' });

export const sendEmailSchema = z
  .object({
    recipientEmail: z.string().email(),
    estate: estateSchema,
    alertName: z.string().max(255).optional(),
  })
  .strict();

export type EstateInput = z.infer<typeof estateSchema>;
export type AlertInput = z.infer<typeof alertSchema>;
export type PipelineCreateInput = z.infer<typeof pipelineCreateSchema>;
export type PipelineUpdateInput = z.infer<typeof pipelineUpdateSchema>;
export type SendEmailInput = z.infer<typeof sendEmailSchema>;
