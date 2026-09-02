/**
 * Cari & Altın Hesaplama Motoru (Customer & Supplier Ledger Engine)
 * Has Altın, Ziynet ve TL Çift Bakiye Hesaplama, Yürüyen Bakiye (Running Balance) ve Portföy Değerleme
 * Sıfır Magic Number / String Kuralına Uygun
 */

import {
  CUSTOMER_TRANSACTION_TYPES,
  CustomerTransactionType,
  ASSET_TYPES,
  AssetType,
  GOLD_FINENESS_RATES,
  GOLD_FINENESS_FACTORS,
  ZIYNET_WEIGHTS,
  ZIYNET_HAS_WEIGHTS,
  calculateHasEquivalent as calcHasEq,
} from '@/constants/cari';

// ---------------------- TYPES & INTERFACES ----------------------

export interface CustomerTransactionInput {
  id?: string;
  customerId: string;
  type: string; // BORC, TAHSILAT, ALACAK, ODEME
  assetType: string; // TL, USD, EUR, HAS, 24K, 22K, 18K, 14K, 8K, CEYREK, YARIM, TAM, ATA, GREMSE
  amount: number;
  unitPrice?: number | null;
  hasEquivalent?: number;
  description?: string | null;
  employeeName?: string | null;
  createdAt?: string | Date;
}

export interface CustomerStatementRow extends CustomerTransactionInput {
  hasEquivalent: number;
  runningBalanceTL: number;
  runningBalanceHas: number;
  runningBalanceUSD: number;
  runningBalanceEUR: number;
  runningConsolidatedTL: number;
  runningConsolidatedHas: number;
  runningConsolidatedUSD: number;
  runningConsolidatedEUR: number;
}

export interface CustomerBalanceSummary {
  tlBalance: number;
  hasBalance: number;
  usdBalance: number;
  eurBalance: number;
  totalDebtTL: number;
  totalCreditTL: number;
  totalDebtHas: number;
  totalCreditHas: number;
  estimatedTotalTL: number;
  totalConsolidatedTL: number;
  totalConsolidatedHas: number;
  totalConsolidatedUSD: number;
  totalConsolidatedEUR: number;
  currentSpotRate: number;
  transactionCount: number;
}

export interface PortfolioValuation {
  hasBalance: number;
  hasValueTL: number;
  tlBalance: number;
  usdBalance: number;
  usdValueTL: number;
  eurBalance: number;
  eurValueTL: number;
  totalValuationTL: number;
  spotRateHasTL: number;
}

// ---------------------- RE-EXPORTS & CONVERSIONS ----------------------

export const calculateHasEquivalent = calcHasEq;

/**
 * Ayar veya Varlık Türüne Göre Has Altın Gramajını Hesaplar
 */
export function calculateGoldFineness(caratOrAsset: string, weightInGrams: number): number {
  if (!weightInGrams || weightInGrams <= 0) return 0;
  const normalized = caratOrAsset.toUpperCase();
  const factor = GOLD_FINENESS_RATES[normalized] ?? 0;
  return Number((weightInGrams * factor).toFixed(4));
}

/**
 * Ziynet Adedine Göre Has Altın Karşılığını Hesaplar
 */
export function calculateZiynetHas(ziynetType: string, pieceCount: number): number {
  if (!pieceCount || pieceCount <= 0) return 0;
  const normalized = ziynetType.toUpperCase();
  const unitWeight = ZIYNET_WEIGHTS[normalized] ?? 0;
  return Number((pieceCount * unitWeight).toFixed(4));
}

// ---------------------- STATEMENT & RUNNING BALANCE ENGINE ----------------------

/**
 * Müşteri Ekstresi ve Kronolojik Yürüyen Bakiye (Running Balance) Hesaplama
 * @param transactions Müşteriye ait işlem listesi
 * @param currentSpotRate Anlık Gram Has Altın Fiyatı (TL/gr)
 * @param usdRate Anlık USD/TRY Kuru
 * @param eurRate Anlık EUR/TRY Kuru
 */
