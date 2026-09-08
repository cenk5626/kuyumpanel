/**
 * kuyumpanel - MASAK / AML Compliance & Risk Assessment Engine
 * 5549 Sayılı Kanun Uyarınca Şüpheli İşlem & Risk Değerlendirme Motoru
 */

import {
  AML_RISK_LEVEL,
  AmlRiskLevel,
  AML_TRIGGER_TYPE,
  AmlTriggerType,
  MASAK_DEFAULTS,
  COMPLIANCE_MESSAGES,
} from '@/constants/compliance';

export interface PastTransactionRecord {
  amountTL: number;
  createdAt: Date | string;
  isCash: boolean;
}

export interface TransactionAmlAssessmentInput {
  amountTL: number;
  isCash: boolean;
  customerId?: string;
  customerName?: string;
  customerTcNo?: string;
  customerIsPep?: boolean;
  recentTransactions?: PastTransactionRecord[];
}

export interface AmlAssessmentResult {
  isFlagged: boolean;
  kycRequired: boolean;
  structuringDetected: boolean;
  pepAlert: boolean;
  riskLevel: AmlRiskLevel;
  triggerType?: AmlTriggerType;
  messages: string[];
  total24hCashVolume: number;
}

/**
 * Bir alış veya satış işleminin MASAK AML kurallarına uygunluğunu denetler.
 */
export function assessTransactionCompliance(
  input: TransactionAmlAssessmentInput
): AmlAssessmentResult {
  const messages: string[] = [];
  let isFlagged = false;
  let kycRequired = false;
  let structuringDetected = false;
  let pepAlert = false;
  let riskLevel: AmlRiskLevel = AML_RISK_LEVEL.LOW;
  let triggerType: AmlTriggerType | undefined = undefined;

  const threshold = MASAK_DEFAULTS.KYC_CASH_THRESHOLD_TL;
  const now = new Date().getTime();
  const lookbackMs = MASAK_DEFAULTS.STRUCTURING_LOOKBACK_HOURS * 60 * 60 * 1000;

  // 1. Son 24 saatteki nakit işlemleri konsolide et
  let previous24hCashSum = 0;
  let previousCashCount = 0;

  if (input.recentTransactions && input.recentTransactions.length > 0) {
    for (const tx of input.recentTransactions) {
      if (!tx.isCash) continue;
      const txTime = new Date(tx.createdAt).getTime();
      if (now - txTime <= lookbackMs) {
        previous24hCashSum += tx.amountTL;
        previousCashCount++;
      }
    }
  }

  const currentCashAmount = input.isCash ? input.amountTL : 0;
  const total24hCashVolume = previous24hCashSum + currentCashAmount;

  // 2. Tekil İşlem Eşiği (KYC Threshold - 185.000 TL)
  if (input.isCash && input.amountTL >= threshold) {
    kycRequired = true;
    const hasValidTcNo = input.customerTcNo && input.customerTcNo.trim().length >= 11;
    if (!hasValidTcNo) {
      isFlagged = true;
      riskLevel = AML_RISK_LEVEL.HIGH;
      triggerType = AML_TRIGGER_TYPE.KYC_THRESHOLD_EXCEEDED;
      messages.push(COMPLIANCE_MESSAGES.KYC_REQUIRED);
    }
  }

  // 3. Parçalama (Structuring / Smurfing) Kontrolü
  // Eğer geçmiş işlemler tek tek eşik altındaysa ancak son 24 saatteki toplam eşiği aşıyorsa
  if (
    input.isCash &&
    input.amountTL < threshold &&
    previousCashCount >= 1 &&
    total24hCashVolume >= threshold
  ) {
    isFlagged = true;
    structuringDetected = true;
    riskLevel = AML_RISK_LEVEL.CRITICAL;
    triggerType = AML_TRIGGER_TYPE.SMURFING_DETECTED;
    messages.push(COMPLIANCE_MESSAGES.SMURFING_ALERT);
  }

  // 4. PEP (Siyasi Nüfuz Sahibi Kişi) Kontrolü
  if (input.customerIsPep) {
    if (input.amountTL >= MASAK_DEFAULTS.PEP_MAX_ALLOWABLE_UNAUDITED_TL) {
      isFlagged = true;
      pepAlert = true;
      // Eğer daha yüksek bir risk atanmadıysa HIGH yap
      if (riskLevel !== AML_RISK_LEVEL.CRITICAL) {
        riskLevel = AML_RISK_LEVEL.HIGH;
        triggerType = triggerType || AML_TRIGGER_TYPE.PEP_TRANSACTION;
      }
      messages.push(COMPLIANCE_MESSAGES.PEP_ALERT);
    }
  }

  return {
    isFlagged,
    kycRequired,
    structuringDetected,
    pepAlert,
    riskLevel,
    triggerType,
    messages,
    total24hCashVolume,
  };
}

