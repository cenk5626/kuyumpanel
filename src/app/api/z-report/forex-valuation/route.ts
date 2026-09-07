import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedContext } from '@/lib/security/auth-context';
import { calculateForexValuationPnL } from '@/lib/cash/forex-calculator';
import { sanitizeBody } from '@/lib/security/validation';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const ctx = await getAuthenticatedContext();
    const dealerId = ctx.dealerId;

    const rawBody = await req.json();
    const body = sanitizeBody(rawBody, [
      'sessionId',
      'currentUsdRate',
      'currentEurRate',
      'currentHasRate',
    ] as const);

    const { sessionId, currentUsdRate, currentEurRate, currentHasRate } = body;

    let session = null;
    if (sessionId) {
      session = await prisma.cashRegisterSession.findUnique({
        where: { id: sessionId },
      });
    } else {
      session = await prisma.cashRegisterSession.findFirst({
        where: { dealerId, status: 'OPEN' },
        orderBy: { openedAt: 'desc' },
      });
    }

    if (!session) {
      return NextResponse.json({ error: 'Aktif kasa oturumu bulunamadı.' }, { status: 404 });
    }

    const openUsdRate = session.openingRateUSD || Number(currentUsdRate) || 38.0;
    const openEurRate = session.openingRateEUR || Number(currentEurRate) || 41.0;
    const openHasRate = session.openingRateHAS || Number(currentHasRate) || 3200.0;

    const numCurrentUsd = Number(currentUsdRate) || openUsdRate;
    const numCurrentEur = Number(currentEurRate) || openEurRate;
    const numCurrentHas = Number(currentHasRate) || openHasRate;

    const pnlResult = calculateForexValuationPnL({
      usdAmount: session.systemCashUSD,
      openUsdRate,
      currentUsdRate: numCurrentUsd,
      eurAmount: session.systemCashEUR,
      openEurRate,
      currentEurRate: numCurrentEur,
      hasAmount: session.systemHasGram,
      openHasRate,
      currentHasRate: numCurrentHas,
    });

    const updated = await prisma.cashRegisterSession.update({
      where: { id: session.id },
      data: {
        openingRateUSD: openUsdRate,
        openingRateEUR: openEurRate,
        openingRateHAS: openHasRate,
        closingRateUSD: numCurrentUsd,
        closingRateEUR: numCurrentEur,
        closingRateHAS: numCurrentHas,
        forexGainLossTL: pnlResult.totalGainLossTL,
      },
    });

    return NextResponse.json({
      success: true,
      pnl: pnlResult,
      session: updated,
    });
  } catch (error: any) {
    if (error.statusCode === 401 || error.statusCode === 403) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error('[API Forex Valuation] POST Error:', error);
    return NextResponse.json({ error: 'Döviz değerleme kâr/zararı hesaplanamadı.' }, { status: 500 });
  }
}
