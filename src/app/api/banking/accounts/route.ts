import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedContext } from '@/lib/security/auth-context';
import { BANK_ACCOUNT_TYPE, BANKING_MESSAGES } from '@/constants/banking';

export const dynamic = 'force-dynamic';

/**
 * GET /api/banking/accounts
 * Bayiye ait banka ve altın hesaplarını listeler.
 */
export async function GET() {
  try {
    const ctx = await getAuthenticatedContext();
    const dealerId = ctx.dealerId;

    const accounts = await prisma.bankAccount.findMany({
      where: { dealerId },
      include: {
        posTerminals: true,
        _count: {
          select: { transactions: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    return NextResponse.json({ success: true, accounts });
  } catch (error: any) {
    console.error('[API Bank Accounts GET Error]:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Banka hesapları listelenemedi' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/banking/accounts
 * Yeni bir vadesiz veya altın depo hesabı tanımlar.
 */
export async function POST(request: NextRequest) {
  try {
    const ctx = await getAuthenticatedContext();
    const dealerId = ctx.dealerId;

    const body = await request.json();
    const {
      bankName,
      accountName,
      accountType = BANK_ACCOUNT_TYPE.VADESIZ_TL,
      currency = 'TL',
      iban,
      accountNumber,
      branchCode,
      balance = 0,
      integrationType = 'MANUAL',
    } = body;

    if (!bankName || !accountName || !iban) {
      return NextResponse.json(
        { success: false, error: 'Banka adı, hesap adı ve IBAN zorunludur' },
        { status: 400 }
      );
    }

    const cleanIban = iban.replace(/\s+/g, '').toUpperCase();

    const account = await prisma.bankAccount.create({
      data: {
        dealerId,
        bankName,
        accountName,
        accountType,
        currency,
        iban: cleanIban,
        accountNumber: accountNumber || null,
        branchCode: branchCode || null,
        balance: Number(balance) || 0,
        integrationType,
      },
    });

    return NextResponse.json({
      success: true,
      account,
      message: BANKING_MESSAGES.ACCOUNT_CREATED,
    });
  } catch (error: any) {
    console.error('[API Bank Accounts POST Error]:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Banka hesabı oluşturulamadı' },
      { status: 500 }
    );
  }
}
