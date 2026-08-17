import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { generateReorderDraft, calculateDailyVelocity } from '@/lib/stocks/analytics';
import { TURNOVER_PERIODS } from '@/constants/stocks';

const LOG_PREFIX = '[API Stocks Reorder]';

/**
 * GET /api/stocks/reorder
 * Minimum eşik altındaki ürünler için önerilen tedarik ve sipariş taslağını döner.
 */
export async function GET() {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const dealerId = (session.user as any).dealerId || 'merkez';

    await prisma.dealer.upsert({
      where: { id: dealerId },
      create: { id: dealerId, name: dealerId === 'merkez' ? 'Merkez Mağaza' : dealerId },
      update: {},
    });

    const [stocks, recentTransactions, suppliers] = await Promise.all([
      prisma.stock.findMany({
        where: { dealerId },
      }),
      prisma.transaction.findMany({
        where: {
          dealerId,
          type: 'sell',
        },
      }),
      prisma.supplier.findMany({
        where: { dealerId },
      }),
    ]);

    // Son 30 günlük satış hızlarını hesapla
    const salesMap = new Map<string, number>();
    const periodDays = TURNOVER_PERIODS.DAYS_30;
    const now = new Date();
    const periodStartDate = new Date(now.getTime() - periodDays * 24 * 60 * 60 * 1000);

    recentTransactions.forEach((tx) => {
      if (new Date(tx.createdAt) >= periodStartDate) {
        const cur = salesMap.get(tx.productCode) || 0;
        salesMap.set(tx.productCode, cur + tx.quantity);
      }
    });

    const velocityMap = new Map<string, number>();
    salesMap.forEach((qty, code) => {
      velocityMap.set(code, calculateDailyVelocity(qty, periodDays));
    });

    // Tedarikçi telefon haritası
    const supplierPhoneMap = new Map<string, string>();
    suppliers.forEach((s) => {
      if (s.name && s.phone) {
        supplierPhoneMap.set(s.name, s.phone);
      }
    });

    const enrichedStocks = stocks.map((s) => ({
      id: s.id,
      product: s.product,
      label: s.label,
      type: s.type,
      amount: s.amount,
      minThreshold: s.minThreshold,
      supplierName: 'Darphane / Toptancı',
      supplierPhone: supplierPhoneMap.get('Darphane / Toptancı') || null,
    }));

    const draftItems = generateReorderDraft(enrichedStocks, {
      dailyVelocityMap: velocityMap,
    });

    return NextResponse.json({
      totalItems: draftItems.length,
      items: draftItems,
    });
  } catch (error) {
    console.error(`${LOG_PREFIX} GET Error:`, error);
    return NextResponse.json(
      { error: 'Sipariş taslağı oluşturulamadı.' },
      { status: 500 }
    );
  }
}
