// Taksitli Satış & Senet Takip Sabitleri

export const INSTALLMENT_STATUS = {
  PENDING: 'PENDING',     // Vadesi bekliyor
  PAID: 'PAID',           // Ödendi
  OVERDUE: 'OVERDUE',     // Günü geçti (Gecikmede)
  CANCELLED: 'CANCELLED', // İptal edildi
} as const;

export type InstallmentStatus = (typeof INSTALLMENT_STATUS)[keyof typeof INSTALLMENT_STATUS];

export const INSTALLMENT_STATUS_LABELS: Record<InstallmentStatus, string> = {
  PENDING: 'Vadesi Bekliyor',
  PAID: 'Ödendi',
  OVERDUE: 'Gecikmede',
  CANCELLED: 'İptal Edildi',
};

export const INSTALLMENT_PERIODS = {
  MONTHLY_DAYS: 30,
  WEEKLY_DAYS: 7,
  BIWEEKLY_DAYS: 15,
} as const;

export const INSTALLMENT_LIMITS = {
  MIN_COUNT: 2,
  DEFAULT_COUNT: 6,
  MAX_COUNT: 24,
  MAX_AMOUNT_TL: 5000000,
} as const;

export const INSTALLMENT_DEFAULTS = {
  CURRENCY: 'TRY',
  SENET_PREFIX: 'SNT',
  CITY: 'İstanbul',
} as const;
