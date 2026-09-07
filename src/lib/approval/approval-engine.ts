/**
 * kuyumpanel - Multi-Level Approval Engine & Four-Eyes Principle Guardrail
 * Central business logic for approval validation, tier delegation and segregation of duties.
 */

import {
  APPROVAL_REQUEST_TYPE,
  APPROVAL_REQUEST_TYPE_LABELS,
  APPROVAL_STATUS,
  APPROVAL_THRESHOLDS,
  APPROVAL_ROLES,
  APPROVAL_UNITS,
  APPROVAL_ERRORS,
  ApprovalRequestType,
  ApprovalStatus,
  ApprovalUnit,
} from '@/constants/approval';

export interface ApprovalActor {
  id: string;
  name?: string;
  email: string;
  role: string;
}

export interface ApprovalRequestInput {
  requestType: ApprovalRequestType;
  title: string;
  description?: string;
  amount?: number;
  unit?: ApprovalUnit;
  payload?: any;
}

export interface ApprovalCheckResult {
  required: boolean;
  requiredLevel: number;
  reason?: string;
}

/**
 * İskonto oranının onay gerektirip gerektirmediğini tespit eder.
 */
export function needsApprovalForDiscount(
  discountPercent: number,
  userRole: string
): ApprovalCheckResult {
  if (discountPercent <= 0) {
    return { required: false, requiredLevel: 0 };
  }

  // SUPER_ADMIN tüm iskontoları verebilir
  if (userRole === APPROVAL_ROLES.SUPER_ADMIN) {
    return { required: false, requiredLevel: 0 };
  }

  // %20 ve üzeri iskonto her halükarda SUPER_ADMIN onayı gerektirir (Level 2)
  if (discountPercent >= APPROVAL_THRESHOLDS.LEVEL2_DISCOUNT_PERCENT) {
    return {
      required: true,
      requiredLevel: 2,
      reason: `%${discountPercent} oranı %${APPROVAL_THRESHOLDS.LEVEL2_DISCOUNT_PERCENT} tavanını aştığı için Şirket Sahibi (SUPER_ADMIN) onayı gerektirir.`,
    };
  }

  // ADMIN %10 - %20 arasını onay almadan verebilir
  if (userRole === APPROVAL_ROLES.ADMIN) {
    return { required: false, requiredLevel: 0 };
  }

  // Standart personel (USER/TABLET/PC) için %10 ve üzeri onay gerektirir
  if (discountPercent >= APPROVAL_THRESHOLDS.LEVEL1_DISCOUNT_PERCENT) {
    return {
      required: true,
      requiredLevel: 1,
      reason: `%${discountPercent} oranı personel yetkisini (%${APPROVAL_THRESHOLDS.LEVEL1_DISCOUNT_PERCENT}) aştığı için Şube Müdürü (ADMIN) onayı gerektirir.`,
    };
  }

  return { required: false, requiredLevel: 0 };
}

/**
 * Nakit veya Has altın çıkışının onay gerektirip gerektirmediğini tespit eder.
 */
