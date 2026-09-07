import { FX_DEFAULTS, DISCREPANCY_TYPE, DiscrepancyType } from '@/constants/forex';
import { roundMoney, roundGrams } from '@/lib/security/validation';

export interface ForexValuationInput {
  usdAmount?: number;
  openUsdRate?: number | null;
  currentUsdRate?: number | null;
  drawerUSD?: number;
  openingRateUSD?: number | null;
  currentRateUSD?: number | null;

  eurAmount?: number;
  openEurRate?: number | null;
  currentEurRate?: number | null;
  drawerEUR?: number;
  openingRateEUR?: number | null;
  currentRateEUR?: number | null;

  hasAmount?: number;
  openHasRate?: number | null;
  currentHasRate?: number | null;
  drawerHAS?: number;
  openingRateHAS?: number | null;
  currentRateHAS?: number | null;
}

export interface ForexValuationResult {
  usdGainLoss: number;
  eurGainLoss: number;
  hasGainLoss: number;
  totalGainLossTL: number;
  usdPnL: number;
  eurPnL: number;
  hasPnL: number;
  totalPnL: number;
}

/**
 * Gün içi döviz ve altın kurlarındaki değişimden kaynaklanan kambiyo kâr/zararını hesaplar.
 */
export function calculateForexValuationPnL(input: ForexValuationInput): ForexValuationResult {
  const usdAmount = input.usdAmount ?? input.drawerUSD ?? 0;
  const openUsdRate = input.openUsdRate ?? input.openingRateUSD ?? 0;
  const currentUsdRate = input.currentUsdRate ?? input.currentRateUSD ?? 0;

  const eurAmount = input.eurAmount ?? input.drawerEUR ?? 0;
  const openEurRate = input.openEurRate ?? input.openingRateEUR ?? 0;
  const currentEurRate = input.currentEurRate ?? input.currentRateEUR ?? 0;

  const hasAmount = input.hasAmount ?? input.drawerHAS ?? 0;
  const openHasRate = input.openHasRate ?? input.openingRateHAS ?? 0;
  const currentHasRate = input.currentHasRate ?? input.currentRateHAS ?? 0;

  const usdGainLoss = (openUsdRate > 0 && currentUsdRate > 0)
    ? roundMoney(usdAmount * (currentUsdRate - openUsdRate))
    : 0;

  const eurGainLoss = (openEurRate > 0 && currentEurRate > 0)
    ? roundMoney(eurAmount * (currentEurRate - openEurRate))
    : 0;

  const hasGainLoss = (openHasRate > 0 && currentHasRate > 0)
    ? roundMoney(hasAmount * (currentHasRate - openHasRate))
    : 0;

  const totalGainLossTL = roundMoney(usdGainLoss + eurGainLoss + hasGainLoss);

  return {
    usdGainLoss,
    eurGainLoss,
    hasGainLoss,
    totalGainLossTL,
    usdPnL: usdGainLoss,
    eurPnL: eurGainLoss,
    hasPnL: hasGainLoss,
    totalPnL: totalGainLossTL,
  };
}

/**
 * Döviz alım-satım veya bozma işlemindeki net kârı ve karşı para tutarını hesaplar.
 */
export function calculateFxTransaction(params: {
  fromCurrency: string;
  fromAmount: number;
  toCurrency: string;
  exchangeRate: number;
  marketRate?: number;
}): {
  toAmount: number;
  profitTL: number;
  effectiveRate: number;
} {
  const { fromCurrency, fromAmount, toCurrency, exchangeRate, marketRate } = params;

  let toAmount = 0;
  let profitTL = 0;

  if (toCurrency === 'TL') {
    // Müşteri Döviz/Altın veriyor, TL alıyor (Döviz Alış)
    toAmount = roundMoney(fromAmount * exchangeRate);
    if (marketRate && marketRate > 0) {
      profitTL = roundMoney(fromAmount * Math.abs(marketRate - exchangeRate));
    }
  } else if (fromCurrency === 'TL') {
    // Müşteri TL veriyor, Döviz/Altın alıyor (Döviz Satış)
    toAmount = roundGrams(fromAmount / exchangeRate);
    if (marketRate && marketRate > 0) {
      profitTL = roundMoney(toAmount * Math.abs(exchangeRate - marketRate));
    }
  } else {
    // Çapraz Kur (Örn: USD -> EUR)
    toAmount = roundMoney(fromAmount * exchangeRate);
  }

  return {
    toAmount,
    profitTL,
    effectiveRate: exchangeRate,
  };
}

/**
 * Kasa sayım mutabakat farkını sınıflandırır.
 */
export function classifyCashDiscrepancy(
  systemOrDiff: number,
  countedAmount?: number,
  tolerance: number = 0.01
): {
  diffAmount: number;
  type: DiscrepancyType;
  status: string;
  isBalanced: boolean;
  statusText: string;
} {
  let diffAmount = 0;
  if (countedAmount !== undefined && typeof countedAmount === 'number' && !isNaN(countedAmount)) {
    diffAmount = roundMoney(countedAmount - systemOrDiff);
  } else {
    diffAmount = roundMoney(systemOrDiff);
  }

  if (Math.abs(diffAmount) <= tolerance) {
    return {
      diffAmount: 0,
      type: DISCREPANCY_TYPE.BALANCED,
      status: 'RESOLVED',
      isBalanced: true,
      statusText: 'Kasa Tam Denk',
    };
  } else if (diffAmount > tolerance) {
    return {
      diffAmount,
      type: DISCREPANCY_TYPE.SURPLUS,
      status: 'PENDING',
      isBalanced: false,
      statusText: `+${diffAmount.toFixed(2)} Kasa Fazlası`,
    };
  } else {
    return {
      diffAmount,
      type: DISCREPANCY_TYPE.DEFICIT,
      status: 'PENDING',
      isBalanced: false,
      statusText: `${diffAmount.toFixed(2)} Kasa Noksanı`,
    };
  }
}

/**
 * Sıralı Döviz İşlem Numarası üretir (Örn: FX-2026-0001).
 */
export function generateFxExchangeNumber(
  sequenceNumber: number,
  year: number = new Date().getFullYear()
): string {
  const padded = String(sequenceNumber).padStart(FX_DEFAULTS.PAD_LENGTH, '0');
  return `${FX_DEFAULTS.PREFIX}-${year}-${padded}`;
}

