import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedContext } from '@/lib/security/auth-context';
import { analyzeStockTurnover } from '@/lib/stocks/analytics';
import { TURNOVER_PERIODS } from '@/constants/stocks';

export const dynamic = 'force-dynamic';

const LOG_PREFIX = '[API Stocks Analytics]';

/**
 * GET /api/stocks/analytics
 * Parametreler: ?days=7 | 30 | 90 (Varsayılan: 30)
 * Giriş yapan bayinin stok devir hızı, sirkülasyon kategorileri ve kritik stok özetini döner.
 */
export async function GET(req: Request) {
  try {
    const ctx = await getAuthenticatedContext();
    const dealerId = ctx.dealerId;

    const { searchParams } = new URL(req.url);
    const daysParam = parseInt(searchParams.get('days') || '30', 10);
    const periodDays = isNaN(daysParam) || daysParam <= 0 ? TURNOVER_PERIODS.DAYS_30 : daysParam;

    // Bayinin veritabanında var olduğunu garanti et
    await prisma.dealer.upsert({
      where: { id: dealerId },
      create: { id: dealerId, name: dealerId === 'merkez' ? 'Merkez Mağaza' : dealerId },
      update: {},
    });

    const [stocks, transactions] = await Promise.all([
      prisma.stock.findMany({
        where: { dealerId },
        orderBy: { type: 'asc' },
      }),
      prisma.transaction.findMany({
        where: {
          dealerId,
          type: 'sell',
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    const summary = analyzeStockTurnover(stocks, transactions, periodDays);

    return NextResponse.json(summary);
  } catch (error: any) {
    console.error(`${LOG_PREFIX} GET Error:`, error);
    return NextResponse.json(
      { error: error?.message || 'Stok analiz verileri hesaplanamadı.' },
      { status: error?.statusCode || 500 }
    );
  }
}

