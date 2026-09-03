/**
 * Yapay Zeka (AI Asistan) Sabitleri ve Eylem Tipleri
 * Sıfır Magic Number / String Kuralına Uygun Tanımlamalar
 */

export const AI_ACTION_TYPES = {
  // Alış & Satış İşlemleri
  CREATE_TRANSACTION: 'CREATE_TRANSACTION',
  POS_TRANSACTION: 'CREATE_TRANSACTION',

  // Toptancı Mutabakatı & Bakiye Düzeltme
  RECONCILE_SUPPLIER: 'RECONCILE_SUPPLIER',
  SETTLE_SUPPLIER_BALANCE: 'RECONCILE_SUPPLIER',

  // Gün Sonu & Kasa Kapatma (Z-Raporu)
  CLOSE_CASH_REGISTER: 'CLOSE_CASH_REGISTER',
  GENERATE_Z_REPORT: 'CLOSE_CASH_REGISTER',

  // Stok & Ürün İşlemleri
  UPDATE_STOCK_QUANTITY: 'UPDATE_STOCK_QUANTITY',
  UPDATE_STOCK: 'UPDATE_STOCK',
  CREATE_PRODUCT_ITEM: 'CREATE_PRODUCT_ITEM',
  ADD_PRODUCT_ITEM: 'ADD_PRODUCT_ITEM',
  UPDATE_PRODUCT_ITEM: 'UPDATE_PRODUCT_ITEM',
  UPDATE_STOCK_THRESHOLD: 'UPDATE_STOCK_THRESHOLD',

  // Fiyat Alarmları
  CREATE_PRICE_ALERT: 'CREATE_PRICE_ALERT',

  // Müşteri Borç / Tahsilat
  ADD_CUSTOMER_DEBT: 'ADD_CUSTOMER_DEBT',
  COLLECT_CUSTOMER_PAYMENT: 'COLLECT_CUSTOMER_PAYMENT',
  CREATE_CUSTOMER: 'CREATE_CUSTOMER',

  // Toptancı Borç / Ödeme
  ADD_SUPPLIER_DEBT: 'ADD_SUPPLIER_DEBT',
  PAY_SUPPLIER: 'PAY_SUPPLIER',

  // Kasa Hareketi
  ADD_CASH_MOVEMENT: 'ADD_CASH_MOVEMENT',
} as const;

export type AiActionType = (typeof AI_ACTION_TYPES)[keyof typeof AI_ACTION_TYPES];

export const AI_ACTION_STATUS = {
  PENDING: 'PENDING',
  EXECUTING: 'EXECUTING',
  SUCCESS: 'SUCCESS',
  CANCELLED: 'CANCELLED',
} as const;

export type AiActionStatus = (typeof AI_ACTION_STATUS)[keyof typeof AI_ACTION_STATUS];

export const AI_CONFIRMATION_KEYWORDS = {
  AFFIRMATIVE: [
    'onayla',
    'onaylıyorum',
    'onay',
    'evet',
    'tamam',
    'tamamdır',
    'yap',
    'uygula',
    'güncelle',
    'yükselt',
    'kaydet',
    'yes',
    'ok',
    'olur',
    'tabi',
    'tabii',
    'kapat',
    'sat',
    'al',
  ] as const,
  NEGATIVE: [
    'iptal',
    'iptal et',
    'vazgeç',
    'vazgeçtim',
    'hayır',
    'istemiyorum',
    'kalsın',
    'no',
  ] as const,
};

/**
 * Kullanıcı metninin onay (affirmative) ifadesi içerip içermediğini kontrol eder.
 * "evet sat", "tamamdır", "kasayı kapat", "onaylıyorum", "borcu yükselt" gibi doğal dil ifadelerini tanır.
 */
export function isAffirmativeConfirmation(text: string): boolean {
  if (!text) return false;
  const clean = text
    .toLocaleLowerCase('tr-TR')
    .replace(/[.,!?:;'"_]/g, ' ')
    .trim();
  const words = clean.split(/\s+/).filter(Boolean);
  if (words.length === 0) return false;

  // 1. Tam eşleşme (örn: "evet", "onayla", "tamamdır", "kapat")
  if ((AI_CONFIRMATION_KEYWORDS.AFFIRMATIVE as readonly string[]).includes(clean)) {
    return true;
  }

  // 2. İlk kelime onay ifadesi ise (örn: "evet sat", "tamam yap", "evet onayla", "onaylıyorum yap")
  const firstWord = words[0];
  if ((AI_CONFIRMATION_KEYWORDS.AFFIRMATIVE as readonly string[]).includes(firstWord)) {
    return true;
  }

  // 3. Kısa cümleler içinde (<= 3 kelime) anahtar onay kelimesi (örn: "kasayı kapat", "borcu yükselt", "işlemi onayla")
  if (words.length <= 3) {
    return words.some((w) => (AI_CONFIRMATION_KEYWORDS.AFFIRMATIVE as readonly string[]).includes(w));
  }

  return false;
}

/**
 * Kullanıcı metninin iptal (negative) ifadesi içerip içermediğini kontrol eder.
 */
export function isNegativeCancellation(text: string): boolean {
  if (!text) return false;
  const clean = text
    .toLocaleLowerCase('tr-TR')
    .replace(/[.,!?:;'"_]/g, ' ')
    .trim();
  const words = clean.split(/\s+/).filter(Boolean);
  if (words.length === 0) return false;

  if ((AI_CONFIRMATION_KEYWORDS.NEGATIVE as readonly string[]).includes(clean)) {
    return true;
  }

  const firstWord = words[0];
  if ((AI_CONFIRMATION_KEYWORDS.NEGATIVE as readonly string[]).includes(firstWord)) {
    return true;
  }

  return words.some((w) => (AI_CONFIRMATION_KEYWORDS.NEGATIVE as readonly string[]).includes(w));
}

export const AI_DEFAULTS = {
  PRODUCT_FALLBACK: 'ECEYREKTL',
  CURRENCY_TRY: 'TL',
  MIN_THRESHOLD: 5,
  PROFIT_MARGIN_DEFAULT: 15,
} as const;
