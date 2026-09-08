import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedContext } from '@/lib/security/auth-context';
import { calculatePosSettlement } from '@/lib/banking/banking-engine';
import { BANKING_MESSAGES } from '@/constants/banking';

export const dynamic = 'force-dynamic';

/**
 * GET /api/banking/settlements
 * POS gün sonu ve takas mutabakat kayıtlarını listeler.
 */
export async function GET() {
  try {
    const ctx = await getAuthenticatedContext();
    const dealerId = ctx.dealerId;

    const settlements = await prisma.posSettlement.findMany({
      where: { dealerId },
      include: {
        posTerminal: {
          select: { name: true, terminalId: true, bankAccount: { select: { bankName: true, iban: true } } },
        },
      },
      orderBy: { settlementDate: 'desc' },
      take: 100,
    });

    return NextResponse.json({ success: true, settlements });
  } catch (error: any) {
    console.error('[API POS Settlements GET Error]:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Takas kayıtları listelenemedi' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/banking/settlements
 * Günlük POS cirosundan komisyon ve valör hesabı yaparak takas kaydı oluşturur.
 */
export async function POST(request: NextRequest) {
  try {
    const ctx = await getAuthenticatedContext();
    const dealerId = ctx.dealerId;

    const body = await request.json();
    const { posTerminalId, grossAmount, settlementDate = new Date() } = body;

    if (!posTerminalId || !grossAmount) {
      return NextResponse.json(
        { success: false, error: 'POS terminali ve brüt çekim tutarı zorunludur' },
        { status: 400 }
      );
    }

    const pos = await prisma.posTerminal.findFirst({
      where: { id: posTerminalId, dealerId },
    });

    if (!pos) {
      return NextResponse.json(
        { success: false, error: 'POS terminali bulunamadı' },
        { status: 404 }
      );
    }

    const calc = calculatePosSettlement(
      Number(grossAmount),
      pos.commissionRate,
      pos.blockingDays,
      settlementDate
    );

    const settlement = await prisma.posSettlement.create({
      data: {
        dealerId,
        posTerminalId,
        settlementDate: new Date(settlementDate),
        maturityDate: calc.maturityDate,
        grossAmount: calc.grossAmount,
        commissionAmount: calc.commissionAmount,
        netAmount: calc.netAmount,
        status: calc.status,
      },
    });

    return NextResponse.json({
      success: true,
      settlement,
      message: BANKING_MESSAGES.SETTLEMENT_CALCULATED,
    });
  } catch (error: any) {
    console.error('[API POS Settlements POST Error]:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Takas kaydı oluşturulamadı' },
      { status: 500 }
    );
  }
}
