import { prisma } from '@/lib/prisma';
import { getAuthenticatedContext } from '@/lib/security/auth-context';
import ExecutiveAnalyticsClient from './ExecutiveAnalyticsClient';
import {
  calculateStockTurnoverAndAging,
  calculateHasProfitabilityByCategory,
} from '@/lib/analytics/executive-engine';
import { EXECUTIVE_DEFAULTS } from '@/constants/executive-analytics';

export const dynamic = 'force-dynamic';

export default async function ExecutiveAnalyticsPage() {
  let initialData: any = {
    stats: {
      totalSalesRevenueTl: 0,
      totalSalesHasGr: 0,
      deadStockCount: 0,
      fastMovingCount: 0,
      slowMovingCount: 0,
      normalCount: 0,
      totalDeadCapitalTl: 0,
    },
    profitability: [],
    evaluatedItems: [],
    settings: {
      safetyStockDays: EXECUTIVE_DEFAULTS.DEFAULT_SAFETY_DAYS,
      leadTimeDays: EXECUTIVE_DEFAULTS.DEFAULT_LEAD_TIME_DAYS,
      analysisPeriodDays: EXECUTIVE_DEFAULTS.DEFAULT_PERIOD_DAYS,
      deadStockThresholdDays: EXECUTIVE_DEFAULTS.DEFAULT_DEAD_STOCK_DAYS,
      targetMarginPercent: EXECUTIVE_DEFAULTS.DEFAULT_TARGET_MARGIN_PERCENT,
    },
  };

  try {
    const ctx = await getAuthenticatedContext();
    const dealerId = ctx.dealerId;
    const role = ctx.role;

    const whereClause: any = {};
    if (role !== 'SUPER_ADMIN') {
      whereClause.dealerId = dealerId;
    }

    const [settings, productItems, transactions, categories] = await Promise.all([
      prisma.demandForecastSettings.findUnique({
        where: { dealerId },
      }),
      prisma.productItem.findMany({
        where: whereClause,
        select: {
          id: true,
          barcode: true,
          title: true,
          category: true,
          carat: true,
          weight: true,
          quantity: true,
          costPrice: true,
          supplierName: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 300,
      }),
      prisma.transaction.findMany({
        where: {
          ...whereClause,
          createdAt: { gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) },
        },
        select: {
          type: true,
          productCode: true,
          quantity: true,
          total: true,
          hasEquivalent: true,
          orderNote: true,
          createdAt: true,
        },
      }),
      prisma.category.findMany({
        where: whereClause,
        select: { name: true },
      }),
    ]);

    // Satış miktarlarını ürün koduna / başlığına göre agrege et
    const salesByTitle: Record<string, number> = {};
    for (const tx of transactions) {
      if (tx.type.toLowerCase() === 'sell' || tx.type === 'SALE') {
        const key = tx.productCode || tx.orderNote || 'Genel';
        salesByTitle[key] = (salesByTitle[key] || 0) + (tx.quantity || 1);
      }
    }

    const itemsForAnalysis = productItems.map((p: any) => ({
      id: p.id,
      barcode: p.barcode,
      title: p.title || p.category || 'Ürün',
      category: p.category,
      carat: p.carat,
      weight: p.weight,
      quantity: p.quantity,
      costPrice: p.costPrice || 0,
      supplierName: p.supplierName,
      createdAt: p.createdAt ? (p.createdAt instanceof Date ? p.createdAt.toISOString() : new Date(p.createdAt).toISOString()) : new Date().toISOString(),
    }));

    const periodDays = settings?.analysisPeriodDays ?? EXECUTIVE_DEFAULTS.DEFAULT_PERIOD_DAYS;
    const safetyStockDays = settings?.safetyStockDays ?? EXECUTIVE_DEFAULTS.DEFAULT_SAFETY_DAYS;
    const leadTimeDays = settings?.leadTimeDays ?? EXECUTIVE_DEFAULTS.DEFAULT_LEAD_TIME_DAYS;

    const turnoverResult = calculateStockTurnoverAndAging(
      itemsForAnalysis,
      salesByTitle,
      periodDays,
      safetyStockDays,
      leadTimeDays
    );

    const profitability = calculateHasProfitabilityByCategory(
      transactions,
      categories.map((c) => ({ name: c.name }))
    );

    const totalSalesRevenueTl = transactions
      .filter((t) => t.type.toLowerCase() === 'sell' || t.type === 'SALE')
      .reduce((acc, t) => acc + (t.total || 0), 0);
    const totalSalesHasGr = transactions
      .filter((t) => t.type.toLowerCase() === 'sell' || t.type === 'SALE')
      .reduce((acc, t) => acc + (t.hasEquivalent || 0), 0);

    initialData = {
      stats: {
        totalSalesRevenueTl: Math.round(totalSalesRevenueTl),
        totalSalesHasGr: Math.round(totalSalesHasGr * 100) / 100,
        deadStockCount: turnoverResult.deadStockCount,
        fastMovingCount: turnoverResult.fastMovingCount,
        slowMovingCount: turnoverResult.slowMovingCount,
        normalCount: turnoverResult.normalCount,
        totalDeadCapitalTl: turnoverResult.totalDeadCapitalTl,
      },
      profitability,
      evaluatedItems: turnoverResult.evaluatedItems,
      settings: settings || {
        safetyStockDays,
        leadTimeDays,
        analysisPeriodDays: periodDays,
        deadStockThresholdDays: EXECUTIVE_DEFAULTS.DEFAULT_DEAD_STOCK_DAYS,
        targetMarginPercent: EXECUTIVE_DEFAULTS.DEFAULT_TARGET_MARGIN_PERCENT,
      },
    };
  } catch (error) {
    console.error('Executive Analytics Page Server Hatası:', error);
  }

  return <ExecutiveAnalyticsClient initialData={initialData} />;
}
