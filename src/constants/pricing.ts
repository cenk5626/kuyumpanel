// KuyumPanel Kurumsal ERP — Fiyatlandırma, Teklif & İskonto Yetki Sabitleri

export const QUOTE_STATUS = {
  DRAFT: 'DRAFT',                       // Taslak Teklif
  PENDING_APPROVAL: 'PENDING_APPROVAL', // İskonto Tavanı Aşıldı (Yönetici Onayı Bekliyor)
  APPROVED: 'APPROVED',                 // Onaylandı (Satışa dönüştürülebilir)
  CONVERTED: 'CONVERTED',               // Satışa Dönüştürüldü (Fatura/POS kesildi)
  EXPIRED: 'EXPIRED',                   // Süresi Doldu (Zaman aşımı)
  REJECTED: 'REJECTED',                 // Reddedildi / İptal
} as const;

export type QuoteStatus = (typeof QUOTE_STATUS)[keyof typeof QUOTE_STATUS];

export const QUOTE_STATUS_LABELS: Record<QuoteStatus, string> = {
  DRAFT: 'Taslak',
  PENDING_APPROVAL: 'Yönetici Onayı Bekliyor',
  APPROVED: 'Onaylandı (Geçerli)',
  CONVERTED: 'Satışa Dönüştürüldü',
  EXPIRED: 'Süresi Doldu / Geçersiz',
  REJECTED: 'Reddedildi / İptal',
};

export const DISCOUNT_LIMITS_BY_ROLE: Record<string, number> = {
  USER: 3.0,          // Satış Danışmanı / Personel: Max %3
  TABLET: 3.0,        // Vitrin Tableti: Max %3
  PC: 3.0,            // Kasa Bilgisayarı: Max %3
  ADMIN: 10.0,        // Mağaza Müdürü / Bayi Yöneticisi: Max %10
  SUPER_ADMIN: 100.0, // Patron / Sistem Yöneticisi: Sınırsız
};

export const QUOTE_VALIDITY_DURATIONS = {
  MINUTES_15: 15,
  MINUTES_30: 30,
  MINUTES_60: 60,
  HOURS_4: 240,
  END_OF_DAY: 1440,
} as const;

export const QUOTE_VALIDITY_OPTIONS = [
  { value: 15, label: '15 Dakika (Yüksek volatilite)' },
  { value: 30, label: '30 Dakika' },
  { value: 60, label: '1 Saat (Standart)' },
  { value: 240, label: '4 Saat' },
  { value: 1440, label: 'Gün Sonu (23:59)' },
] as const;

export const QUOTE_DEFAULTS = {
  PREFIX: 'TKL',
  DEFAULT_VALIDITY_MINUTES: 60,
  DEFAULT_TOLERANCE_PERCENT: 1.5, // Altın kuru %1.5'tan fazla yükselirse teklif otomatik geçersizleşir
} as const;
