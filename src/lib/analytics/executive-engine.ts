import {
  STOCK_VELOCITY_CATEGORY,
  StockVelocityCategory,
  EXECUTIVE_DEFAULTS,
} from '@/constants/executive-analytics';
import { roundMoney, roundGrams } from '@/lib/security/validation';

export interface StockItemForAnalytics {
  id: string;
  barcode?: string | null;
  title: string;
  category?: string | null;
  carat: number;
  weight: number;
  quantity: number;
  costPrice?: number | null;
  createdAt: Date | string;
}

export interface EvaluatedStockItem extends StockItemForAnalytics {
  ageInDays: number;
  dailyRunRate: number;
  daysToStockout: number;
  velocityCategory: StockVelocityCategory;
  suggestedReorderQuantity: number;
  lockedCapitalTl: number;
}

/**
 * Stok devir hızı, bekleme yaşı (aging) ve tükenme süresini hesaplar.
 */
export function calculateStockTurnoverAndAging(
  stocks: StockItemForAnalytics[],
  salesQuantityByTitle: Record<string, number>,
  periodDays: number = EXECUTIVE_DEFAULTS.DEFAULT_PERIOD_DAYS,
  safetyStockDays: number = EXECUTIVE_DEFAULTS.DEFAULT_SAFETY_DAYS,
  leadTimeDays: number = EXECUTIVE_DEFAULTS.DEFAULT_LEAD_TIME_DAYS
): {
  evaluatedItems: EvaluatedStockItem[];
  deadStockCount: number;
  fastMovingCount: number;
  slowMovingCount: number;
  normalCount: number;
  totalDeadCapitalTl: number;
} {
  const safePeriod = Math.max(1, periodDays);
  const now = Date.now();

  let deadStockCount = 0;
  let fastMovingCount = 0;
  let slowMovingCount = 0;
  let normalCount = 0;
  let totalDeadCapitalTl = 0;

  const evaluatedItems: EvaluatedStockItem[] = stocks.map((item) => {
    // 1. Yaş hesabı (gün)
    const createdTime = new Date(item.createdAt).getTime();
    const ageInDays = Math.max(0, Math.floor((now - createdTime) / (1000 * 60 * 60 * 24)));

    // 2. Satış hızı (adet / gün)
    const totalSold = salesQuantityByTitle[item.title] || salesQuantityByTitle[item.barcode || ''] || 0;
    const dailyRunRate = Math.round((totalSold / safePeriod) * 1000) / 1000;

    // 3. Tükenme süresi (gün)
    let daysToStockout = 999;
    if (dailyRunRate > 0) {
      daysToStockout = Math.max(0, Math.ceil(item.quantity / dailyRunRate));
    } else if (item.quantity <= 0) {
      daysToStockout = 0;
    }

    // 4. Hız kategorizasyonu
    let velocityCategory: StockVelocityCategory = STOCK_VELOCITY_CATEGORY.NORMAL;
    if (ageInDays >= EXECUTIVE_DEFAULTS.DEFAULT_DEAD_STOCK_DAYS && dailyRunRate === 0) {
      velocityCategory = STOCK_VELOCITY_CATEGORY.DEAD_STOCK;
      deadStockCount++;
      totalDeadCapitalTl += (item.costPrice || 0) * Math.max(0, item.quantity);
    } else if (daysToStockout <= EXECUTIVE_DEFAULTS.FAST_MOVING_DAYS_THRESHOLD && dailyRunRate > 0) {
      velocityCategory = STOCK_VELOCITY_CATEGORY.FAST_MOVING;
      fastMovingCount++;
    } else if (daysToStockout >= EXECUTIVE_DEFAULTS.SLOW_MOVING_DAYS_THRESHOLD || dailyRunRate === 0) {
      velocityCategory = STOCK_VELOCITY_CATEGORY.SLOW_MOVING;
      slowMovingCount++;
    } else {
      velocityCategory = STOCK_VELOCITY_CATEGORY.NORMAL;
      normalCount++;
    }

    // 5. Sipariş öneri miktarı
    const targetBuffer = dailyRunRate * (leadTimeDays + safetyStockDays);
    const suggestedReorderQuantity = Math.max(0, Math.ceil(targetBuffer - item.quantity));

    return {
      ...item,
      ageInDays,
      dailyRunRate,
      daysToStockout,
      velocityCategory,
      suggestedReorderQuantity,
      lockedCapitalTl: roundMoney((item.costPrice || 0) * Math.max(0, item.quantity)),
    };
  });

  return {
    evaluatedItems,
    deadStockCount,
    fastMovingCount,
    slowMovingCount,
    normalCount,
    totalDeadCapitalTl: roundMoney(totalDeadCapitalTl),
  };
}

/**
 * Ağırlıklı Hareketli Ortalama (Weighted Moving Average) ile gelecek dönem talep tahmini yapar.
 */