export function computeCustomerStatement(
  transactions: CustomerTransactionInput[],
  currentSpotRate: number = 3000,
  usdRate: number = 38.5,
  eurRate: number = 41.5
): { rows: CustomerStatementRow[]; summary: CustomerBalanceSummary } {
  let runningTL = 0;
  let runningHas = 0;
  let runningUSD = 0;
  let runningEUR = 0;

  let totalDebtTL = 0;
  let totalCreditTL = 0;
  let totalDebtHas = 0;
  let totalCreditHas = 0;

  // Kronolojik sıralama (Artan tarih)
  const sorted = [...transactions].sort((a, b) => {
    const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return timeA - timeB;
  });

  const rows: CustomerStatementRow[] = sorted.map((tx) => {
    const isDebt =
      tx.type === CUSTOMER_TRANSACTION_TYPES.BORC ||
      tx.type === CUSTOMER_TRANSACTION_TYPES.ODEME;
    const isCredit =
      tx.type === CUSTOMER_TRANSACTION_TYPES.TAHSILAT ||
      tx.type === CUSTOMER_TRANSACTION_TYPES.ALACAK;
    const multiplier = isDebt ? 1 : isCredit ? -1 : 0;

    const normalizedAsset = (tx.assetType || ASSET_TYPES.TL).toUpperCase();

    const hasEq =
      tx.hasEquivalent !== undefined && tx.hasEquivalent !== null
        ? tx.hasEquivalent
        : calculateHasEquivalent(normalizedAsset, tx.amount, tx.unitPrice);

    if (normalizedAsset === ASSET_TYPES.TL) {
      const deltaTL = tx.amount * multiplier;
      runningTL += deltaTL;
      if (isDebt) totalDebtTL += tx.amount;
      if (isCredit) totalCreditTL += tx.amount;
    } else if (normalizedAsset === ASSET_TYPES.USD) {
      runningUSD += tx.amount * multiplier;
    } else if (normalizedAsset === ASSET_TYPES.EUR) {
      runningEUR += tx.amount * multiplier;
    } else {
      // Altın & Ziynet varlıkları Has Altın bakiyesine etki eder
      const deltaHas = hasEq * multiplier;
      runningHas += deltaHas;
      if (isDebt) totalDebtHas += hasEq;
      if (isCredit) totalCreditHas += hasEq;
    }

    const rowConsolidated = computeConsolidatedCustomerDebt(
      runningHas,
      runningTL,
      runningUSD,
      runningEUR,
      currentSpotRate,
      usdRate,
      eurRate
    );

    return {
      ...tx,
      hasEquivalent: Number(hasEq.toFixed(4)),
      runningBalanceTL: Number(runningTL.toFixed(2)),
      runningBalanceHas: Number(runningHas.toFixed(4)),
      runningBalanceUSD: Number(runningUSD.toFixed(2)),
      runningBalanceEUR: Number(runningEUR.toFixed(2)),
      runningConsolidatedTL: rowConsolidated.totalTL,
      runningConsolidatedHas: rowConsolidated.totalHas,
      runningConsolidatedUSD: rowConsolidated.totalUSD,
      runningConsolidatedEUR: rowConsolidated.totalEUR,
    };
  });

  const roundedTL = Number(runningTL.toFixed(2));
  const roundedHas = Number(runningHas.toFixed(4));
  const roundedUSD = Number(runningUSD.toFixed(2));
  const roundedEUR = Number(runningEUR.toFixed(2));

  // 4 Para Biriminde Konsolide Toplam Borç Hesaplama
  const consolidated = computeConsolidatedCustomerDebt(
    roundedHas,
    roundedTL,
    roundedUSD,
    roundedEUR,
    currentSpotRate,
    usdRate,
    eurRate
  );

  const summary: CustomerBalanceSummary = {
    tlBalance: roundedTL,
    hasBalance: roundedHas,
    usdBalance: roundedUSD,
    eurBalance: roundedEUR,
    totalDebtTL: Number(totalDebtTL.toFixed(2)),
    totalCreditTL: Number(totalCreditTL.toFixed(2)),
    totalDebtHas: Number(totalDebtHas.toFixed(4)),
    totalCreditHas: Number(totalCreditHas.toFixed(4)),
    estimatedTotalTL: consolidated.totalTL,
    totalConsolidatedTL: consolidated.totalTL,
    totalConsolidatedHas: consolidated.totalHas,
    totalConsolidatedUSD: consolidated.totalUSD,
    totalConsolidatedEUR: consolidated.totalEUR,
    currentSpotRate,
    transactionCount: rows.length,
  };

  return { rows, summary };
}

// ---------------------- CONSOLIDATED MULTI-CURRENCY ENGINE ----------------------

export interface ConsolidatedDebtSummary {
  totalTL: number;
  totalHas: number;
  totalUSD: number;
  totalEUR: number;
  breakdown: {
    hasGrams: number;
    hasValueTL: number;
    tlAmount: number;
    usdAmount: number;
    usdValueTL: number;
    eurAmount: number;
    eurValueTL: number;
  };
}

/**
 * Bir müşterinin Has, TL, USD ve EUR borçlarını 4 temel para birimine konsolide eder
 */
