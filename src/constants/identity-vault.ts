// Müşteri Kimlik Havuzu (TCKN Vault) Sabitleri

export const IDENTITY_PURPOSE = {
  FATURA_DUZENLEME: 'FATURA_DUZENLEME',
  MASAK_AML: 'MASAK_AML',
  YUKSEK_TUTARLI_ISLEM: 'YUKSEK_TUTARLI_ISLEM',
  EMANET_TESLIM: 'EMANET_TESLIM',
  GENEL: 'GENEL',
} as const;

export type IdentityPurpose = (typeof IDENTITY_PURPOSE)[keyof typeof IDENTITY_PURPOSE];

export const IDENTITY_PURPOSE_LABELS: Record<IdentityPurpose, string> = {
  FATURA_DUZENLEME: 'Fatura & e-Arşiv Düzenleme',
  MASAK_AML: 'MASAK Kimlik Tespiti & Mevzuat',
  YUKSEK_TUTARLI_ISLEM: 'Yüksek Tutarlı Nakit/Altın Satışı',
  EMANET_TESLIM: 'Emanet Teslim Alma & Verme',
  GENEL: 'Genel Müşteri Kaydı',
};

export const IDENTITY_STATUS = {
  ACTIVE: 'ACTIVE',
  EXPIRED: 'EXPIRED',
  DESTROYED: 'DESTROYED',
} as const;

export type IdentityStatus = (typeof IDENTITY_STATUS)[keyof typeof IDENTITY_STATUS];

export const IDENTITY_STATUS_LABELS: Record<IdentityStatus, string> = {
  ACTIVE: 'Aktif / Geçerli',
  EXPIRED: 'Süresi Dolmuş',
  DESTROYED: 'İmha Edilmiş / Silinmiş',
};

export const RETENTION_PERIOD_YEARS = {
  SHORT: 1,
  STANDARD: 5,
  MASAK_LEGAL: 10,
} as const;

export const TCKN_RULES = {
  LENGTH: 11,
} as const;
