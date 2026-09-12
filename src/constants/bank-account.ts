// İşletme Banka Hesapları / IBAN Yönetimi Sabitleri

export const BANK_ACCOUNT_CURRENCY = {
  TRY: 'TRY',
  USD: 'USD',
  EUR: 'EUR',
  XAU: 'XAU',
} as const;

export type BankAccountCurrency = (typeof BANK_ACCOUNT_CURRENCY)[keyof typeof BANK_ACCOUNT_CURRENCY];

export const TURKISH_BANKS = [
  { code: '0010', name: 'T.C. Ziraat Bankası', color: '#b91c1c' },
  { code: '0012', name: 'Türkiye Halk Bankası', color: '#0284c7' },
  { code: '0015', name: 'Türkiye Vakıflar Bankası', color: '#eab308' },
  { code: '0062', name: 'Türkiye Garanti Bankası (Garanti BBVA)', color: '#15803d' },
  { code: '0064', name: 'Türkiye İş Bankası', color: '#1d4ed8' },
  { code: '0067', name: 'Yapı ve Kredi Bankası', color: '#0369a1' },
  { code: '0046', name: 'Akbank', color: '#dc2626' },
  { code: '0111', name: 'QNB Finansbank', color: '#7e22ce' },
  { code: '0134', name: 'Denizbank', color: '#0284c7' },
  { code: '0205', name: 'Kuveyt Türk Katılım Bankası', color: '#047857' },
  { code: '0206', name: 'Türkiye Finans Katılım Bankası', color: '#059669' },
  { code: '0203', name: 'Albaraka Türk Katılım Bankası', color: '#b45309' },
  { code: '0210', name: 'Vakıf Katılım Bankası', color: '#ca8a04' },
  { code: '0209', name: 'Ziraat Katılım Bankası', color: '#991b1b' },
  { code: '9999', name: 'Diğer Banka / Katılım Bankası', color: '#6b7280' },
] as const;

export const IBAN_RULES = {
  COUNTRY_CODE: 'TR',
  LENGTH: 26,
} as const;
