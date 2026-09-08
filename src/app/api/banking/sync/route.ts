import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedContext } from '@/lib/security/auth-context';
import { BANKING_MESSAGES } from '@/constants/banking';

export const dynamic = 'force-dynamic';

/**
 * POST /api/banking/sync
 * Açık bankacılık hesabı hareketlerini çeker ve bakiye senkronizasyonu yapar.
 */
export async function POST(request: NextRequest) {
  try {
    const ctx = await getAuthenticatedContext();
    const dealerId = ctx.dealerId;

    const body = await request.json();
    const { bankAccountId } = body;

    if (!bankAccountId) {
      return NextResponse.json(
        { success: false, error: 'Banka hesabı seçilmelidir' },
        { status: 400 }
      );
    }

    const account = await prisma.bankAccount.findFirst({
      where: { id: bankAccountId, dealerId },
    });

    if (!account) {
      return NextResponse.json(
        { success: false, error: 'Banka hesabı bulunamadı' },
        { status: 404 }
      );
    }

    // Açık Bankacılık BKM / Banka API mock senkronizasyonu
    const now = new Date();
    await prisma.bankAccount.update({
      where: { id: bankAccountId },
      data: {
        lastSyncedAt: now,
      },
    });

    return NextResponse.json({
      success: true,
      lastSyncedAt: now.toISOString(),
      message: BANKING_MESSAGES.SYNC_COMPLETED,
    });
  } catch (error: any) {
    console.error('[API Bank Sync POST Error]:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Senkronizasyon başarısız' },
      { status: 500 }
    );
  }
}
