// Geçmiş kurlar ve milyem geçmişi modülü sabitleri
export const HISTORY_RATES_CONFIG = {
  SLOT_INTERVAL_MINUTES: 30,
  TIMEZONE: 'Europe/Istanbul',
  DEFAULT_PAGE_SIZE: 50,
  MAX_EXPORT_ROWS: 5000,
} as const;

export const SNAPSHOT_STATUS = {
  SUCCESS: 'SUCCESS',
  FAILED: 'FAILED',
  PARTIAL: 'PARTIAL',
} as const;

export type SnapshotStatus = (typeof SNAPSHOT_STATUS)[keyof typeof SNAPSHOT_STATUS];

export const SNAPSHOT_SOURCE = {
  ALTIS: 'ALTIS',
  HAREM: 'HAREM',
  MANUAL: 'MANUAL',
  SYSTEM: 'SYSTEM',
} as const;

export type SnapshotSource = (typeof SNAPSHOT_SOURCE)[keyof typeof SNAPSHOT_SOURCE];

export const TRACKED_RATE_PRODUCTS = [
  { code: 'HAS_ALTIN', label: 'Has Altın (Gr)', defaultCurrency: 'TL' },
  { code: 'USD', label: 'Amerikan Doları', defaultCurrency: 'TL' },
  { code: 'EUR', label: 'Euro', defaultCurrency: 'TL' },
  { code: 'CEYREK_YENI', label: 'Yeni Çeyrek Altın', defaultCurrency: 'TL' },
  { code: 'CEYREK_ESKI', label: 'Eski Çeyrek Altın', defaultCurrency: 'TL' },
  { code: 'YARIM_YENI', label: 'Yeni Yarım Altın', defaultCurrency: 'TL' },
  { code: 'TAM_YENI', label: 'Yeni Tam Altın', defaultCurrency: 'TL' },
  { code: 'ATA_YENI', label: 'Yeni Ata Lira', defaultCurrency: 'TL' },
  { code: 'GREMSE_YENI', label: 'Yeni Gremse Altın', defaultCurrency: 'TL' },
  { code: 'AYAR22_BILEZIK', label: '22 Ayar Bilezik (Gr)', defaultCurrency: 'TL' },
] as const;

export const STANDARD_MILYEM_DEFINITIONS = [
  { code: 'mil24Ayar', label: '24 Ayar Has Altın', defaultMilyem: 995.0, unit: 'milyem' },
  { code: 'mil22Ayar', label: '22 Ayar Bilezik', defaultMilyem: 916.0, unit: 'milyem' },
  { code: 'milAdanaBurma', label: '22 Ayar Adana Burma', defaultMilyem: 931.0, unit: 'milyem' },
  { code: 'milAjda', label: '22 Ayar Ajda Bilezik', defaultMilyem: 942.0, unit: 'milyem' },
  { code: 'mil18Ayar', label: '18 Ayar Takı', defaultMilyem: 750.0, unit: 'milyem' },
  { code: 'mil14Ayar', label: '14 Ayar Takı', defaultMilyem: 585.0, unit: 'milyem' },
  { code: 'mil8Ayar', label: '8 Ayar Takı', defaultMilyem: 333.0, unit: 'milyem' },
] as const;

export type MilyemStandardKey = (typeof STANDARD_MILYEM_DEFINITIONS)[number]['code'];
