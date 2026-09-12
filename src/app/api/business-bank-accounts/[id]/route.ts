import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthenticatedContext } from '@/lib/security/auth-context';
import { logActivity } from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await getAuthenticatedContext();
    const dealerId = ctx.dealerId;
    const { id } = await params;

    const existing = await prisma.businessBankAccount.findFirst({
      where: { id, dealerId },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Banka hesabı bulunamadı.' }, { status: 404 });
    }

    const body = await req.json();
    const { bankName, accountHolderName, isDefault, isActive, note } = body;

    const updateData: any = {};
    if (bankName !== undefined) updateData.bankName = bankName;
    if (accountHolderName !== undefined) updateData.accountHolderName = accountHolderName;
    if (isActive !== undefined) updateData.isActive = Boolean(isActive);
    if (note !== undefined) updateData.note = note;

    const updated = await prisma.$transaction(async (tx) => {
      if (isDefault) {
        await tx.businessBankAccount.updateMany({
          where: { dealerId, currency: existing.currency, isDefault: true },
          data: { isDefault: false },
        });
        updateData.isDefault = true;
      } else if (isDefault === false) {
        updateData.isDefault = false;
      }

      return tx.businessBankAccount.update({
        where: { id },
        data: updateData,
        select: {
          id: true,
          bankName: true,
          accountHolderName: true,
          currency: true,
          maskedIban: true,
          isActive: true,
          isDefault: true,
          note: true,
          updatedAt: true,
        },
      });
    });

    await logActivity({
      dealerId,
      userId: ctx.userId,
      action: 'BUSINESS_BANK_ACCOUNT_UPDATE',
      details: `${existing.bankName} (${existing.maskedIban}) hesabı güncellendi.`,
    });

    return NextResponse.json({ success: true, account: updated });
  } catch (error: any) {
    if (error.statusCode === 401 || error.statusCode === 403) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error('[API Business Bank Account Detail] PATCH Error:', error);
    return NextResponse.json({ error: 'Banka hesabı güncellenemedi.' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await getAuthenticatedContext();
    const dealerId = ctx.dealerId;
    const { id } = await params;

    const existing = await prisma.businessBankAccount.findFirst({
      where: { id, dealerId },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Banka hesabı bulunamadı.' }, { status: 404 });
    }

    await prisma.businessBankAccount.delete({
      where: { id },
    });

    await logActivity({
      dealerId,
      userId: ctx.userId,
      action: 'BUSINESS_BANK_ACCOUNT_DELETE',
      details: `${existing.bankName} (${existing.maskedIban}) hesabı silindi.`,
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (error.statusCode === 401 || error.statusCode === 403) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error('[API Business Bank Account Detail] DELETE Error:', error);
    return NextResponse.json({ error: 'Banka hesabı silinemedi.' }, { status: 500 });
  }
}