/**
 * Müşteri AML Risk Puanını hesaplar (0 - 100).
 */
export function calculateCustomerRiskScore(profile: {
  isPep?: boolean;
  idVerified?: boolean;
  totalVolumeTL?: number;
  cashRatio?: number; // 0.0 - 1.0 (nakit ağırlığı)
  complianceIncidentCount?: number;
}): { score: number; riskLevel: AmlRiskLevel } {
  let score = 10; // Baz başlangıç puanı

  if (profile.isPep) {
    score += 45;
  }

  if (!profile.idVerified) {
    score += 20;
  }

  if (profile.cashRatio && profile.cashRatio > 0.7) {
    score += 15;
  }

  if (profile.complianceIncidentCount && profile.complianceIncidentCount > 0) {
    score += Math.min(profile.complianceIncidentCount * 15, 30);
  }

  if (profile.totalVolumeTL && profile.totalVolumeTL > 1000000) {
    score += 10;
  }

  // 0 - 100 aralığına sınırla
  score = Math.min(100, Math.max(0, score));

  let riskLevel: AmlRiskLevel = AML_RISK_LEVEL.LOW;
  if (score > MASAK_DEFAULTS.SCORE_THRESHOLD_HIGH) {
    riskLevel = AML_RISK_LEVEL.CRITICAL;
  } else if (score > MASAK_DEFAULTS.SCORE_THRESHOLD_MEDIUM) {
    riskLevel = AML_RISK_LEVEL.HIGH;
  } else if (score > MASAK_DEFAULTS.SCORE_THRESHOLD_LOW) {
    riskLevel = AML_RISK_LEVEL.MEDIUM;
  }

  return { score, riskLevel };
}

/**
 * MASAK Şüpheli İşlem Bildirimi (ŞİB / SAR) Taslağı Üretir.
 */
export function generateSarDraft(caseData: {
  caseNumber: string;
  customerName: string;
  customerTcNo?: string;
  customerPhone?: string;
  detectedAmount: number;
  triggerType: string;
  description: string;
  createdAt: Date | string;
  storeName?: string;
}): string {
  const dateStr = caseData.createdAt instanceof Date
    ? caseData.createdAt.toLocaleDateString('tr-TR')
    : new Date(caseData.createdAt).toLocaleDateString('tr-TR');

  const tcDisplay = caseData.customerTcNo || 'BEYAN EDİLMEDİ / BELİRSİZ';
  const phoneDisplay = caseData.customerPhone || 'KAYITSIZ';
  const store = caseData.storeName || 'Yetkili Kuyumcu İşletmesi';

  return `================================================================================
T.C. MALİ SUÇLARI ARAŞTIRMA KURULU BAŞKANLIĞI (MASAK)
ŞÜPHELİ İŞLEM BİLDİRİM FORMU (ŞİB) - KUYUMCULUK SEKTÖRÜ YÜKÜMLÜ TASLAĞI
(5549 Sayılı Kanun Madde 4 ve İlgili Yönetmelikler Uyarınca)
================================================================================

1. BİLDİRİM BİLGİLERİ
- Vaka Takip No      : ${caseData.caseNumber}
- Bildirim Tarihi    : ${dateStr}
- Yükümlü İşletme    : ${store}
- Tespit Edilen Tutar: ₺${caseData.detectedAmount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}

2. ŞÜPHELİ ŞAHIS / MÜŞTERİ BİLGİLERİ
- Adı / Unvanı       : ${caseData.customerName}
- TCKN / Pasaport No : ${tcDisplay}
- İletişim Telefonu  : ${phoneDisplay}

3. ŞÜPHELİ İŞLEM TÜRÜ & GEREKÇESİ
- Tetikleyici Kural  : ${caseData.triggerType}
- Olay Özeti         : ${caseData.description}

4. DEĞERLENDİRME & KANUNİ BİLDİRİM BEYANI
İşbu bildirim, 5549 Sayılı Kanun'un 4. maddesi kapsamında suç gelirlerinin aklanması
veya terörün finansmanı şüphesi oluşturan işlemlerin tespiti üzerine yasal yükümlülük
çerçevesinde sistem tarafından düzenlenmiş resmi bildirim taslağıdır.

Uyum Sorumlusu İmzası / Kaşe:
[E-İMZALI MASAK UYUM SORUMLUSU]
================================================================================`;
}
