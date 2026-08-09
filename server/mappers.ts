import { DbEstateRow, DeceasedEstate, AlertCriteria } from './types.js';

export function mapEstateRow(row: DbEstateRow): DeceasedEstate {
  return {
    id: row.id,
    sourceId: row.source_id,
    deceasedName: row.deceased_name,
    idNumberMasked: row.id_number_masked,
    dateOfDeath: row.date_of_death,
    gazetteDate: row.gazette_date,
    province: row.province,
    district: row.district,
    masterOffice: row.master_office,
    estateNumber: row.estate_number,
    executorName: row.executor_name,
    executorContact: row.executor_contact,
    executorEmail: row.executor_email,
    valueBand: row.value_band,
    assetTypes: row.asset_types || [],
    rawNoticeSnippet: row.raw_notice_snippet,
    gazetteRef: row.gazette_ref,
    status: row.status,
    hasProperty: row.has_property,
    propertyDetails: row.property_details || undefined,
  };
}

export function mapAlertRow(row: any): AlertCriteria {
  return {
    id: row.id,
    name: row.name,
    surnameMatch: row.surname_match || undefined,
    provinces: row.provinces || [],
    districts: row.districts || [],
    valueBands: row.value_bands || [],
    assetTypes: row.asset_types || [],
    executorStatus: row.executor_status || [],
    channels: row.channels || [],
    isActive: row.is_active,
    matchCount: row.match_count,
    lastTriggered: row.last_triggered || undefined,
    createdAt: row.created_at,
  };
}
