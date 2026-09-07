import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedContext } from '@/lib/security/auth-context';
import {
  calculateStockTurnoverAndAging,
  calculateHasProfitabilityByCategory,
} from '@/lib/analytics/executive-engine';
import { EXECUTIVE_DEFAULTS } from '@/constants/executive-analytics';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const ctx = await getAuthenticatedContext();
    const dealerId = ctx.dealerId;

    const { searchParams } = new URL(request.url);
    const periodDays = parseInt(searchParams.get('periodDays') || '90', 10);

    const startDate = new Date(Date.now() - periodDays * 24 * 60 * 60 * 1000);

    const [settings, stocks, productItems, transactions, categories] = await Promise.all([
      prisma.demandForecastSettings.findUnique({
        where: { dealerId },
      }),
      prisma.stock.findMany({
        where: { dealerId },
        select: {
          id: true,
          product: true,
          label: true,
          amount: true,
          type: true,
        },
      }),
      prisma.productItem.findMany({
        where: { dealerId },
        select: {
          id: true,
          barcode: true,
          title: true,
          category: true,
          carat: true,
          weight: true,
          quantity: true,
          costPrice: true,
          createdAt: true,
        },
      }),
      prisma.transaction.findMany({
        where: {
          dealerId,
          createdAt: { gte: startDate },
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
        where: { dealerId },
        select: { name: true },
      }),
    ]);

    // Satış miktarlarını ürün başlığına / koduna göre agrege et
    const salesByTitle: Record<string, number> = {};
    for (const tx of transactions) {
      if (tx.type.toLowerCase() === 'sell' || tx.type === 'SALE') {
        const key = tx.productCode || tx.orderNote || 'Genel';
        salesByTitle[key] = (salesByTitle[key] || 0) + (tx.quantity || 1);
      }
    }

    // Stok analizi
    const itemsForAnalysis = productItems.map((p) => ({
      id: p.id,
      barcode: p.barcode,
      title: p.title || p.category || 'Ürün',
      category: p.category,
      carat: p.carat,
      weight: p.weight,
      quantity: p.quantity,
      costPrice: p.costPrice || 0,
      createdAt: p.createdAt,
    }));

    const turnoverResult = calculateStockTurnoverAndAging(
      itemsForAnalysis,
      salesByTitle,
      periodDays,
      settings?.safetyStockDays ?? EXECUTIVE_DEFAULTS.DEFAULT_SAFETY_DAYS,
      settings?.leadTimeDays ?? EXECUTIVE_DEFAULTS.DEFAULT_LEAD_TIME_DAYS
    );

    // Kategori bazlı has kârlılığı
    const profitability = calculateHasProfitabilityByCategory(
      transactions,
      categories.map((c) => ({ name: c.name }))
    );

    // Toplam ciro ve has satışları
    const totalSalesRevenueTl = transactions
      .filter((t) => t.type.toLowerCase() === 'sell' || t.type === 'SALE')
      .reduce((acc, t) => acc + (t.total || 0), 0);
    const totalSalesHasGr = transactions
      .filter((t) => t.type.toLowerCase() === 'sell' || t.type === 'SALE')
      .reduce((acc, t) => acc + (t.hasEquivalent || 0), 0);

    return NextResponse.json({
      success: true,
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
      topFastMoving: turnoverResult.evaluatedItems
        .filter((i) => i.velocityCategory === 'FAST_MOVING')
        .slice(0, 10),
      topDeadStock: turnoverResult.evaluatedItems
        .filter((i) => i.velocityCategory === 'DEAD_STOCK')
        .slice(0, 10),
      settings: settings || {
        safetyStockDays: EXECUTIVE_DEFAULTS.DEFAULT_SAFETY_DAYS,
        leadTimeDays: EXECUTIVE_DEFAULTS.DEFAULT_LEAD_TIME_DAYS,
        analysisPeriodDays: EXECUTIVE_DEFAULTS.DEFAULT_PERIOD_DAYS,
        deadStockThresholdDays: EXECUTIVE_DEFAULTS.DEFAULT_DEAD_STOCK_DAYS,
        targetMarginPercent: EXECUTIVE_DEFAULTS.DEFAULT_TARGET_MARGIN_PERCENT,
      },
    });
  } catch (error: any) {
    console.error('Executive Analytics GET Hatası:', error);
    return NextResponse.json({ error: error.message || 'Yönetici analitiği yüklenemedi.' }, { status: 500 });
  }
}
