/**
 * Şüpheli İşlem Tespit Motoru (Suspicious Activity Detector)
 * Kural tabanlı risk puanlaması ve anomali tespiti
 * Sıfır Magic Number / String Kuralına Uygun
 */

import {
  RISK_LEVELS,
  RiskLevel,
  SUSPICIOUS_THRESHOLDS,
  SUSPICIOUS_REASONS,
} from '@/constants/suspicious';

export interface SuspiciousEvaluationInput {
  type: string; // "sell" | "buy"
  productCode: string;
  quantity: number;
  price: number;
  total: number;
  paymentMethod?: string;
  marketPrice?: { bid: number; ask: number } | null;
  customer?: {
    id: string;
    name: string;
    currentDebtTL?: number;
    creditLimitTL?: number | null;
  } | null;
  createdAt?: Date | string;
  recentDealerTransactions?: Array<{
    productCode: string;
    quantity: number;
    price: number;
    createdAt: Date | string;
  }>;
}

export interface SuspiciousEvaluationResult {
  isSuspicious: boolean;
  riskLevel: RiskLevel;
  riskScore: number; // 0 - 100
  reasons: string[];
}

/**
 * İşlemi tüm güvenlik ve tutarlılık kurallarına göre inceler.
 */
export function evaluateTransactionSuspicion(
  input: SuspiciousEvaluationInput
): SuspiciousEvaluationResult {
  const reasons: string[] = [];
  let score = 0;

  const totalAmount = input.total || input.quantity * input.price;
  const isSell = input.type === 'sell' || input.type === 'SELL';
  const txDate = input.createdAt ? new Date(input.createdAt) : new Date();
  const txHour = txDate.getHours();

  // Kural 1: Yüksek Tutar Kontrolü
  if (totalAmount >= SUSPICIOUS_THRESHOLDS.VERY_HIGH_AMOUNT_THRESHOLD_TL) {
    reasons.push(`${SUSPICIOUS_REASONS.HIGH_AMOUNT} (₺${totalAmount.toLocaleString('tr-TR')} >= ₺${SUSPICIOUS_THRESHOLDS.VERY_HIGH_AMOUNT_THRESHOLD_TL.toLocaleString('tr-TR')})`);
    score += 45;
  } else if (totalAmount >= SUSPICIOUS_THRESHOLDS.HIGH_AMOUNT_THRESHOLD_TL) {
    reasons.push(`${SUSPICIOUS_REASONS.HIGH_AMOUNT} (₺${totalAmount.toLocaleString('tr-TR')} >= ₺${SUSPICIOUS_THRESHOLDS.HIGH_AMOUNT_THRESHOLD_TL.toLocaleString('tr-TR')})`);
    score += 25;
  }

  // Kural 2: Piyasa Fiyatından Sapma Kontrolü
  if (input.marketPrice) {
    const referencePrice = isSell ? input.marketPrice.ask : input.marketPrice.bid;
    if (referencePrice > 0) {
      const priceDiffPercent = ((input.price - referencePrice) / referencePrice) * 100;

      // Satışta maliyetin/piyasanın çok altında satılması (zararına/şüpheli iskonto)
      if (isSell && priceDiffPercent < -SUSPICIOUS_THRESHOLDS.MAX_PRICE_DEVIATION_PERCENT) {
        reasons.push(`${SUSPICIOUS_REASONS.PRICE_DEVIATION_LOW} (Piyasadan %${Math.abs(priceDiffPercent).toFixed(1)} daha ucuz)`);
        score += 35;
      }
      // Alışta piyasa üstünde çok pahalıya alınması veya satışta fahiş fiyat
      else if (Math.abs(priceDiffPercent) > SUSPICIOUS_THRESHOLDS.MAX_PRICE_DEVIATION_PERCENT * 2) {
        reasons.push(`${SUSPICIOUS_REASONS.PRICE_DEVIATION_HIGH} (Piyasa referansından %${Math.abs(priceDiffPercent).toFixed(1)} sapma)`);
        score += 30;
      }
    }
  }

  // Kural 3: Gece / Mesai Dışı İşlem Kontrolü
  if (
    txHour >= SUSPICIOUS_THRESHOLDS.NIGHT_HOURS_START ||
    txHour < SUSPICIOUS_THRESHOLDS.NIGHT_HOURS_END
  ) {
    reasons.push(`${SUSPICIOUS_REASONS.AFTER_HOURS} (Saat ${String(txHour).padStart(2, '0')}:${String(txDate.getMinutes()).padStart(2, '0')})`);
    score += 20;
  }

  // Kural 4: Müşteri Kredi / Borç Limiti Aşımı Kontrolü
  if (input.customer && input.paymentMethod === 'DEBT') {
    const creditLimit = input.customer.creditLimitTL || 0;
    const currentDebt = input.customer.currentDebtTL || 0;
    if (creditLimit > 0 && currentDebt + totalAmount > creditLimit) {
      const excess = currentDebt + totalAmount - creditLimit;
      reasons.push(`${SUSPICIOUS_REASONS.CREDIT_LIMIT_EXCEEDED} (Limit: ₺${creditLimit.toLocaleString('tr-TR')}, Aşım: ₺${excess.toLocaleString('tr-TR')})`);
      score += 40;
    }
  }

  // Kural 5: Ardışık Hızlı Tekrar Kontrolü
  if (input.recentDealerTransactions && input.recentDealerTransactions.length > 0) {
    const windowMs = SUSPICIOUS_THRESHOLDS.RAPID_REPEAT_WINDOW_SECONDS * 1000;
    const isRapidRepeat = input.recentDealerTransactions.some((prevTx) => {
      if (prevTx.productCode !== input.productCode) return false;
      const prevDate = new Date(prevTx.createdAt);
      const diffMs = Math.abs(txDate.getTime() - prevDate.getTime());
      return diffMs <= windowMs;
    });

    if (isRapidRepeat) {
      reasons.push(`${SUSPICIOUS_REASONS.RAPID_DUPLICATE} (${SUSPICIOUS_THRESHOLDS.RAPID_REPEAT_WINDOW_SECONDS} saniye içinde aynı ürün)`);
      score += 25;
    }
  }

  // Risk Seviyesi Belirleme
  let riskLevel: RiskLevel = RISK_LEVELS.LOW;
  if (score >= 70) {
    riskLevel = RISK_LEVELS.CRITICAL;
  } else if (score >= 45) {
    riskLevel = RISK_LEVELS.HIGH;
  } else if (score >= 20) {
    riskLevel = RISK_LEVELS.MEDIUM;
  }

  const isSuspicious = score >= 25 || reasons.length > 0;

  return {
    isSuspicious,
    riskLevel,
    riskScore: Math.min(score, 100),
    reasons,
  };
}
