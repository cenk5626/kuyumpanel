/**
 * KuyumPanel Çok Para Birimli Kasa & Döviz / Kambiyo Sabitleri (Faz 3)
 * Sıfır Magic Number / String Kuralına Uygun
 */

export const CURRENCIES = {
  TL: 'TL',
  USD: 'USD',
  EUR: 'EUR',
  HAS: 'HAS',
} as const;

export type CurrencyType = (typeof CURRENCIES)[keyof typeof CURRENCIES];

export const FX_DISCREPANCY_STATUS = {
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  RESOLVED: 'RESOLVED',
} as const;

export type FxDiscrepancyStatus = (typeof FX_DISCREPANCY_STATUS)[keyof typeof FX_DISCREPANCY_STATUS];

// Alias for backwards compatibility / local usage
export const DISCREPANCY_STATUS = FX_DISCREPANCY_STATUS;
export type DiscrepancyStatus = FxDiscrepancyStatus;

export const DISCREPANCY_TYPE = {
  SURPLUS: 'SURPLUS',   // Kasa Fazlası (counted > system)
  DEFICIT: 'DEFICIT',   // Kasa Noksanı (counted < system)
  BALANCED: 'BALANCED', // Denk / Fark Yok
} as const;

export type DiscrepancyType = (typeof DISCREPANCY_TYPE)[keyof typeof DISCREPANCY_TYPE];

export const FX_DEFAULTS = {
  PREFIX: 'FX',
  PAD_LENGTH: 4,
  MIN_EXCHANGE_AMOUNT: 0.01,
  MAX_NOTES_LENGTH: 500,
} as const;

export const CURRENCY_SYMBOLS: Record<CurrencyType, string> = {
  [CURRENCIES.TL]: '₺',
  [CURRENCIES.USD]: '$',
  [CURRENCIES.EUR]: '€',
  [CURRENCIES.HAS]: 'gr Has',
};

export const CURRENCY_LABELS: Record<CurrencyType, string> = {
  [CURRENCIES.TL]: 'Türk Lirası (₺)',
  [CURRENCIES.USD]: 'Amerikan Doları ($)',
  [CURRENCIES.EUR]: 'Euro (€)',
  [CURRENCIES.HAS]: 'Has Altın (gr Has)',
};

export const FX_DISCREPANCY_STATUS_LABELS: Record<FxDiscrepancyStatus, { label: string; color: string; bg: string }> = {
  [FX_DISCREPANCY_STATUS.PENDING]: { label: 'İnceleme Bekliyor', color: 'text-amber-500', bg: 'bg-amber-500/10' },
  [FX_DISCREPANCY_STATUS.APPROVED]: { label: 'Onaylandı (Açıklama Kabul)', color: 'text-blue-500', bg: 'bg-blue-500/10' },
  [FX_DISCREPANCY_STATUS.REJECTED]: { label: 'Reddedildi', color: 'text-rose-500', bg: 'bg-rose-500/10' },
  [FX_DISCREPANCY_STATUS.RESOLVED]: { label: 'Mutabakat Tamamlandı', color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
};

export const DISCREPANCY_STATUS_LABELS = FX_DISCREPANCY_STATUS_LABELS;
