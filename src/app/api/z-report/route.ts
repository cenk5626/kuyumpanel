import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getDailyZReportSummary } from '@/lib/z-report';

const LOG_PREFIX = '[API Z-Report]';

/**
 * GET /api/z-report — Günlük Z-Raporu özeti, aktif oturum ve geçmiş oturumları döner
 * Parametre: ?date=YYYY-MM-DD (isteğe bağlı)
 */
export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const dealerId = (session.user as any).dealerId || 'merkez';
    const { searchParams } = new URL(req.url);
    const dateParam = searchParams.get('date') || undefined;

    const data = await getDailyZReportSummary(dealerId, dateParam);

    return NextResponse.json(data);
  } catch (error) {
    console.error(`${LOG_PREFIX} GET Error:`, error);
    return NextResponse.json(
      {
        error: 'Z-Raporu verileri getirilemedi.',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
