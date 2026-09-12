import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthenticatedContext } from '@/lib/security/auth-context';
import { logActivity } from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await getAuthenticatedContext();
    const dealerId = ctx.dealerId;
    const { id } = await params;

    const account = await prisma.businessBankAccount.findFirst({
      where: { id, dealerId },
      select: { bankName: true, maskedIban: true },
    });

    if (!account) {
      return NextResponse.json({ error: 'Banka hesabı bulunamadı.' }, { status: 404 });
    }

    await logActivity({
      dealerId,
      userId: ctx.userId,
      userEmail: ctx.userEmail,
      userName: ctx.userName,
      action: 'BUSINESS_IBAN_COPIED',
      details: `${account.bankName} (${account.maskedIban}) panoya kopyalandı.`,
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (error.statusCode === 401 || error.statusCode === 403) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error('[API Business Bank Account Copy Audit] Error:', error);
    return NextResponse.json({ error: 'Denetim kaydı oluşturulamadı.' }, { status: 500 });
  }
}
