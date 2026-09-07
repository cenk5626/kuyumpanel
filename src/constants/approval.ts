/**
 * kuyumpanel - Multi-Level Approval Engine & Four-Eyes Principle Constants
 * Strict zero magic number / magic string guardrail.
 */

export const APPROVAL_REQUEST_TYPE = {
  BALANCE_WRITEOFF: 'BALANCE_WRITEOFF',
  HIGH_DISCOUNT: 'HIGH_DISCOUNT',
  CASH_OUTFLOW: 'CASH_OUTFLOW',
  VIRMAN: 'VIRMAN',
  SCRAP_ADJUSTMENT: 'SCRAP_ADJUSTMENT',
} as const;

export type ApprovalRequestType = (typeof APPROVAL_REQUEST_TYPE)[keyof typeof APPROVAL_REQUEST_TYPE];

export const APPROVAL_REQUEST_TYPE_LABELS: Record<ApprovalRequestType, string> = {
  [APPROVAL_REQUEST_TYPE.BALANCE_WRITEOFF]: 'Müşteri/Toptancı Bakiye Düzeltme',
  [APPROVAL_REQUEST_TYPE.HIGH_DISCOUNT]: 'Limit Üzeri Özel İskonto',
  [APPROVAL_REQUEST_TYPE.CASH_OUTFLOW]: 'Yüksek Tutarlı Nakit/Has Çıkışı',
  [APPROVAL_REQUEST_TYPE.VIRMAN]: 'Toptancı Hesap Virmanı',
  [APPROVAL_REQUEST_TYPE.SCRAP_ADJUSTMENT]: 'Hurda / Fire Ramat Düzeltmesi',
};

export const APPROVAL_STATUS = {
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  CANCELLED: 'CANCELLED',
} as const;

export type ApprovalStatus = (typeof APPROVAL_STATUS)[keyof typeof APPROVAL_STATUS];

export const APPROVAL_STATUS_LABELS: Record<ApprovalStatus, string> = {
  [APPROVAL_STATUS.PENDING]: 'Onay Bekliyor',
  [APPROVAL_STATUS.APPROVED]: 'Onaylandı',
  [APPROVAL_STATUS.REJECTED]: 'Reddedildi',
  [APPROVAL_STATUS.CANCELLED]: 'İptal Edildi',
};

export const APPROVAL_ROLES = {
  ADMIN: 'ADMIN',
  SUPER_ADMIN: 'SUPER_ADMIN',
} as const;

export const APPROVAL_THRESHOLDS = {
  /** %10 ve üzeri iskonto Level 1 (ADMIN) onayı gerektirir */
  LEVEL1_DISCOUNT_PERCENT: 10,
  /** %20 ve üzeri iskonto Level 2 (SUPER_ADMIN) onayı gerektirir */
  LEVEL2_DISCOUNT_PERCENT: 20,
  /** 50.000 TL üzeri nakit çıkışı Level 1 onayı gerektirir */
  LEVEL1_CASH_OUTFLOW_TL: 50000,
  /** 200.000 TL üzeri nakit çıkışı Level 2 onayı gerektirir */
  LEVEL2_CASH_OUTFLOW_TL: 200000,
  /** 25 gr üzeri has altın çıkışı Level 1 onayı gerektirir */
  LEVEL1_HAS_OUTFLOW_GR: 25,
  /** 100 gr üzeri has altın çıkışı Level 2 onayı gerektirir */
  LEVEL2_HAS_OUTFLOW_GR: 100,
  /** Bakiye silme/sıfırlama için varsayılan gerekli seviye (1: ADMIN, 2: SUPER_ADMIN) */
  BALANCE_WRITEOFF_LEVEL: 2,
} as const;

export const APPROVAL_UNITS = {
  TL: 'TL',
  HAS_GR: 'HAS_GR',
  PERCENT: 'PERCENT',
} as const;

export type ApprovalUnit = (typeof APPROVAL_UNITS)[keyof typeof APPROVAL_UNITS];

export const APPROVAL_DEFAULTS = {
  DEFAULT_UNIT: APPROVAL_UNITS.TL,
  DEFAULT_REQUIRED_LEVEL: 1,
  INITIAL_CURRENT_LEVEL: 1,
  MAX_STEPS: 2,
} as const;

export const APPROVAL_ERRORS = {
  FOUR_EYES_VIOLATION: 'Dört-Göz Prensibi İhlali: Talebi oluşturan personel kendi talebini onaylayamaz veya reddedemez!',
  INSUFFICIENT_ROLE: 'Yetkisiz İşlem: Bu onay kademesini onaylamak için gerekli yetki rolüne sahip değilsiniz!',
  ALREADY_RESOLVED: 'Bu talep daha önce sonuçlandırılmıştır (Onaylandı/Reddedildi/İptal).',
  INVALID_STEP: 'Geçersiz onay adımı veya sırası.',
  REJECTION_REASON_REQUIRED: 'Ret işlemi için geçerli bir gerekçe belirtilmesi zorunludur!',
  REQUEST_NOT_FOUND: 'Onay talebi bulunamadı.',
} as const;
