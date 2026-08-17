/**
 * Stok Devir Hızı (Sirkülasyon) ve Kritik Stok Analiz Motoru
 * Sıfır Magic Number / String Kuralına Uygun Matematiksel Hesaplamalar
 */

import {
  DEFAULT_MIN_STOCK_THRESHOLD,
  STOCK_THRESHOLDS,
  TURNOVER_CATEGORIES,
  TURNOVER_STATUS,
  TURNOVER_PERIODS,
  STOCK_ALERT_LEVELS,
  REORDER_DEFAULTS,
  type TurnoverCategory,
  type TurnoverPeriod,
  type StockAlertLevel,
} from '@/constants/stocks';

// ─── Tipler ───────────────────────────────────────────────────────────────────

export interface StockTurnoverItem {
  id: string;
  product: string;
  label: string;
  type: string;
  currentAmount: number;
  minThreshold: number;
  salesQuantity: number;
  periodDays: number;
  dailyVelocity: number;
  daysToStockout: number;
  category: TurnoverCategory;
  alertLevel: StockAlertLevel;
  supplierName?: string | null;
}

export interface TurnoverAnalyticsSummary {
  periodDays: number;
  totalProducts: number;
  totalCriticalCount: number;
  totalWarningCount: number;
  totalSafeCount: number;
  categoryCounts: {
    [TURNOVER_CATEGORIES.HIZLI]: number;
    [TURNOVER_CATEGORIES.NORMAL]: number;
    [TURNOVER_CATEGORIES.YAVAS]: number;
    [TURNOVER_CATEGORIES.HAREKETSIZ]: number;
  };
  fastMovers: StockTurnoverItem[];
  deadStock: StockTurnoverItem[];
  criticalItems: StockTurnoverItem[];
  items: StockTurnoverItem[];
}

export interface ReorderDraftItem {
  id: string;
  productCode: string;
  label: string;
  type: string;
  currentAmount: number;
  minThreshold: number;
  suggestedQuantity: number;
  dailyVelocity: number;
  daysToStockout: number;
  supplierName: string;
  supplierPhone?: string | null;
  estimatedHasWeight?: number;
  unit: string;
}

// ─── Saf Hesaplama Fonksiyonları ──────────────────────────────────────────────

/**
 * Günlük satış hızını hesaplar: V_daily = Q_sold / P_days
 */
export function calculateDailyVelocity(soldQuantity: number, periodDays: number): number {
  const safeDays = Math.max(1, periodDays);
  const velocity = soldQuantity / safeDays;
  return Number(velocity.toFixed(3));
}

/**
 * Tahmini stok tükenme süresini hesaplar: D_out = CurrentStock / V_daily
 */
export function calculateDaysToStockout(currentStock: number, dailyVelocity: number): number {
  if (dailyVelocity <= 0) {
    return Infinity;
  }
  if (currentStock <= 0) {
    return 0;
  }
  const days = currentStock / dailyVelocity;
  return Number(days.toFixed(1));
}

/**
 * Günlük hız ve tahmini tükenme gününe göre devir kategorisini sınıflandırır.
 */
export function determineTurnoverCategory(
  dailyVelocity: number,
  daysToStockout?: number
): TurnoverCategory {
  if (dailyVelocity <= 0) {
    return TURNOVER_CATEGORIES.HAREKETSIZ;
  }
  if (dailyVelocity >= 1.0 || (daysToStockout !== undefined && daysToStockout <= 14)) {
    return TURNOVER_CATEGORIES.HIZLI;
  }
  if (daysToStockout !== undefined && daysToStockout <= 45) {
    return TURNOVER_CATEGORIES.NORMAL;
  }
  if (dailyVelocity >= 0.2) {
    return TURNOVER_CATEGORIES.NORMAL;
  }
  return TURNOVER_CATEGORIES.YAVAS;
}

