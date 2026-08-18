import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';

/**
 * GET /api/transactions/revisions — İşlem düzenleme ve silme revizyon geçmişini döner.
 */
export async function GET() {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const dealerId = (session.user as any).dealerId || 'merkez';

    const revisions = await prisma.transactionRevisionLog.findMany({
      where: { dealerId },
      include: {
        transaction: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    const formatted = revisions.map((r) => ({
      id: r.id,
      transactionId: r.transactionId,
      actionType: r.actionType,
      previousData: r.previousData ? JSON.parse(r.previousData) : null,
      newData: r.newData ? JSON.parse(r.newData) : null,
      reason: r.reason,
      userEmail: r.userEmail,
      userName: r.userName,
      createdAt: r.createdAt ? new Date(r.createdAt).toISOString() : new Date().toISOString(),
    }));

    return NextResponse.json(formatted);
  } catch (error) {
    console.error('[API Transaction Revisions] GET Error:', error);
    return NextResponse.json({ error: 'Revizyon kayıtları okunamadı.' }, { status: 500 });
  }
}
