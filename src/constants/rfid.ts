/**
 * kuyumpanel - RFID UHF Stocktaking & Showcase Audit Constants
 * Strict zero magic number / magic string compliance.
 */

export const RFID_TAG_STATUS = {
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
  LOST: 'LOST',
  DECOMMISSIONED: 'DECOMMISSIONED',
} as const;

export type RfidTagStatus = (typeof RFID_TAG_STATUS)[keyof typeof RFID_TAG_STATUS];

export const RFID_TAG_STATUS_LABELS: Record<RfidTagStatus, string> = {
  [RFID_TAG_STATUS.ACTIVE]: 'Aktif',
  [RFID_TAG_STATUS.INACTIVE]: 'Pasif',
  [RFID_TAG_STATUS.LOST]: 'Kayıp / Eksik',
  [RFID_TAG_STATUS.DECOMMISSIONED]: 'İptal / Hurda',
};

export const RFID_MATCH_STATUS = {
  MATCHED: 'MATCHED',
  MISSING: 'MISSING',
  SURPLUS: 'SURPLUS',
} as const;

export type RfidMatchStatus = (typeof RFID_MATCH_STATUS)[keyof typeof RFID_MATCH_STATUS];

export const RFID_MATCH_STATUS_LABELS: Record<RfidMatchStatus, string> = {
  [RFID_MATCH_STATUS.MATCHED]: 'Eşleşti (Mevcut)',
  [RFID_MATCH_STATUS.MISSING]: 'Eksik (Bulunamadı)',
  [RFID_MATCH_STATUS.SURPLUS]: 'Fazla (Beklenmeyen)',
};

export const RFID_SESSION_STATUS = {
  ACTIVE: 'ACTIVE',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
} as const;

export type RfidSessionStatus = (typeof RFID_SESSION_STATUS)[keyof typeof RFID_SESSION_STATUS];

export const RFID_SESSION_STATUS_LABELS: Record<RfidSessionStatus, string> = {
  [RFID_SESSION_STATUS.ACTIVE]: 'Sayım Sürüyor',
  [RFID_SESSION_STATUS.COMPLETED]: 'Tamamlandı',
  [RFID_SESSION_STATUS.CANCELLED]: 'İptal Edildi',
};

export const RFID_LOCATIONS = [
  'TÜMÜ',
  'VİTRİN_1',
  'VİTRİN_2',
  'TABLA_A',
  'TABLA_B',
  'TABLA_C',
  'ÇELİK_KASA',
  'DEPO',
] as const;

export type RfidLocation = (typeof RFID_LOCATIONS)[number];

export const RFID_DEFAULTS = {
  DEFAULT_LOCATION: 'TÜMÜ',
  SESSION_PREFIX: 'RFID',
  MIN_RSSI_DBM: -85,
  MAX_RSSI_DBM: -30,
  SIMULATION_BATCH_INTERVAL_MS: 300,
  DEFAULT_TAG_LENGTH_HEX: 24, // 96-bit EPC = 24 hex characters
} as const;

export const RFID_ERRORS = {
  SESSION_NOT_FOUND: 'RFID sayım oturumu bulunamadı.',
  SESSION_ALREADY_COMPLETED: 'Bu sayım oturumu daha önce tamamlanmıştır veya iptal edilmiştir.',
  TAG_ALREADY_EXISTS: 'Bu EPC koduna sahip RFID etiketi zaten sisteme kayıtlı.',
  INVALID_EPC: 'Geçersiz EPC formatı. 24 karakterli hex formatında olmalıdır.',
  BARCODE_NOT_FOUND: 'Belirtilen barkoda sahip ürün stokta bulunamadı.',
} as const;