export function computeConsolidatedCustomerDebt(
  hasBalance: number = 0,
  tlBalance: number = 0,
  usdBalance: number = 0,
  eurBalance: number = 0,
  hasPrice: number = 6000,
  usdPrice: number = 38.5,
  eurPrice: number = 41.5
): ConsolidatedDebtSummary {
  const safeHasPrice = hasPrice > 0 ? hasPrice : 6000;
  const safeUsdPrice = usdPrice > 0 ? usdPrice : 38.5;
  const safeEurPrice = eurPrice > 0 ? eurPrice : 41.5;

  const hasValueTL = (hasBalance || 0) * safeHasPrice;
  const tlValueTL = tlBalance || 0;
  const usdValueTL = (usdBalance || 0) * safeUsdPrice;
  const eurValueTL = (eurBalance || 0) * safeEurPrice;

  const totalTL = hasValueTL + tlValueTL + usdValueTL + eurValueTL;
  const totalHas = safeHasPrice > 0 ? totalTL / safeHasPrice : 0;
  const totalUSD = safeUsdPrice > 0 ? totalTL / safeUsdPrice : 0;
  const totalEUR = safeEurPrice > 0 ? totalTL / safeEurPrice : 0;

  return {
    totalTL: Number(totalTL.toFixed(2)),
    totalHas: Number(totalHas.toFixed(4)),
    totalUSD: Number(totalUSD.toFixed(2)),
    totalEUR: Number(totalEUR.toFixed(2)),
    breakdown: {
      hasGrams: Number((hasBalance || 0).toFixed(4)),
      hasValueTL: Number(hasValueTL.toFixed(2)),
      tlAmount: Number((tlBalance || 0).toFixed(2)),
      usdAmount: Number((usdBalance || 0).toFixed(2)),
      usdValueTL: Number(usdValueTL.toFixed(2)),
      eurAmount: Number((eurBalance || 0).toFixed(2)),
      eurValueTL: Number(eurValueTL.toFixed(2)),
    },
  };
}

// ---------------------- PORTFOLIO VALUATION & FORMATTERS ----------------------

/**
 * Cari Hesap Portföy Değerleme Fonksiyonu
 */
export function calculatePortfolioValuation(
  hasBalance: number,
  tlBalance: number,
  spotRateHasTL: number,
  usdBalance: number = 0,
  usdRate: number = 0,
  eurBalance: number = 0,
  eurRate: number = 0
): PortfolioValuation {
  const hasValueTL = Number((hasBalance * spotRateHasTL).toFixed(2));
  const usdValueTL = Number((usdBalance * usdRate).toFixed(2));
  const eurValueTL = Number((eurBalance * eurRate).toFixed(2));
  const totalValuationTL = Number((tlBalance + hasValueTL + usdValueTL + eurValueTL).toFixed(2));

  return {
    hasBalance: Number(hasBalance.toFixed(4)),
    hasValueTL,
    tlBalance: Number(tlBalance.toFixed(2)),
    usdBalance: Number(usdBalance.toFixed(2)),
    usdValueTL,
    eurBalance: Number(eurBalance.toFixed(2)),
    eurValueTL,
    totalValuationTL,
    spotRateHasTL,
  };
}

/**
 * İşlem listesinden müşteri bakiyelerini konsolide eder
 */
export function calculateCustomerBalancesFromTransactions(
  transactions: Array<{ type: string; assetType: string; amount: number; hasEquivalent?: number | null; unitPrice?: number | null }>
): {
  tlBalance: number;
  hasBalance: number;
  usdBalance: number;
  eurBalance: number;
  totalHasEquivalent: number;
} {
  let tlBalance = 0;
  let hasBalance = 0;
  let usdBalance = 0;
  let eurBalance = 0;
  let totalHasEquivalent = 0;

  for (const tx of transactions) {
    const isDebt = tx.type === CUSTOMER_TRANSACTION_TYPES.BORC || tx.type === CUSTOMER_TRANSACTION_TYPES.ODEME;
    const sign = isDebt ? 1 : -1;
    const asset = (tx.assetType || ASSET_TYPES.TL).toUpperCase();

    const hasEq =
      tx.hasEquivalent !== undefined && tx.hasEquivalent !== null
        ? tx.hasEquivalent
        : calculateHasEquivalent(asset, tx.amount, tx.unitPrice);

    totalHasEquivalent += hasEq * sign;

    if (asset === ASSET_TYPES.TL) {
      tlBalance += tx.amount * sign;
    } else if (asset === ASSET_TYPES.USD) {
      usdBalance += tx.amount * sign;
    } else if (asset === ASSET_TYPES.EUR) {
      eurBalance += tx.amount * sign;
    } else {
      hasBalance += hasEq * sign;
    }
  }

  return {
    tlBalance: Number(tlBalance.toFixed(2)),
    hasBalance: Number(hasBalance.toFixed(4)),
    usdBalance: Number(usdBalance.toFixed(2)),
    eurBalance: Number(eurBalance.toFixed(2)),
    totalHasEquivalent: Number(totalHasEquivalent.toFixed(4)),
  };
}

