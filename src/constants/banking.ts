/**
 * kuyumpanel - Banka, POS ve Açık Bankacılık Sabitleri
 */

export const BANK_ACCOUNT_TYPE = {
  VADESIZ_TL: 'VADESIZ_TL',
  VADESIZ_USD: 'VADESIZ_USD',
  VADESIZ_EUR: 'VADESIZ_EUR',
  ALTIN_HESABI: 'ALTIN_HESABI', // Gram Has Altın Depo Hesabı
} as const;

export type BankAccountType = (typeof BANK_ACCOUNT_TYPE)[keyof typeof BANK_ACCOUNT_TYPE];

export const BANK_INTEGRATION_TYPE = {
  MANUAL: 'MANUAL',
  OPEN_BANKING_API: 'OPEN_BANKING_API',
  STATEMENT_IMPORT: 'STATEMENT_IMPORT',
} as const;

export type BankIntegrationType = (typeof BANK_INTEGRATION_TYPE)[keyof typeof BANK_INTEGRATION_TYPE];

export const BANK_TX_DIRECTION = {
  INFLOW: 'INFLOW',   // Para Girişi (Alacak)
  OUTFLOW: 'OUTFLOW', // Para Çıkışı (Borç)
} as const;

export type BankTxDirection = (typeof BANK_TX_DIRECTION)[keyof typeof BANK_TX_DIRECTION];

export const BANK_TX_TYPE = {
  HAVALE_EFT: 'HAVALE_EFT',
  POS_SETTLEMENT: 'POS_SETTLEMENT',
  EXPENSE_FEE: 'EXPENSE_FEE',
  CASH_DEPOSIT: 'CASH_DEPOSIT',
  CASH_WITHDRAWAL: 'CASH_WITHDRAWAL',
} as const;

export type BankTxType = (typeof BANK_TX_TYPE)[keyof typeof BANK_TX_TYPE];

export const BANK_MATCH_STATUS = {
  UNMATCHED: 'UNMATCHED',
  MATCHED: 'MATCHED',
  SUGGESTED: 'SUGGESTED',
} as const;

export type BankMatchStatus = (typeof BANK_MATCH_STATUS)[keyof typeof BANK_MATCH_STATUS];

export const POS_SETTLEMENT_STATUS = {
  BLOCKED: 'BLOCKED',       // Valör süresinde bekliyor
  SETTLED: 'SETTLED',       // Hesaba geçti
  DISCREPANCY: 'DISCREPANCY', // Tutar veya komisyon uyuşmazlığı
} as const;

export type PosSettlementStatus = (typeof POS_SETTLEMENT_STATUS)[keyof typeof POS_SETTLEMENT_STATUS];

export const BANKING_DEFAULTS = {
  DEFAULT_COMMISSION_RATE: 1.90, // %1.90 standart POS komisyon oranı
  DEFAULT_BLOCKING_DAYS: 1,      // 1 gün standart bloke valörü
  MATCH_TOLERANCE_TL: 1.0,       // Kuruş farkı mutabakat toleransı
  MATCH_TIME_TOLERANCE_HOURS: 48,
} as const;

export const BANKING_MESSAGES = {
  ACCOUNT_CREATED: 'Banka hesabı başarıyla tanımlandı.',
  ACCOUNT_UPDATED: 'Banka hesabı güncellendi.',
  POS_CREATED: 'POS terminali başarıyla tanımlandı.',
  POS_UPDATED: 'POS terminali güncellendi.',
  SETTLEMENT_CALCULATED: 'POS takas ve komisyon net tutarı hesaplandı.',
  SETTLED_SUCCESS: 'POS takas tutarı vadesinde banka hesabına aktarıldı.',
  SYNC_COMPLETED: 'Açık bankacılık hesap hareketleri başarıyla senkronize edildi.',
  MATCH_SUCCESS: 'Banka hareketi satış/tahsilat kaydı ile eşleştirildi.',
  ERR_ACCOUNT_NOT_FOUND: 'Banka hesabı bulunamadı.',
  ERR_POS_NOT_FOUND: 'POS terminali bulunamadı.',
  ERR_INVALID_HMAC: 'Açık bankacılık webhook HMAC imza doğrulaması başarısız.',
} as const;
