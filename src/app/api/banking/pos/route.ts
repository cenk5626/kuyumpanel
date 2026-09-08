import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedContext } from '@/lib/security/auth-context';
import { BANKING_DEFAULTS, BANKING_MESSAGES } from '@/constants/banking';

export const dynamic = 'force-dynamic';

/**
 * GET /api/banking/pos
 * Bayiye ait POS terminallerini listeler.
 */
export async function GET() {
  try {
    const ctx = await getAuthenticatedContext();
    const dealerId = ctx.dealerId;

    const posTerminals = await prisma.posTerminal.findMany({
      where: { dealerId },
      include: {
        bankAccount: {
          select: { id: true, bankName: true, accountName: true, iban: true },
        },
        _count: {
          select: { settlements: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    return NextResponse.json({ success: true, posTerminals });
  } catch (error: any) {
    console.error('[API POS GET Error]:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'POS terminalleri listelenemedi' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/banking/pos
 * Yeni bir POS cihazı veya sanal POS tanımlar.
 */
export async function POST(request: NextRequest) {
  try {
    const ctx = await getAuthenticatedContext();
    const dealerId = ctx.dealerId;

    const body = await request.json();
    const {
      name,
      terminalId,
      merchantId,
      bankAccountId,
      commissionRate = BANKING_DEFAULTS.DEFAULT_COMMISSION_RATE,
      blockingDays = BANKING_DEFAULTS.DEFAULT_BLOCKING_DAYS,
    } = body;

    if (!name || !terminalId || !bankAccountId) {
      return NextResponse.json(
        { success: false, error: 'Cihaz adı, Terminal ID (TID) ve bağlı banka hesabı zorunludur' },
        { status: 400 }
      );
    }

    const posTerminal = await prisma.posTerminal.create({
      data: {
        dealerId,
        name,
        terminalId,
        merchantId: merchantId || null,
        bankAccountId,
        commissionRate: Number(commissionRate),
        blockingDays: Number(blockingDays),
        isActive: true,
      },
    });

    return NextResponse.json({
      success: true,
      posTerminal,
      message: BANKING_MESSAGES.POS_CREATED,
    });
  } catch (error: any) {
    console.error('[API POS POST Error]:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'POS terminali oluşturulamadı' },
      { status: 500 }
    );
  }
}