/**
 * Para birimi formatlayıcı (₺, $, €)
 */
export function formatCurrency(amount: number, currency: string = 'TL'): string {
  const formatted = amount.toLocaleString('tr-TR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  switch (currency.toUpperCase()) {
    case ASSET_TYPES.TL:
      return `₺${formatted}`;
    case ASSET_TYPES.USD:
      return `$${formatted}`;
    case ASSET_TYPES.EUR:
      return `€${formatted}`;
    default:
      return `${formatted} ${currency}`;
  }
}

/**
 * Altın gramaj formatlayıcı (gr Has)
 */
export function formatGoldGram(grams: number): string {
  return `${grams.toLocaleString('tr-TR', {
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  })} gr`;
}

/**
 * Telefon numarasını Türkiye standart uluslararası formatına (905xxxxxxxxx) normalize eder
 */
export function normalizePhoneNumber(phone: string): string {
  let cleaned = phone.replace(/[^0-9]/g, '');
  if (cleaned.startsWith('0')) {
    cleaned = cleaned.substring(1);
  }
  if (!cleaned.startsWith('90') && cleaned.length === 10) {
    cleaned = '90' + cleaned;
  }
  return cleaned;
}

/**
 * Müşteri için WhatsApp formatlı bakiye / ekstre metni oluşturur
 */
export function buildWhatsAppStatementUrl(
  phone: string,
  customerName: string,
  summary: CustomerBalanceSummary,
  recentRows: CustomerStatementRow[] = [],
  storeName: string = 'Kuyumcu Panel Mücevherat'
): string {
  const normalized = normalizePhoneNumber(phone);
  const dateStr = new Date().toLocaleDateString('tr-TR');

  const lines = [
    `💎 *${storeName}*`,
    `📋 *MÜŞTERİ CARİ HESAP EKSTRESİ*`,
    `📅 Tarih: ${dateStr}`,
    `👤 Müşteri: ${customerName}`,
    `--------------------------------`,
    `📊 *GÜNCEL BAKİYE DURUMU:*`,
    `• Has Altın Borcu: *${formatGoldGram(summary.hasBalance)}*`,
    `• TL Borç Bakiyesi: *${formatCurrency(summary.tlBalance, 'TL')}*`,
  ];

  if (summary.usdBalance !== 0) {
    lines.push(`• Dolar Bakiyesi: *${formatCurrency(summary.usdBalance, 'USD')}*`);
  }
  if (summary.eurBalance !== 0) {
    lines.push(`• Euro Bakiyesi: *${formatCurrency(summary.eurBalance, 'EUR')}*`);
  }

  const totTL = summary.totalConsolidatedTL || summary.estimatedTotalTL;
  const totHas = summary.totalConsolidatedHas || (summary.currentSpotRate > 0 ? totTL / summary.currentSpotRate : 0);
  lines.push(
    `--------------------------------`,
    `💰 *KONSOLİDE TOPLAM BORÇ SEÇENEKLERİ:*`,
    `• ₺ Tamamen TL İle: *${formatCurrency(totTL, 'TL')}*`,
    `• 👑 Tamamen Has Altın İle: *${formatGoldGram(totHas)}*`
  );
  if (summary.totalConsolidatedUSD) {
    lines.push(`• 💵 Tamamen Dolar ($) İle: *${formatCurrency(summary.totalConsolidatedUSD, 'USD')}*`);
  }
  if (summary.totalConsolidatedEUR) {
    lines.push(`• 💶 Tamamen Euro (€) İle: *${formatCurrency(summary.totalConsolidatedEUR, 'EUR')}*`);
  }
  lines.push(`--------------------------------`);

  if (recentRows.length > 0) {
    lines.push(`📝 *SON İŞLEM HAREKETLERİ:*`);
    const lastItems = recentRows.slice(-5);
    for (const r of lastItems) {
      const typeLabel = r.type === CUSTOMER_TRANSACTION_TYPES.BORC ? 'Borç' : 'Tahsilat';
      const rDate = r.createdAt ? new Date(r.createdAt).toLocaleDateString('tr-TR') : '';
      lines.push(`• ${rDate} [${typeLabel}] ${r.amount} ${r.assetType}${r.hasEquivalent > 0 ? ` (~${r.hasEquivalent.toFixed(3)} gr Has)` : ''}`);
    }
    lines.push(`--------------------------------`);
  }

  lines.push(`Detaylı bilgi için bizimle iletişime geçebilirsiniz. ✨`);

  const message = lines.join('\n');
  return `https://wa.me/${normalized}?text=${encodeURIComponent(message)}`;
}

