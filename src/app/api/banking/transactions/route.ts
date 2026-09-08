import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedContext } from '@/lib/security/auth-context';
import { BANK_MATCH_STATUS, BANKING_MESSAGES } from '@/constants/banking';
import { reconcileBankTransactionsWithSales } from '@/lib/banking/banking-engine';

export const dynamic = 'force-dynamic';

/**
 * GET /api/banking/transactions
 * Banka hesap hareketlerini listeler.
 */
export async function GET(request: NextRequest) {
  try {
    const ctx = await getAuthenticatedContext();
    const dealerId = ctx.dealerId;

    const { searchParams } = new URL(request.url);
    const bankAccountId = searchParams.get('bankAccountId');
    const matchStatus = searchParams.get('matchStatus');

    const where: any = { dealerId };
    if (bankAccountId) where.bankAccountId = bankAccountId;
    if (matchStatus) where.matchStatus = matchStatus;

    const transactions = await prisma.bankTransaction.findMany({
      where,
      include: {
        bankAccount: {
          select: { bankName: true, accountName: true, currency: true, iban: true },
        },
      },
      orderBy: { transactionDate: 'desc' },
      take: 100,
    });

    return NextResponse.json({ success: true, transactions });
  } catch (error: any) {
    console.error('[API Bank Transactions GET Error]:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Banka hareketleri listelenemedi' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/banking/transactions
 * Yeni bir banka hareketi ekler ve sistemdeki satışlarla otomatik mutabakat eşleştirmesi dener.
 */
export async function POST(request: NextRequest) {
  try {
    const ctx = await getAuthenticatedContext();
    const dealerId = ctx.dealerId;

    const body = await request.json();
    const {
      bankAccountId,
      amount,
      direction = 'INFLOW',
      type = 'HAVALE_EFT',
      description,
      senderReceiverName,
      senderReceiverIban,
      externalTxId,
      transactionDate = new Date(),
    } = body;

    if (!bankAccountId || !amount || !description) {
      return NextResponse.json(
        { success: false, error: 'Banka hesabı, tutar ve açıklama zorunludur' },
        { status: 400 }
      );
    }

    // Aday satış/tahsilat kayıtlarını çek (Son 48 saat)
    const recentSales = await prisma.transaction.findMany({
      where: {
        dealerId,
        createdAt: {
          gte: new Date(Date.now() - 48 * 60 * 60 * 1000),
        },
      },
      select: {
        id: true,
        total: true,
        createdAt: true,
        paymentMethod: true,
      },
    });

    const candidates = recentSales.map((s) => ({
      id: s.id,
      totalAmount: s.total,
      createdAt: s.createdAt,
      customerName: senderReceiverName,
    }));

    const reconciliation = reconcileBankTransactionsWithSales(
      {
        amount: Number(amount),
        transactionDate,
        description,
      },
      candidates
    );

    const bankTx = await prisma.bankTransaction.create({
      data: {
        dealerId,
        bankAccountId,
        externalTxId: externalTxId || null,
        amount: Number(amount),
        direction,
        type,
        description,
        senderReceiverName: senderReceiverName || null,
        senderReceiverIban: senderReceiverIban || null,
        matchStatus: reconciliation.isMatch ? BANK_MATCH_STATUS.MATCHED : BANK_MATCH_STATUS.UNMATCHED,
        matchedTransactionId: reconciliation.matchedId || null,
        matchedAt: reconciliation.isMatch ? new Date() : null,
        transactionDate: new Date(transactionDate),
      },
    });

    // Banka bakiyesini güncelle
    const delta = direction === 'INFLOW' ? Number(amount) : -Number(amount);
    await prisma.bankAccount.update({
      where: { id: bankAccountId },
      data: { balance: { increment: delta } },
    });

    return NextResponse.json({
      success: true,
      transaction: bankTx,
      reconciliation,
      message: reconciliation.isMatch
        ? BANKING_MESSAGES.MATCH_SUCCESS
        : BANKING_MESSAGES.ACCOUNT_UPDATED,
    });
  } catch (error: any) {
    console.error('[API Bank Transactions POST Error]:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Banka hareketi eklenemedi' },
      { status: 500 }
    );
  }
}
