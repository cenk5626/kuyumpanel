/**
 * Kâr / Zarar Hesaplama Motoru (Profit & Loss Engine)
 * Alış / Satış / Hurda / Ziynet ve Takı İşlemleri için Birim Maliyet, Net Kâr ve Kâr Marjı Hesaplama
 * Sıfır Magic Number / String Kuralına Uygun
 */

export interface ProfitLossResult {
  costPrice: number; // Birim maliyet (TL)
  totalCost: number; // Toplam maliyet (TL)
  sellingPrice: number; // Birim satış fiyatı (TL)
  totalRevenue: number; // Toplam hasılat (TL)
  profitAmount: number; // Net kâr/zarar tutarı (TL) (+ Kâr, - Zarar)
  profitMargin: number; // Kâr marjı yüzdesi (%)
  isProfitable: boolean;
}

export interface ProfitLossSummary {
  totalRevenue: number;
  totalCost: number;
  totalProfit: number;
  averageMargin: number;
  profitableTransactionsCount: number;
  unprofitableTransactionsCount: number;
  totalTransactionsCount: number;
}

/**
 * Tekil işlem için kâr/zarar metriklerini hesaplar.
 * @param type "sell" (biz satıyoruz) | "buy" (biz alıyoruz)
 * @param quantity İşlem miktarı
 * @param unitPrice Gerçekleşen birim fiyat (TL)
 * @param marketBidPrice Anlık piyasa alış fiyatı (Bizim maliyet referansımız)
 * @param manualCostPrice Varsa ürünün özel maliyet fiyatı
 */
export function calculateTransactionProfitLoss(
  type: string,
  quantity: number,
  unitPrice: number,
  marketBidPrice: number,
  manualCostPrice?: number | null
): ProfitLossResult {
  const isSell = type === 'sell' || type === 'SELL';
  const effectiveCostPrice = manualCostPrice != null && manualCostPrice > 0 ? manualCostPrice : marketBidPrice;

  const totalRevenue = isSell ? Number((quantity * unitPrice).toFixed(2)) : 0;
  const totalCost = isSell ? Number((quantity * effectiveCostPrice).toFixed(2)) : Number((quantity * unitPrice).toFixed(2));

  let profitAmount = 0;
  let profitMargin = 0;

  if (isSell) {
    profitAmount = Number((totalRevenue - totalCost).toFixed(2));
    profitMargin = totalCost > 0 ? Number(((profitAmount / totalCost) * 100).toFixed(2)) : 0;
  } else {
    // Alış işleminde piyasa değerine göre potansiyel kâr (Piyasa satış veya alış referansına göre)
    // Eğer piyasa alışından daha ucuza aldıysak anlık kâr hanesi oluşur
    const potentialValue = Number((quantity * marketBidPrice).toFixed(2));
    profitAmount = Number((potentialValue - totalCost).toFixed(2));
    profitMargin = totalCost > 0 ? Number(((profitAmount / totalCost) * 100).toFixed(2)) : 0;
  }

  return {
    costPrice: Number(effectiveCostPrice.toFixed(2)),
    totalCost,
    sellingPrice: Number(unitPrice.toFixed(2)),
    totalRevenue,
    profitAmount,
    profitMargin,
    isProfitable: profitAmount >= 0,
  };
}

/**
 * İşlem listesi üzerinden toplam kâr/zarar özetini konsolide eder (Z-Raporu & Dashboard için).
 */
export function aggregateProfitLossSummary(
  transactions: Array<{
    type: string;
    quantity: number;
    price: number;
    total: number;
    costPrice?: number | null;
    profitAmount?: number | null;
    profitMargin?: number | null;
  }>
): ProfitLossSummary {
  let totalRevenue = 0;
  let totalCost = 0;
  let totalProfit = 0;
  let profitableCount = 0;
  let unprofitableCount = 0;
  let validMarginSum = 0;
  let validMarginCount = 0;

  for (const tx of transactions) {
    const isSell = tx.type === 'sell' || tx.type === 'SELL';
    if (!isSell) continue; // Hasılat ve kâr satış işlemlerinden konsolide edilir

    const revenue = tx.total || tx.quantity * tx.price;
    const profit = tx.profitAmount != null ? tx.profitAmount : (tx.costPrice ? (tx.price - tx.costPrice) * tx.quantity : 0);
    const cost = revenue - profit;

    totalRevenue += revenue;
    totalCost += cost;
    totalProfit += profit;

    if (profit >= 0) {
      profitableCount++;
    } else {
      unprofitableCount++;
    }

    if (tx.profitMargin != null) {
      validMarginSum += tx.profitMargin;
      validMarginCount++;
    } else if (cost > 0) {
      validMarginSum += (profit / cost) * 100;
      validMarginCount++;
    }
  }

  const averageMargin = validMarginCount > 0 ? Number((validMarginSum / validMarginCount).toFixed(2)) : 0;

  return {
    totalRevenue: Number(totalRevenue.toFixed(2)),
    totalCost: Number(totalCost.toFixed(2)),
    totalProfit: Number(totalProfit.toFixed(2)),
    averageMargin,
    profitableTransactionsCount: profitableCount,
    unprofitableTransactionsCount: unprofitableCount,
    totalTransactionsCount: profitableCount + unprofitableCount,
  };
}
