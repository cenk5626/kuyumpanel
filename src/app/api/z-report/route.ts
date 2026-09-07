import { NextResponse } from 'next/server';
import { getAuthenticatedContext } from '@/lib/security/auth-context';
import { getDailyZReportSummary } from '@/lib/z-report';

export const dynamic = 'force-dynamic';

const LOG_PREFIX = '[API Z-Report]';

/**
 * GET /api/z-report — Günlük Z-Raporu özeti, aktif oturum ve geçmiş oturumları döner
 * Parametre: ?date=YYYY-MM-DD (isteğe bağlı)
 */
export async function GET(req: Request) {
  try {
    const ctx = await getAuthenticatedContext();
    const dealerId = ctx.dealerId;
    const { searchParams } = new URL(req.url);
    const dateParam = searchParams.get('date') || undefined;

    const data = await getDailyZReportSummary(dealerId, dateParam);

    return NextResponse.json(data);
  } catch (error: any) {
    console.error(`${LOG_PREFIX} GET Error:`, error);
    return NextResponse.json(
      {
        error: error?.message || 'Z-Raporu verileri getirilemedi.',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: error?.statusCode || 500 }
    );
  }
}