export function needsApprovalForCashOutflow(
  amount: number,
  unit: ApprovalUnit = APPROVAL_UNITS.TL
): ApprovalCheckResult {
  if (amount <= 0) {
    return { required: false, requiredLevel: 0 };
  }

  if (unit === APPROVAL_UNITS.HAS_GR) {
    if (amount >= APPROVAL_THRESHOLDS.LEVEL2_HAS_OUTFLOW_GR) {
      return {
        required: true,
        requiredLevel: 2,
        reason: `${amount} gr Has altın çıkışı ${APPROVAL_THRESHOLDS.LEVEL2_HAS_OUTFLOW_GR} gr sınırını aştığı için 2. Seviye Onay gerektirir.`,
      };
    }
    if (amount >= APPROVAL_THRESHOLDS.LEVEL1_HAS_OUTFLOW_GR) {
      return {
        required: true,
        requiredLevel: 1,
        reason: `${amount} gr Has altın çıkışı ${APPROVAL_THRESHOLDS.LEVEL1_HAS_OUTFLOW_GR} gr sınırını aştığı için 1. Seviye Onay gerektirir.`,
      };
    }
    return { required: false, requiredLevel: 0 };
  }

  // TL Kontrolü
  if (amount >= APPROVAL_THRESHOLDS.LEVEL2_CASH_OUTFLOW_TL) {
    return {
      required: true,
      requiredLevel: 2,
      reason: `${amount.toLocaleString('tr-TR')} TL nakit çıkışı ${APPROVAL_THRESHOLDS.LEVEL2_CASH_OUTFLOW_TL.toLocaleString('tr-TR')} TL sınırını aştığı için 2. Seviye Onay gerektirir.`,
    };
  }
  if (amount >= APPROVAL_THRESHOLDS.LEVEL1_CASH_OUTFLOW_TL) {
    return {
      required: true,
      requiredLevel: 1,
      reason: `${amount.toLocaleString('tr-TR')} TL nakit çıkışı ${APPROVAL_THRESHOLDS.LEVEL1_CASH_OUTFLOW_TL.toLocaleString('tr-TR')} TL sınırını aştığı için 1. Seviye Onay gerektirir.`,
    };
  }

  return { required: false, requiredLevel: 0 };
}

/**
 * İşlem türüne ve tutara göre gerekli onay seviyesini belirler.
 */
export function determineRequiredLevel(
  requestType: ApprovalRequestType,
  amount?: number,
  unit?: ApprovalUnit
): number {
  if (requestType === APPROVAL_REQUEST_TYPE.BALANCE_WRITEOFF) {
    return APPROVAL_THRESHOLDS.BALANCE_WRITEOFF_LEVEL;
  }

  if (requestType === APPROVAL_REQUEST_TYPE.HIGH_DISCOUNT && amount !== undefined) {
    const check = needsApprovalForDiscount(amount, 'USER');
    return check.requiredLevel || 1;
  }

  if (requestType === APPROVAL_REQUEST_TYPE.CASH_OUTFLOW && amount !== undefined) {
    const check = needsApprovalForCashOutflow(amount, unit);
    return check.requiredLevel || 1;
  }

  return 1;
}

/**
 * 4-Göz Prensibi (Four-Eyes Principle) Kontrolü.
 * Talebi oluşturan kişi kendi talebini asla onaylayamaz veya reddedemez.
 */
export function validateFourEyesPrinciple(
  requesterId: string,
  requesterEmail: string,
  approverId: string,
  approverEmail: string
): { valid: boolean; error?: string } {
  if (
    requesterId === approverId ||
    requesterEmail.trim().toLowerCase() === approverEmail.trim().toLowerCase()
  ) {
    return {
      valid: false,
      error: APPROVAL_ERRORS.FOUR_EYES_VIOLATION,
    };
  }
  return { valid: true };
}

/**
 * Onay veya Red işleminin kurallara uygunluğunu denetler.
 */
