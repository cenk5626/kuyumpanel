/**
 * kuyumpanel - Bank, POS & Open Banking Reconciliation Engine
 */

import crypto from 'crypto';
import {
  BANKING_DEFAULTS,
  POS_SETTLEMENT_STATUS,
  PosSettlementStatus,
} from '@/constants/banking';

export interface PosSettlementCalculation {
  grossAmount: number;
  commissionRate: number;
  commissionAmount: number;
  netAmount: number;
  maturityDate: Date;
  status: PosSettlementStatus;
}

/**
 * POS gün sonu takas ve komisyon net tutarını hesaplar.
 */
export function calculatePosSettlement(
  grossAmount: number,
  commissionRate: number = BANKING_DEFAULTS.DEFAULT_COMMISSION_RATE,
  blockingDays: number = BANKING_DEFAULTS.DEFAULT_BLOCKING_DAYS,
  settlementDate: Date | string = new Date()
): PosSettlementCalculation {
  if (grossAmount <= 0) {
    return {
      grossAmount: 0,
      commissionRate,
      commissionAmount: 0,
      netAmount: 0,
      maturityDate: new Date(settlementDate),
      status: POS_SETTLEMENT_STATUS.SETTLED,
    };
  }

  // Komisyon tutarı (Kuruş hassasiyetinde yuvarlama)
  const commissionAmount = Math.round((grossAmount * (commissionRate / 100)) * 100) / 100;
  const netAmount = Math.round((grossAmount - commissionAmount) * 100) / 100;

  const baseDate = settlementDate instanceof Date ? settlementDate : new Date(settlementDate);
  const maturityDate = new Date(baseDate.getTime() + blockingDays * 24 * 60 * 60 * 1000);

  return {
    grossAmount,
    commissionRate,
    commissionAmount,
    netAmount,
    maturityDate,
    status: blockingDays > 0 ? POS_SETTLEMENT_STATUS.BLOCKED : POS_SETTLEMENT_STATUS.SETTLED,
  };
}

/**
 * Açık Bankacılık Webhook HMAC-SHA256 İmza Doğrulaması.
 */
export function verifyOpenBankingWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  if (!payload || !signature || !secret) return false;

  try {
    const computedHmac = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');

    const expectedBuffer = Buffer.from(signature, 'hex');
    const computedBuffer = Buffer.from(computedHmac, 'hex');

    if (expectedBuffer.length !== computedBuffer.length) {
      return false;
    }

    return crypto.timingSafeEqual(expectedBuffer, computedBuffer);
  } catch (error) {
    return false;
  }
}

export interface CandidateSalesRecord {
  id: string;
  totalAmount: number;
  createdAt: Date | string;
  paymentMethod?: string;
  customerName?: string;
}

/**
 * Banka hesap hareketini (Havale/EFT) sistemdeki satış/tahsilat kayıtları ile eşleştirir.
 */
export function reconcileBankTransactionsWithSales(
  bankTx: {
    amount: number;
    transactionDate: Date | string;
    description: string;
  },
  candidates: CandidateSalesRecord[]
): {
  isMatch: boolean;
  matchedId?: string;
  confidence: 'EXACT' | 'PROBABLE' | 'NONE';
  message?: string;
} {
  const txTime = new Date(bankTx.transactionDate).getTime();
  const toleranceMs = BANKING_DEFAULTS.MATCH_TIME_TOLERANCE_HOURS * 60 * 60 * 1000;
  const toleranceAmount = BANKING_DEFAULTS.MATCH_TOLERANCE_TL;

  // 1. Birebir Tutar + Zaman Penceresi + Açıklama/Müşteri Eşleşmesi
  for (const cand of candidates) {
    const candTime = new Date(cand.createdAt).getTime();
    const timeDiff = Math.abs(txTime - candTime);
    const amountDiff = Math.abs(cand.totalAmount - bankTx.amount);

    if (amountDiff <= toleranceAmount && timeDiff <= toleranceMs) {
      // Müşteri adı açıklamada geçiyor mu?
      const nameMatch = cand.customerName &&
        bankTx.description.toLowerCase().includes(cand.customerName.toLowerCase());

      if (nameMatch || amountDiff === 0) {
        return {
          isMatch: true,
          matchedId: cand.id,
          confidence: nameMatch ? 'EXACT' : 'PROBABLE',
          message: nameMatch
            ? 'Birebir tutar ve müşteri adı eşleşti'
            : 'Tutar ve tarih eşleşmesi sağlandı',
        };
      }
    }
  }

  return {
    isMatch: false,
    confidence: 'NONE',
    message: 'Uygun eşleşen kayıt bulunamadı',
  };
}