export function forecastDemandWeightedMovingAverage(
  weeklySales: number[],
  weights: number[] = [0.1, 0.2, 0.3, 0.4]
): number {
  if (!weeklySales || weeklySales.length === 0) return 0;

  // Son N haftayı al
  const n = weights.length;
  const recentSales = weeklySales.slice(-n);

  if (recentSales.length < n) {
    // Veri yetersizse basit ortalama al
    const sum = recentSales.reduce((a, b) => a + b, 0);
    return Math.round((sum / Math.max(1, recentSales.length)) * 10) / 10;
  }

  // Ağırlıkları normalize et
  const totalWeight = weights.reduce((a, b) => a + b, 0);
  let weightedSum = 0;

  for (let i = 0; i < n; i++) {
    weightedSum += recentSales[i] * (weights[i] / totalWeight);
  }

  return Math.round(weightedSum * 10) / 10;
}

/**
 * Emniyet stoğu ve tedarik süresine göre akıllı sipariş öneri miktarını hesaplar.
 */
export function generateIntelligentReorderSuggestion(
  currentStock: number,
  dailyRunRate: number,
  leadTimeDays: number = EXECUTIVE_DEFAULTS.DEFAULT_LEAD_TIME_DAYS,
  safetyStockDays: number = EXECUTIVE_DEFAULTS.DEFAULT_SAFETY_DAYS
): number {
  if (dailyRunRate <= 0) return 0;
  const targetBuffer = dailyRunRate * (leadTimeDays + safetyStockDays);
  const deficit = targetBuffer - currentStock;
  return Math.max(0, Math.ceil(deficit));
}

/**
 * Kategori bazında ciro, tahmini has kârı ve TL kâr marjını hesaplar.
 */
export function calculateHasProfitabilityByCategory(
  transactions: Array<{
    type: string;
    totalAmount?: number | null;
    total?: number | null;
    hasAmount?: number | null;
    hasEquivalent?: number | null;
    description?: string | null;
    productCode?: string | null;
    orderNote?: string | null;
  }>,
  productCategories: Array<{
    name: string;
    averageMarginPercent?: number;
  }>
) {
  const categoryMap: Record<
    string,
    {
      category: string;
      totalRevenueTl: number;
      totalHasSold: number;
      estimatedHasProfit: number;
      estimatedTlProfit: number;
      marginPercent: number;
    }
  > = {};

  const defaultCategories = ['Bilezik', 'Kolye', 'Yüzük', 'Küpe', 'Sarrafiye', 'Pırlanta', 'Diğer'];

  for (const cat of defaultCategories) {
    categoryMap[cat] = {
      category: cat,
      totalRevenueTl: 0,
      totalHasSold: 0,
      estimatedHasProfit: 0,
      estimatedTlProfit: 0,
      marginPercent: 12.0,
    };
  }

  for (const tx of transactions) {
    const isSale = tx.type === 'SALE' || tx.type.toLowerCase() === 'sell';
    if (!isSale) continue;

    // Basit kategori eşleme
    let assignedCategory = 'Diğer';
    const desc = (tx.description || tx.productCode || tx.orderNote || '').toLowerCase();

    if (desc.includes('bilezik') || desc.includes('ajda')) assignedCategory = 'Bilezik';
    else if (desc.includes('kolye') || desc.includes('zincir')) assignedCategory = 'Kolye';
    else if (desc.includes('yüzük') || desc.includes('tektaş')) assignedCategory = 'Yüzük';
    else if (desc.includes('küpe')) assignedCategory = 'Küpe';
    else if (desc.includes('çeyrek') || desc.includes('yarım') || desc.includes('tam') || desc.includes('has'))
      assignedCategory = 'Sarrafiye';
    else if (desc.includes('pırlanta') || desc.includes('elmas')) assignedCategory = 'Pırlanta';

    const rev = tx.totalAmount ?? tx.total ?? 0;
    const has = tx.hasAmount ?? tx.hasEquivalent ?? 0;
    const margin = assignedCategory === 'Sarrafiye' ? 0.02 : assignedCategory === 'Pırlanta' ? 0.25 : 0.12;

    categoryMap[assignedCategory].totalRevenueTl += rev;
    categoryMap[assignedCategory].totalHasSold += has;
    categoryMap[assignedCategory].estimatedTlProfit += rev * margin;
    categoryMap[assignedCategory].estimatedHasProfit += has * margin;
  }

  return Object.values(categoryMap).map((cat) => ({
    ...cat,
    totalRevenueTl: roundMoney(cat.totalRevenueTl),
    totalHasSold: roundGrams(cat.totalHasSold),
    estimatedHasProfit: roundGrams(cat.estimatedHasProfit),
    estimatedTlProfit: roundMoney(cat.estimatedTlProfit),
    marginPercent:
      cat.totalRevenueTl > 0
        ? Math.round((cat.estimatedTlProfit / cat.totalRevenueTl) * 1000) / 10
        : cat.marginPercent,
  }));
}