/**
 * Stok miktarı ve eşik değerine göre uyarı seviyesini belirler.
 */
export function determineStockAlertLevel(
  currentAmount: number,
  minThreshold: number = DEFAULT_MIN_STOCK_THRESHOLD
): StockAlertLevel {
  if (currentAmount <= minThreshold) {
    return STOCK_ALERT_LEVELS.CRITICAL;
  }
  if (currentAmount <= minThreshold * STOCK_THRESHOLDS.WARNING_MULTIPLIER) {
    return STOCK_ALERT_LEVELS.WARNING;
  }
  return STOCK_ALERT_LEVELS.SAFE;
}

/**
 * Test ve harici motor uyumluluğu için tekil devir metriği hesaplar.
 */
export function calculateTurnoverMetric(
  productCode: string,
  label: string,
  currentAmount: number,
  salesQuantity: number,
  periodDays: number = TURNOVER_PERIODS.DAYS_30
): {
  productCode: string;
  label: string;
  currentAmount: number;
  salesQuantity: number;
  periodDays: number;
  dailyVelocity: number;
  daysToStockout: number;
  speed: TurnoverCategory;
} {
  const dailyVelocity = calculateDailyVelocity(salesQuantity, periodDays);
  const daysToStockout = calculateDaysToStockout(currentAmount, dailyVelocity);
  const speed = determineTurnoverCategory(dailyVelocity, daysToStockout);

  return {
    productCode,
    label,
    currentAmount,
    salesQuantity,
    periodDays,
    dailyVelocity,
    daysToStockout,
    speed,
  };
}

/**
 * Önerilen ikmal / sipariş miktarını hesaplar.
 * Formül: TargetStock = minThreshold * 2; Deficit = TargetStock - CurrentStock
 * Eğer günlük satış hızı yüksekse emniyet tamponu eklenir.
 */
export function calculateSuggestedReorderQuantity(
  currentAmount: number,
  minThreshold: number = DEFAULT_MIN_STOCK_THRESHOLD,
  dailyVelocity: number = 0,
  leadTimeDays: number = REORDER_DEFAULTS.DEFAULT_LEAD_TIME_DAYS
): number {
  const baseTarget = minThreshold * 2;
  const velocityBuffer = dailyVelocity > 0 ? Math.ceil(dailyVelocity * leadTimeDays) : 0;
  const targetStock = Math.max(baseTarget, minThreshold + velocityBuffer);
  const suggested = targetStock - currentAmount;
  return Math.max(1, suggested);
}

// ─── Çoklu Stok ve İşlem Analizi ─────────────────────────────────────────────

export interface RawStockItem {
  id?: string;
  product: string;
  label: string;
  type: string;
  amount: number;
  minThreshold?: number | null;
  supplierName?: string | null;
}

export interface RawTransactionItem {
  type: string; // "sell" | "buy"
  productCode: string;
  quantity: number;
  createdAt: string | Date;
}

/**
 * Verilen stok ve işlem listesi üzerinden devir hızı özetini oluşturur.
 */
