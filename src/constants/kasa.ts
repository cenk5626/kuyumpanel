/**
 * Kasa, Gün Sonu ve Z-Raporu Sabitleri ve Enumları
 * Zero Magic Numbers / Magic Strings Kuralına Uygun Tanımlamalar
 */

// Ödeme Yöntemleri
export const PAYMENT_METHODS = {
  CASH: 'CASH', // Nakit (TL / Döviz)
  CARD: 'CARD', // POS / Kredi Kartı
  BANK: 'BANK', // Havale / EFT / FAST
  HAS: 'HAS',   // Fiziki Has Altın ile Ödeme
  DEBT: 'DEBT', // Veresiye / Açık Hesap
} as const;

export type PaymentMethod = (typeof PAYMENT_METHODS)[keyof typeof PAYMENT_METHODS];

// Ödeme Yöntemi Türkçe Etiketleri
export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  [PAYMENT_METHODS.CASH]: 'Nakit',
  [PAYMENT_METHODS.CARD]: 'Kredi Kartı / POS',
  [PAYMENT_METHODS.BANK]: 'Banka Havalesi',
  [PAYMENT_METHODS.HAS]: 'Has Altın',
  [PAYMENT_METHODS.DEBT]: 'Açık Hesap (Veresiye)',
};

// Kasa Oturum Durumları
export const SESSION_STATUS = {
  OPEN: 'OPEN',     // Kasa Açık / Gün Devam Ediyor
  CLOSED: 'CLOSED', // Kasa Kapalı / Z-Raporu Alındı
} as const;

export type SessionStatus = (typeof SESSION_STATUS)[keyof typeof SESSION_STATUS];

// Kasa Hareket Tipleri (Sistem & Manuel)
export const CASH_MOVEMENT_TYPES = {
  POS_SALE: 'POS_SALE',                       // Perakende / POS Satışı (Giriş)
  CUSTOMER_COLLECTION: 'CUSTOMER_COLLECTION', // Müşteri Veresiye Tahsilatı (Giriş)
  SUPPLIER_PAYMENT: 'SUPPLIER_PAYMENT',       // Toptancıya Nakit / Altın Ödemesi (Çıkış)
  SCRAP_BUY: 'SCRAP_BUY',                     // Hurda / Eski Altın Alımı (Nakit Çıkışı / Altın Girişi)
  MANUAL_IN: 'MANUAL_IN',                     // Manuel Kasaya Giriş (Sermaye, Takviye)
  MANUAL_OUT: 'MANUAL_OUT',                   // Manuel Kasadan Çıkış (Masraf, Avans, Çekim)
  INFLOW: 'INFLOW',                           // Genel Giriş Yönü
  OUTFLOW: 'OUTFLOW',                         // Genel Çıkış Yönü
} as const;

export type CashMovementType = (typeof CASH_MOVEMENT_TYPES)[keyof typeof CASH_MOVEMENT_TYPES];

// Kasa Hareket Kategorileri
export const CASH_MOVEMENT_CATEGORIES = {
  SALES: 'SALES',             // Satış Geliri
  COLLECTION: 'COLLECTION',   // Alacak Tahsilatı
  SUPPLIER: 'SUPPLIER',       // Toptancı Ödemesi
  SCRAP: 'SCRAP',             // Hurda Alımı
  EXPENSE: 'EXPENSE',         // Günlük Mağaza Masrafı (Yemek, Fatura, Kırtasiye vb.)
  DRAWING: 'DRAWING',         // Ortak / Patron Şahsi Para Çekimi
  CAPITAL: 'CAPITAL',         // Kasa Takviyesi / Sermaye İlavesi
  CORRECTION: 'CORRECTION',   // Kasa Düzeltme / Yuvarlama Farkı
} as const;

export type CashMovementCategory = (typeof CASH_MOVEMENT_CATEGORIES)[keyof typeof CASH_MOVEMENT_CATEGORIES];

// Kasa Hareket Kategorileri Türkçe Etiketleri
export const CASH_MOVEMENT_CATEGORY_LABELS: Record<CashMovementCategory, string> = {
  [CASH_MOVEMENT_CATEGORIES.SALES]: 'Satış Hasılatı',
  [CASH_MOVEMENT_CATEGORIES.COLLECTION]: 'Cari Tahsilat',
  [CASH_MOVEMENT_CATEGORIES.SUPPLIER]: 'Toptancı Ödemesi',
  [CASH_MOVEMENT_CATEGORIES.SCRAP]: 'Hurda Alımı',
  [CASH_MOVEMENT_CATEGORIES.EXPENSE]: 'Mağaza Masrafı / Gider',
  [CASH_MOVEMENT_CATEGORIES.DRAWING]: 'Ortak Para Çekimi',
  [CASH_MOVEMENT_CATEGORIES.CAPITAL]: 'Kasa Devir / Sermaye Girişi',
  [CASH_MOVEMENT_CATEGORIES.CORRECTION]: 'Kasa Düzeltmesi',
};

// Desteklenen Para Birimleri
export const CASH_CURRENCIES = {
  TL: 'TL',
  USD: 'USD',
  EUR: 'EUR',
  HAS: 'HAS',
} as const;

export type CashCurrency = (typeof CASH_CURRENCIES)[keyof typeof CASH_CURRENCIES];

// Kasa Mutabakat / Fark Durumları
export const DISCREPANCY_STATUS = {
  BALANCED: 'BALANCED', // Kasa Tam / Dengeli
  SHORTAGE: 'SHORTAGE', // Kasa Eksiği (Açık)
  OVERAGE: 'OVERAGE',   // Kasa Fazlası
} as const;

export type DiscrepancyStatus = (typeof DISCREPANCY_STATUS)[keyof typeof DISCREPANCY_STATUS];

export const DISCREPANCY_STATUS_LABELS: Record<DiscrepancyStatus, string> = {
  [DISCREPANCY_STATUS.BALANCED]: 'Kasa Dengeli',
  [DISCREPANCY_STATUS.SHORTAGE]: 'Kasa Eksiği (Açık)',
  [DISCREPANCY_STATUS.OVERAGE]: 'Kasa Fazlası',
};