export function validateApprovalAction(
  request: {
    status: string;
    requesterId: string;
    requesterEmail: string;
    currentLevel: number;
    requiredLevel: number;
  },
  approver: ApprovalActor,
  action: 'APPROVE' | 'REJECT',
  rejectionReason?: string
): { valid: boolean; error?: string } {
  // 1. Zaten sonuçlanmış talep kontrolü
  if (request.status !== APPROVAL_STATUS.PENDING) {
    return {
      valid: false,
      error: APPROVAL_ERRORS.ALREADY_RESOLVED,
    };
  }

  // 2. 4-Göz Prensibi (Segregation of Duties)
  const fourEyesCheck = validateFourEyesPrinciple(
    request.requesterId,
    request.requesterEmail,
    approver.id,
    approver.email
  );
  if (!fourEyesCheck.valid) {
    return fourEyesCheck;
  }

  // 3. Ret gerekçesi zorunluluğu
  if (action === 'REJECT' && (!rejectionReason || !rejectionReason.trim())) {
    return {
      valid: false,
      error: APPROVAL_ERRORS.REJECTION_REASON_REQUIRED,
    };
  }

  // 4. Kademe ve Yetki Rolü Uygunluğu
  if (request.currentLevel === 2) {
    if (approver.role !== APPROVAL_ROLES.SUPER_ADMIN) {
      return {
        valid: false,
        error: APPROVAL_ERRORS.INSUFFICIENT_ROLE,
      };
    }
  } else if (request.currentLevel === 1) {
    if (
      approver.role !== APPROVAL_ROLES.ADMIN &&
      approver.role !== APPROVAL_ROLES.SUPER_ADMIN
    ) {
      return {
        valid: false,
        error: APPROVAL_ERRORS.INSUFFICIENT_ROLE,
      };
    }
  }

  return { valid: true };
}

/**
 * Gerekli onay seviyesine göre ilk adım şablonlarını oluşturur.
 */
export function buildApprovalSteps(requiredLevel: number) {
  const steps: Array<{
    stepLevel: number;
    requiredRole: string;
    status: (typeof APPROVAL_STATUS)[keyof typeof APPROVAL_STATUS];
  }> = [
    {
      stepLevel: 1,
      requiredRole: APPROVAL_ROLES.ADMIN,
      status: APPROVAL_STATUS.PENDING,
    },
  ];

  if (requiredLevel >= 2) {
    steps.push({
      stepLevel: 2,
      requiredRole: APPROVAL_ROLES.SUPER_ADMIN,
      status: APPROVAL_STATUS.PENDING,
    });
  }

  return steps;
}

/**
 * Onay adımı sonrasında talebin yeni durumunu ve bir sonraki kademeyi hesaplar.
 */
export function calculateNextApprovalState(
  currentLevel: number,
  requiredLevel: number,
  decision: 'APPROVE' | 'REJECT'
): {
  newStatus: ApprovalStatus;
  nextLevel: number;
  isFullyApproved: boolean;
} {
  if (decision === 'REJECT') {
    return {
      newStatus: APPROVAL_STATUS.REJECTED,
      nextLevel: currentLevel,
      isFullyApproved: false,
    };
  }

  // Onaylandı
  if (currentLevel < requiredLevel) {
    return {
      newStatus: APPROVAL_STATUS.PENDING, // Henüz son kademe değil
      nextLevel: currentLevel + 1,
      isFullyApproved: false,
    };
  }

  // Tüm kademeler tamamlandı
  return {
    newStatus: APPROVAL_STATUS.APPROVED,
    nextLevel: currentLevel,
    isFullyApproved: true,
  };
}

/**
 * WhatsApp bildirim mesajı oluşturucu
 */
export function formatApprovalWhatsAppNotification(request: {
  id: string;
  title: string;
  requestType: ApprovalRequestType;
  amount?: number;
  unit?: string;
  requesterName: string;
  requiredLevel: number;
}): string {
  const typeLabel = APPROVAL_REQUEST_TYPE_LABELS[request.requestType] || request.requestType;
  const amountStr =
    request.amount !== undefined
      ? `\n*Tutar/Miktar:* ${request.amount} ${request.unit || 'TL'}`
      : '';

  return (
    `🔔 *KuyumPanel — Onay Talebi Bildirimi*\n\n` +
    `*Talep No:* #${request.id.slice(-6).toUpperCase()}\n` +
    `*Tür:* ${typeLabel}\n` +
    `*Başlık:* ${request.title}${amountStr}\n` +
    `*Talep Eden:* ${request.requesterName}\n` +
    `*Gereken Seviye:* Seviye ${request.requiredLevel}\n\n` +
    `Lütfen panel üzerinden inceleyip onaylayınız veya reddediniz.`
  );
}
