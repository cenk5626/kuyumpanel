// KuyumPanel Kurumsal ERP — Resmî Gider Pusulası & e-Belge Sabitleri

export const EXPENSE_VOUCHER_STATUS = {
  DRAFT: 'DRAFT',         // Taslak — Kasa ve hurda stoğunu etkilemez
  APPROVED: 'APPROVED',   // Onaylandı / Kesildi — Hurda stoğu ve kasa hareketini işler
  CANCELLED: 'CANCELLED', // İptal Edildi — Ters kayıtla stok ve kasayı dengeler
} as const;

export type ExpenseVoucherStatus = (typeof EXPENSE_VOUCHER_STATUS)[keyof typeof EXPENSE_VOUCHER_STATUS];

export const EXPENSE_VOUCHER_STATUS_LABELS: Record<ExpenseVoucherStatus, string> = {
  DRAFT: 'Taslak',
  APPROVED: 'Onaylandı / Düzenlendi',
  CANCELLED: 'İptal Edildi',
};

export const EXPENSE_VOUCHER_SIGNATURE_STATUS = {
  PENDING: 'PENDING',               // İmza Bekliyor
  SIGNED_MANUAL: 'SIGNED_MANUAL',   // Islak İmzalı (Fiziki Matbu)
  SIGNED_DIGITAL: 'SIGNED_DIGITAL', // Dijital / SMS / Tablet İmzalı
} as const;

export type ExpenseVoucherSignatureStatus =
  (typeof EXPENSE_VOUCHER_SIGNATURE_STATUS)[keyof typeof EXPENSE_VOUCHER_SIGNATURE_STATUS];

export const EXPENSE_VOUCHER_SIGNATURE_LABELS: Record<ExpenseVoucherSignatureStatus, string> = {
  PENDING: 'İmza Bekliyor',
  SIGNED_MANUAL: 'Islak İmzalı (Fiziki Kaşe/İmza)',
  SIGNED_DIGITAL: 'Elektronik Onaylı',
};

export const EXPENSE_VOUCHER_PAYMENT_METHODS = {
  NAKIT: 'NAKIT',
  BANKA_HAVALE: 'BANKA_HAVALE',
  HAS_TAKAS: 'HAS_TAKAS',
} as const;

export type ExpenseVoucherPaymentMethod =
  (typeof EXPENSE_VOUCHER_PAYMENT_METHODS)[keyof typeof EXPENSE_VOUCHER_PAYMENT_METHODS];

export const EXPENSE_VOUCHER_PAYMENT_METHOD_LABELS: Record<ExpenseVoucherPaymentMethod, string> = {
  NAKIT: 'Nakit Kasa Çıkışı',
  BANKA_HAVALE: 'Banka Transferi (Havale/EFT)',
  HAS_TAKAS: 'Has / Mamul Altın Takası',
};

export const CARAT_PURITY: Record<number, number> = {
  24: 995,
  22: 916,
  21: 875,
  18: 750,
  14: 585,
  8: 333,
};

export const EXPENSE_VOUCHER_WITHHOLDING_RATES = {
  EXEMPT: 0,        // %0 — Bireysel nihai tüketiciden hurda altın/kıymetli maden alımı (GVK 9/10)
  WITHHOLDING_2: 2, // %2 — Hurda metal/ticari tevkifat
  SERVICES_10: 10,  // %10 — Hizmet/İşçilik alımı
} as const;

export const E_DOCUMENT_PROVIDERS = {
  GIB_PORTAL: 'GIB_PORTAL',
  MOCK_SANDBOX: 'MOCK_SANDBOX',
  ENTEGRATOR: 'ENTEGRATOR',
} as const;

export type EDocumentProvider = (typeof E_DOCUMENT_PROVIDERS)[keyof typeof E_DOCUMENT_PROVIDERS];

export const E_DOCUMENT_ENVIRONMENTS = {
  TEST: 'TEST',
  PRODUCTION: 'PRODUCTION',
} as const;

export type EDocumentEnvironment = (typeof E_DOCUMENT_ENVIRONMENTS)[keyof typeof E_DOCUMENT_ENVIRONMENTS];

export const E_DOCUMENT_SUBMISSION_STATUS = {
  DRAFT: 'DRAFT',
  READY: 'READY',
  SUBMITTING: 'SUBMITTING',
  SENT: 'SENT',
  ACCEPTED: 'ACCEPTED',
  REJECTED: 'REJECTED',
  CANCELLED: 'CANCELLED',
  ERROR: 'ERROR',
} as const;

export type EDocumentSubmissionStatus =
  (typeof E_DOCUMENT_SUBMISSION_STATUS)[keyof typeof E_DOCUMENT_SUBMISSION_STATUS];

export const E_DOCUMENT_STATUS_LABELS: Record<EDocumentSubmissionStatus, string> = {
  DRAFT: 'Taslak',
  READY: 'Gönderime Hazır',
  SUBMITTING: 'GİB Kuyruğunda...',
  SENT: 'Entegratöre İletildi',
  ACCEPTED: 'GİB Onayladı (Resmîleşti)',
  REJECTED: 'GİB Reddetti',
  CANCELLED: 'İptal Edildi',
  ERROR: 'Entegrasyon Hatası',
};

export const EXPENSE_VOUCHER_DEFAULTS = {
  PREFIX: 'GP',
  DOCUMENT_TITLE: 'GİDER PUSULASI (Vergi Usul Kanunu Md. 234)',
  LEGAL_NOTICE:
    '213 Sayılı Vergi Usul Kanunu’nun 234. maddesi uyarınca, vergiden muaf esnaf veya nihai tüketiciden satın alınan kıymetli maden ve hurda altın karşılığında tanzim edilmiştir.',
  CURRENCY: 'TRY',
  DEFAULT_WITHHOLDING: EXPENSE_VOUCHER_WITHHOLDING_RATES.EXEMPT,
} as const;
