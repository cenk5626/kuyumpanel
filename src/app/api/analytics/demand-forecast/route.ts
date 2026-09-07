import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedContext } from '@/lib/security/auth-context';
import {
  calculateStockTurnoverAndAging,
  generateIntelligentReorderSuggestion,
} from '@/lib/analytics/executive-engine';
import { EXECUTIVE_DEFAULTS } from '@/constants/executive-analytics';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const ctx = await getAuthenticatedContext();
    const dealerId = ctx.dealerId;

    const [settings, productItems, transactions, defaultSupplier] = await Promise.all([
      prisma.demandForecastSettings.findUnique({
        where: { dealerId },
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
          supplierName: true,
          createdAt: true,
        },
      }),
      prisma.transaction.findMany({
        where: {
          dealerId,
          createdAt: { gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) },
        },
        select: {
          type: true,
          productCode: true,
          quantity: true,
          orderNote: true,
          createdAt: true,
        },
      }),
      prisma.supplier.findFirst({
        where: { dealerId },
        select: { id: true, name: true },
      }),
    ]);

    const periodDays = settings?.analysisPeriodDays ?? EXECUTIVE_DEFAULTS.DEFAULT_PERIOD_DAYS;
    const safetyStockDays = settings?.safetyStockDays ?? EXECUTIVE_DEFAULTS.DEFAULT_SAFETY_DAYS;
    const leadTimeDays = settings?.leadTimeDays ?? EXECUTIVE_DEFAULTS.DEFAULT_LEAD_TIME_DAYS;

    // Satış miktarlarını ürün koduna / başlığına göre agrege et
    const salesByTitle: Record<string, number> = {};
    for (const tx of transactions) {
      if (tx.type.toLowerCase() === 'sell' || tx.type === 'SALE') {
        const key = tx.productCode || tx.orderNote || 'Genel';
        salesByTitle[key] = (salesByTitle[key] || 0) + (tx.quantity || 1);
      }
    }

    const itemsForAnalysis = productItems.map((p) => ({
      id: p.id,
      barcode: p.barcode,
      title: p.title || p.category || 'Ürün',
      category: p.category,
      carat: p.carat,
      weight: p.weight,
      quantity: p.quantity,
      costPrice: p.costPrice || 0,
      supplierName: p.supplierName,
      createdAt: p.createdAt,
    }));

    const turnoverResult = calculateStockTurnoverAndAging(
      itemsForAnalysis,
      salesByTitle,
      periodDays,
      safetyStockDays,
      leadTimeDays
    );

    // Yalnızca sipariş verilmesi gerekenler (tükenme riski veya önerilen adet > 0)
    const itemsNeedingReorder = turnoverResult.evaluatedItems.filter(
      (item) => item.suggestedReorderQuantity > 0 || item.velocityCategory === 'FAST_MOVING'
    );

    // Otomatik Tedarik Siparişi Taslağı
    const purchaseOrderDraft = {
      orderNumber: `PO-AUTO-${new Date().getFullYear()}`,
      supplierName: defaultSupplier?.name || 'Ana Toptancı',
      totalEstimatedItems: itemsNeedingReorder.reduce((acc, it) => acc + it.suggestedReorderQuantity, 0),
      lines: itemsNeedingReorder.map((it) => ({
        productTitle: it.title,
        barcode: it.barcode,
        carat: it.carat,
        currentStock: it.quantity,
        dailyRunRate: it.dailyRunRate,
        daysToStockout: it.daysToStockout,
        suggestedQuantity: Math.max(1, it.suggestedReorderQuantity),
        estimatedUnitCost: it.costPrice || 0,
      })),
    };

    return NextResponse.json({
      success: true,
      itemsNeedingReorder,
      purchaseOrderDraft,
      parameters: {
        periodDays,
        safetyStockDays,
        leadTimeDays,
      },
    });
  } catch (error: any) {
    console.error('Demand Forecast GET Hatası:', error);
    return NextResponse.json({ error: error.message || 'Talep tahmini yüklenemedi.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const ctx = await getAuthenticatedContext();
    const dealerId = ctx.dealerId;

    const body = await request.json();
    const {
      safetyStockDays = EXECUTIVE_DEFAULTS.DEFAULT_SAFETY_DAYS,
      leadTimeDays = EXECUTIVE_DEFAULTS.DEFAULT_LEAD_TIME_DAYS,
      analysisPeriodDays = EXECUTIVE_DEFAULTS.DEFAULT_PERIOD_DAYS,
      deadStockThresholdDays = EXECUTIVE_DEFAULTS.DEFAULT_DEAD_STOCK_DAYS,
      targetMarginPercent = EXECUTIVE_DEFAULTS.DEFAULT_TARGET_MARGIN_PERCENT,
    } = body;

    const settings = await prisma.demandForecastSettings.upsert({
      where: { dealerId },
      update: {
        safetyStockDays: parseInt(safetyStockDays, 10),
        leadTimeDays: parseInt(leadTimeDays, 10),
        analysisPeriodDays: parseInt(analysisPeriodDays, 10),
        deadStockThresholdDays: parseInt(deadStockThresholdDays, 10),
        targetMarginPercent: parseFloat(targetMarginPercent),
      },
      create: {
        dealerId,
        safetyStockDays: parseInt(safetyStockDays, 10),
        leadTimeDays: parseInt(leadTimeDays, 10),
        analysisPeriodDays: parseInt(analysisPeriodDays, 10),
        deadStockThresholdDays: parseInt(deadStockThresholdDays, 10),
        targetMarginPercent: parseFloat(targetMarginPercent),
      },
    });

    return NextResponse.json({ success: true, settings });
  } catch (error: any) {
    console.error('Demand Forecast POST Hatası:', error);
    return NextResponse.json({ error: error.message || 'Ayarlar güncellenemedi.' }, { status: 500 });
  }
}
