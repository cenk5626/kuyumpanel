// 3065 sayılı KDV Kanunu 23/e Özel Matrah Şekli ve Fatura Sabitleri

export const INVOICE_TYPES = {
  OZEL_MATRAH: 'OZEL_MATRAH', // Külçe altın bedeli KDV'den istisna, sadece işçilik KDV'li
  STANDART: 'STANDART',       // Tamamı KDV'ye tabi standart fatura (işçilik, gümüş, saat vb.)
  IADE: 'IADE',               // İade faturası / Gider pusulası
} as const;

export type InvoiceType = (typeof INVOICE_TYPES)[keyof typeof INVOICE_TYPES];

export const INVOICE_TYPE_LABELS: Record<InvoiceType, string> = {
  OZEL_MATRAH: 'Özel Matrah (KDV 23/e)',
  STANDART: 'Standart Fatura',
  IADE: 'İade Faturası',
};

export const INVOICE_DOCUMENT_TYPES = {
  E_ARSIV: 'E_ARSIV',       // Bireysel müşterilere düzenlenen e-Arşiv Fatura
  E_FATURA: 'E_FATURA',     // Vergi mükelleflerine düzenlenen e-Fatura
  BILGI_FISI: 'BILGI_FISI', // Mali değeri olmayan mağaza bilgi fişi
} as const;

export type InvoiceDocumentType = (typeof INVOICE_DOCUMENT_TYPES)[keyof typeof INVOICE_DOCUMENT_TYPES];

export const INVOICE_DOCUMENT_LABELS: Record<InvoiceDocumentType, string> = {
  E_ARSIV: 'e-Arşiv Fatura',
  E_FATURA: 'e-Fatura',
  BILGI_FISI: 'Bilgi Fişi',
};

export const INVOICE_STATUS = {
  ISSUED: 'ISSUED',       // Kesildi / Onaylandı
  CANCELLED: 'CANCELLED', // İptal edildi
  DRAFT: 'DRAFT',         // Taslak
} as const;

export type InvoiceStatus = (typeof INVOICE_STATUS)[keyof typeof INVOICE_STATUS];

export const INVOICE_KDV_RATES = {
  LABOR_PERCENT: 20, // İşçilik KDV Oranı: %20
  EXEMPT_PERCENT: 0, // Külçe Altın İstisna Oranı: %0
} as const;

export const INVOICE_DEFAULTS = {
  TAX_OFFICE: 'Büyük Mükellefler Vergi Dairesi',
  CURRENCY: 'TRY',
  SERIES_PREFIX: 'KYM',
  NOTE_23E: '3065 sayılı KDV Kanununun 23/e maddesi gereğince, teslim edilen külçe altın bedeli KDV matrahına dahil edilmemiş olup yalnızca işçilik bedeli üzerinden KDV hesaplanmıştır.',
  FALLBACK_HAS_PRICE: 3200,
} as const;