export function analyzeStockTurnover(
  stocks: RawStockItem[],
  transactions: RawTransactionItem[],
  periodDays: number = TURNOVER_PERIODS.DAYS_30
): TurnoverAnalyticsSummary {
  const now = new Date();
  const periodStartDate = new Date(now.getTime() - periodDays * 24 * 60 * 60 * 1000);

  // Satış işlemlerini ürün koduna göre topla
  const salesMap = new Map<string, number>();
  transactions.forEach((tx) => {
    if (tx.type === 'sell' || tx.type === 'SELL') {
      const txDate = new Date(tx.createdAt);
      if (txDate >= periodStartDate) {
        const currentTotal = salesMap.get(tx.productCode) || 0;
        salesMap.set(tx.productCode, currentTotal + tx.quantity);
      }
    }
  });

  const categoryCounts = {
    [TURNOVER_CATEGORIES.HIZLI]: 0,
    [TURNOVER_CATEGORIES.NORMAL]: 0,
    [TURNOVER_CATEGORIES.YAVAS]: 0,
    [TURNOVER_CATEGORIES.HAREKETSIZ]: 0,
  };

  let totalCriticalCount = 0;
  let totalWarningCount = 0;
  let totalSafeCount = 0;

  const items: StockTurnoverItem[] = stocks.map((s) => {
    const minThreshold = s.minThreshold != null ? s.minThreshold : DEFAULT_MIN_STOCK_THRESHOLD;
    const salesQty = salesMap.get(s.product) || 0;
    const dailyVelocity = calculateDailyVelocity(salesQty, periodDays);
    const daysToStockout = calculateDaysToStockout(s.amount, dailyVelocity);
    const category = determineTurnoverCategory(dailyVelocity, daysToStockout);
    const alertLevel = determineStockAlertLevel(s.amount, minThreshold);

    categoryCounts[category]++;
    if (alertLevel === STOCK_ALERT_LEVELS.CRITICAL) totalCriticalCount++;
    else if (alertLevel === STOCK_ALERT_LEVELS.WARNING) totalWarningCount++;
    else totalSafeCount++;

    return {
      id: s.id || s.product,
      product: s.product,
      label: s.label,
      type: s.type,
      currentAmount: s.amount,
      minThreshold,
      salesQuantity: salesQty,
      periodDays,
      dailyVelocity,
      daysToStockout,
      category,
      alertLevel,
      supplierName: s.supplierName,
    };
  });

  const fastMovers = items.filter((i) => i.category === TURNOVER_CATEGORIES.HIZLI);
  const deadStock = items.filter((i) => i.category === TURNOVER_CATEGORIES.HAREKETSIZ);
  const criticalItems = items.filter((i) => i.alertLevel === STOCK_ALERT_LEVELS.CRITICAL);

  return {
    periodDays,
    totalProducts: items.length,
    totalCriticalCount,
    totalWarningCount,
    totalSafeCount,
    categoryCounts,
    fastMovers,
    deadStock,
    criticalItems,
    items,
  };
}

/**
 * Kritik seviyedeki ürünler için otomatik ikmal / sipariş taslağı listesi üretir.
 */
export function generateReorderDraft(
  stocks: Array<{
    id?: string;
    product: string;
    label: string;
    type?: string;
    amount: number;
    minThreshold?: number | null;
    supplierName?: string | null;
    supplierPhone?: string | null;
  }>,
  options?: {
    dailyVelocityMap?: Map<string, number>;
    leadTimeDays?: number;
  }
): ReorderDraftItem[] {
  const draft: ReorderDraftItem[] = [];

  for (const s of stocks) {
    const minThreshold = s.minThreshold != null ? s.minThreshold : DEFAULT_MIN_STOCK_THRESHOLD;
    if (s.amount <= minThreshold) {
      const dailyVelocity = options?.dailyVelocityMap?.get(s.product) || 0;
      const suggestedQuantity = calculateSuggestedReorderQuantity(
        s.amount,
        minThreshold,
        dailyVelocity,
        options?.leadTimeDays || REORDER_DEFAULTS.DEFAULT_LEAD_TIME_DAYS
      );
      const daysToStockout = calculateDaysToStockout(s.amount, dailyVelocity);
      const unit = s.type === 'döviz' ? 'Birim' : s.product.includes('Ayar') ? 'Gram' : 'Adet';

      draft.push({
        id: s.id || s.product,
        productCode: s.product,
        label: s.label,
        type: s.type || 'sarrafiye',
        currentAmount: s.amount,
        minThreshold,
        suggestedQuantity,
        dailyVelocity,
        daysToStockout,
        supplierName: s.supplierName || 'Genel Tedarikçi',
        supplierPhone: s.supplierPhone || null,
        unit,
      });
    }
  }

  return draft;
}
