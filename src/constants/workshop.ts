// Hurda Sandığı, Takoz & Atölye Ramat Sabitleri

export const WORKSHOP_JOB_STATUS = {
  PENDING: 'PENDING',             // İş emri oluşturuldu, atölyeye teslim bekliyor
  IN_PRODUCTION: 'IN_PRODUCTION', // Atölyede üretimde / dökümde
  COMPLETED: 'COMPLETED',         // Mamul ve astar teslim alındı, ramat/fire kapatıldı
  CANCELLED: 'CANCELLED',         // İptal edildi
} as const;

export type WorkshopJobStatus = (typeof WORKSHOP_JOB_STATUS)[keyof typeof WORKSHOP_JOB_STATUS];

export const WORKSHOP_STATUS_LABELS: Record<WorkshopJobStatus, string> = {
  PENDING: 'Hazırlanıyor',
  IN_PRODUCTION: 'Atölyede (Üretimde)',
  COMPLETED: 'Tamamlandı / Kapatıldı',
  CANCELLED: 'İptal Edildi',
};

export const WORKSHOP_DEFAULTS = {
  JOB_PREFIX: 'ATL',
  DEFAULT_CARAT: 14,
} as const;

// Altın ayarları ve standart saflık milyem çarpanları
export const CARAT_MILYEM_MAP: Record<number, number> = {
  24: 0.995,
  22: 0.916,
  21: 0.875,
  18: 0.750,
  14: 0.585,
  8: 0.333,
};

/**
 * Verilen ayar (carat) için milyem çarpanını döner.
 * Harici/nadir ayarlar (örn: 9K, 10K, 19K) için matematiksel oran (carat/24) hesaplar.
 */
export function getMilyemForCarat(carat: number, customMilyem?: number): number {
  if (customMilyem !== undefined && customMilyem > 0) {
    return customMilyem;
  }
  if (CARAT_MILYEM_MAP[carat]) {
    return CARAT_MILYEM_MAP[carat];
  }
  if (carat > 0 && carat <= 24) {
    return Number((carat / 24).toFixed(3));
  }
  return 0.995;
}

export const SUPPORTED_SCRAP_CARATS = [8, 14, 18, 21, 22, 24] as const;

export const WORKSHOP_LIMITS = {
  DEFAULT_MAX_FIRE_PERCENT: 3.5, // %3.5 üstü fire uyarı tetikler
  CRITICAL_FIRE_PERCENT: 5.0,   // %5.0 üstü fire şüpheli sayılır
} as const;

// Atölye API işlem aksiyonları
export const WORKSHOP_ACTIONS = {
  CREATE_JOB: 'CREATE_JOB',
  COMPLETE_JOB: 'COMPLETE_JOB',
  UPDATE_SCRAP: 'UPDATE_SCRAP',
  CALCULATE_TAKOZ: 'CALCULATE_TAKOZ',
} as const;

export type WorkshopAction = (typeof WORKSHOP_ACTIONS)[keyof typeof WORKSHOP_ACTIONS];

// Cetasoft Emanet ve ParaPuan Sabitleri
export const CUSTOMER_DEPOSIT_ACTIONS = {
  DEPOSIT: 'DEPOSIT',
  WITHDRAW: 'WITHDRAW',
  LOYALTY_POINT: 'LOYALTY_POINT',
} as const;

export type CustomerDepositAction = (typeof CUSTOMER_DEPOSIT_ACTIONS)[keyof typeof CUSTOMER_DEPOSIT_ACTIONS];

export const CUSTOMER_DEPOSIT_STATUS = {
  ACTIVE: 'ACTIVE',       // Kasada emanet
  RETURNED: 'RETURNED',   // Müşteriye iade edildi
} as const;

export type CustomerDepositStatus = (typeof CUSTOMER_DEPOSIT_STATUS)[keyof typeof CUSTOMER_DEPOSIT_STATUS];

export const CUSTOMER_DEPOSIT_STATUS_LABELS: Record<CustomerDepositStatus, string> = {
  ACTIVE: 'Kasada Emanette',
  RETURNED: 'Teslim Edildi',
};

