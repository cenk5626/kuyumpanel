/**
 * kuyumpanel - MASAK & AML Uyum ve Risk Yönetimi Sabitleri
 * 5549 Sayılı Suç Gelirlerinin Aklanmasının Önlenmesi Kanunu
 */

export const AML_RISK_LEVEL = {
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
  CRITICAL: 'CRITICAL',
} as const;

export type AmlRiskLevel = (typeof AML_RISK_LEVEL)[keyof typeof AML_RISK_LEVEL];

export const COMPLIANCE_CASE_STATUS = {
  OPEN: 'OPEN',
  UNDER_REVIEW: 'UNDER_REVIEW',
  REPORTED_TO_MASAK: 'REPORTED_TO_MASAK',
  DISMISSED: 'DISMISSED',
} as const;

export type ComplianceCaseStatus = (typeof COMPLIANCE_CASE_STATUS)[keyof typeof COMPLIANCE_CASE_STATUS];

export const AML_TRIGGER_TYPE = {
  KYC_THRESHOLD_EXCEEDED: 'KYC_THRESHOLD_EXCEEDED', // Tek seferlik 185.000 TL üzeri nakit kimliksiz işlem
  SMURFING_DETECTED: 'SMURFING_DETECTED',           // 24 saat içinde eşik altı bölünmüş nakit işlemler
  PEP_TRANSACTION: 'PEP_TRANSACTION',               // Siyasi Nüfuz Sahibi Kişi yüksek tutarlı işlem
  MANUAL_SUSPICION: 'MANUAL_SUSPICION',             // Personel / Uyum Görevlisi şüpheli işlem bildirimi
} as const;

export type AmlTriggerType = (typeof AML_TRIGGER_TYPE)[keyof typeof AML_TRIGGER_TYPE];

export const AML_RULE_CODE = {
  KYC_SINGLE_TX: 'KYC_SINGLE_TX',
  DAILY_STRUCTURING: 'DAILY_STRUCTURING',
  PEP_HIGH_VALUE: 'PEP_HIGH_VALUE',
  HIGH_RISK_MANUAL: 'HIGH_RISK_MANUAL',
} as const;

export type AmlRuleCode = (typeof AML_RULE_CODE)[keyof typeof AML_RULE_CODE];

export const ID_DOCUMENT_TYPE = {
  TCKN: 'TCKN',
  PASSPORT: 'PASSPORT',
  BLUE_CARD: 'BLUE_CARD',
  TAX_NO: 'TAX_NO',
} as const;

export type IdDocumentType = (typeof ID_DOCUMENT_TYPE)[keyof typeof ID_DOCUMENT_TYPE];

export const MASAK_DEFAULTS = {
  /** Yasal Kimlik Tespit Eşiği (TL) - 5549 sayılı Kanun gereği 185.000 TL */
  KYC_CASH_THRESHOLD_TL: 185000,
  /** Parçalama (Structuring/Smurfing) takip penceresi (saat) */
  STRUCTURING_LOOKBACK_HOURS: 24,
  /** Parçalama tespiti için asgari işlem adedi */
  STRUCTURING_SPLIT_MIN_COUNT: 2,
  /** Siyasi Nüfuz Sahibi Kişi (PEP) denetimsiz azami nakit işlem eşiği (TL) */
  PEP_MAX_ALLOWABLE_UNAUDITED_TL: 50000,
  /** Risk Skor Aralıkları (0 - 100) */
  SCORE_THRESHOLD_LOW: 25,
  SCORE_THRESHOLD_MEDIUM: 60,
  SCORE_THRESHOLD_HIGH: 85,
  /** Varsayılan sayfalama */
  DEFAULT_PAGE_SIZE: 20,
} as const;

export const COMPLIANCE_MESSAGES = {
  KYC_REQUIRED: 'MASAK Mevzuatı gereğince 185.000 TL ve üzeri nakit işlemlerde TCKN / Pasaport kimlik tespiti zorunludur.',
  SMURFING_ALERT: 'Dikkat: Aynı müşteri tarafından 24 saat içinde kimlik eşiğini aşan bölünmüş nakit işlemler tespit edildi (Parçalama Şüphesi).',
  PEP_ALERT: 'Müşteri Siyasi Nüfuz Sahibi Kişi (PEP) olarak işaretlidir. Yüksek tutarlı işlem için ek yönetici teyidi gereklidir.',
  CASE_CREATED: 'Şüpheli işlem MASAK uyum havuzuna vaka olarak kaydedildi.',
  CASE_UPDATED: 'Uyum vakası durumu başarıyla güncellendi.',
  SAR_DRAFTED: 'MASAK Şüpheli İşlem Bildirimi (ŞİB) taslağı oluşturuldu.',
  REPORTED_SUCCESS: 'İşlem MASAK bildirim kaydına alındı.',
  ERR_NOT_FOUND: 'Uyum vakası bulunamadı.',
  ERR_INVALID_STATUS: 'Geçersiz vaka durum geçişi.',
} as const;
