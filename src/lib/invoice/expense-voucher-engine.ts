import {
  EXPENSE_VOUCHER_DEFAULTS,
  EXPENSE_VOUCHER_WITHHOLDING_RATES,
  EXPENSE_VOUCHER_STATUS,
  EXPENSE_VOUCHER_SIGNATURE_STATUS,
  EXPENSE_VOUCHER_PAYMENT_METHODS,
  ExpenseVoucherPaymentMethod,
  CARAT_PURITY,
} from '@/constants/expense-voucher';
import { roundMoney, roundGrams } from '@/lib/security/validation';

export interface ExpenseVoucherLineInput {
  description: string;
  carat: number;
  weight: number;
  unitPrice: number; // Gram başına TL alış bedeli
  milyem?: number;
}

export interface CalculatedVoucherLine {
  description: string;
  carat: number;
  milyem: number;
  weight: number;
  unitPrice: number;
  totalPrice: number;
  hasEquivalent: number;
}

export interface CalculatedVoucherSummary {
  lines: CalculatedVoucherLine[];
  grossAmount: number;
  withholdingRate: number;
  withholdingAmount: number;
  netAmount: number;
  totalPureGoldWeight: number;
}

/**
 * Gider pusulası kalemlerini ve stopaj/net ödeme dökümünü hesaplar.
 */
export function calculateExpenseVoucher(
  lines: ExpenseVoucherLineInput[],
  withholdingRatePercent: number = EXPENSE_VOUCHER_WITHHOLDING_RATES.EXEMPT
): CalculatedVoucherSummary {
  if (!lines || lines.length === 0) {
    return {
      lines: [],
      grossAmount: 0,
      withholdingRate: withholdingRatePercent,
      withholdingAmount: 0,
      netAmount: 0,
      totalPureGoldWeight: 0,
    };
  }

  let totalGross = 0;
  let totalPureGold = 0;

  const calculatedLines: CalculatedVoucherLine[] = lines.map((item) => {
    const carat = Math.max(8, Math.min(24, Math.round(item.carat || 22)));
    const milyem = item.milyem || CARAT_PURITY[carat] || 916;
    const weight = roundGrams(Math.max(0, item.weight || 0));
    const unitPrice = roundMoney(Math.max(0, item.unitPrice || 0));
    const totalPrice = roundMoney(weight * unitPrice);
    const hasEquivalent = roundGrams(weight * (milyem / 1000));

    totalGross += totalPrice;
    totalPureGold += hasEquivalent;

    return {
      description: item.description?.trim() || `${carat} Ayar Hurda Altın`,
      carat,
      milyem,
      weight,
      unitPrice,
      totalPrice,
      hasEquivalent,
    };
  });

  const grossAmount = roundMoney(totalGross);
  const safeWithholdingRate = Math.max(0, Math.min(20, withholdingRatePercent));
  const withholdingAmount = roundMoney((grossAmount * safeWithholdingRate) / 100);
  const netAmount = roundMoney(grossAmount - withholdingAmount);
  const totalPureGoldWeight = roundGrams(totalPureGold);

  return {
    lines: calculatedLines,
    grossAmount,
    withholdingRate: safeWithholdingRate,
    withholdingAmount,
    netAmount,
    totalPureGoldWeight,
  };
}

/**
 * Sıradaki gider pusulası seri numarasını üretir (Örn: GP-2026-0001).
 */
export function generateExpenseVoucherNumber(dealerId: string, currentCount: number): string {
  const currentYear = new Date().getFullYear();
  const sequenceNumber = (currentCount + 1).toString().padStart(4, '0');
  return `${EXPENSE_VOUCHER_DEFAULTS.PREFIX}-${currentYear}-${sequenceNumber}`;
}
