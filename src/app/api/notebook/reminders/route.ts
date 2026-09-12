import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthenticatedContext } from '@/lib/security/auth-context';
import { NOTEBOOK_STATUS, NOTEBOOK_VISIBILITY } from '@/constants/notebook';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const ctx = await getAuthenticatedContext();
    const dealerId = ctx.dealerId;
    const currentUserId = ctx.userId;
    const currentUserEmail = ctx.userEmail || '';

    // Yaklaşan veya son 7 gün içinde vadesi gelmiş hatırlatmalar
    const now = new Date();
    const pastLimit = new Date();
    pastLimit.setDate(pastLimit.getDate() - 7);

    const reminders = await prisma.jewelerNotebookEntry.findMany({
      where: {
        dealerId,
        status: NOTEBOOK_STATUS.ACTIVE,
        reminderAt: {
          not: null,
          gte: pastLimit,
        },
        OR: [
          { visibility: { not: NOTEBOOK_VISIBILITY.PRIVATE } },
          { createdBy: currentUserId },
          { createdBy: currentUserEmail },
        ],
      },
      select: {
        id: true,
        title: true,
        category: true,
        reminderAt: true,
        isPinned: true,
        linkedCustomerId: true,
        linkedCustomer: { select: { id: true, name: true, phone: true } },
      },
      orderBy: { reminderAt: 'asc' },
      take: 20,
    });

    return NextResponse.json({ reminders });
  } catch (error: any) {
    if (error.statusCode === 401 || error.statusCode === 403) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error('[API Notebook Reminders] GET Error:', error);
    return NextResponse.json({ error: 'Hatırlatmalar alınamadı.' }, { status: 500 });
  }
}
