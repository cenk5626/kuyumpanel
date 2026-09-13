import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { ROUTES } from '@/constants/routes';
import { hasPagePermission } from '@/constants/page-permissions';
import AccessDenied from '@/components/AccessDenied';
import { getAuthenticatedContext } from '@/lib/security/auth-context';
import BankingClient from './BankingClient';
import { BANK_ACCOUNT_TYPE, POS_SETTLEMENT_STATUS, BANK_MATCH_STATUS } from '@/constants/banking';

export const dynamic = 'force-dynamic';

export default async function BankingPage() {
  let session = null;
  try {
    session = await auth();
  } catch (e) {
    console.error('Banking auth error:', e);
  }

  if (!session) {
    redirect(ROUTES.LOGIN);
  }

  const userRole = (session.user as any)?.role;
  const userPermissions = (session.user as any)?.permissions;

  if (!hasPagePermission(userRole, userPermissions, '/banking')) {
    return (
      <AccessDenied
        pageTitle="Banka & POS Takas"
        userRole={userRole}
        requiredModule="/banking"
      />
    );
  }

  let initialAccounts: any[] = [];
  let initialPosTerminals: any[] = [];
  let initialSettlements: any[] = [];
  let initialTransactions: any[] = [];

  let stats = {
    totalTlBalance: 0,
    totalGoldBalanceGr: 0,
    blockedSettlementTL: 0,
    unmatchedCount: 0,
  };

  try {
    const ctx = await getAuthenticatedContext();
    const dealerId = ctx.dealerId;

    const [accounts, posTerminals, settlements, transactions] = await Promise.all([
      prisma.bankAccount.findMany({
        where: { dealerId },
        include: {
          posTerminals: true,
          _count: { select: { transactions: true } },
        },
        orderBy: { createdAt: 'asc' },
      }),
      prisma.posTerminal.findMany({
        where: { dealerId },
        include: {
          bankAccount: { select: { id: true, bankName: true, accountName: true, iban: true } },
        },
        orderBy: { createdAt: 'asc' },
      }),
      prisma.posSettlement.findMany({
        where: { dealerId },
        include: {
          posTerminal: {
            select: { name: true, terminalId: true, bankAccount: { select: { bankName: true, iban: true } } },
          },
        },
        orderBy: { settlementDate: 'desc' },
        take: 50,
      }),
      prisma.bankTransaction.findMany({
        where: { dealerId },
        include: {
          bankAccount: { select: { bankName: true, accountName: true, currency: true, iban: true } },
        },
        orderBy: { transactionDate: 'desc' },
        take: 50,
      }),
    ]);

    initialAccounts = accounts.map((a) => ({
      id: a.id,
      bankName: a.bankName,
      accountName: a.accountName,
      accountType: a.accountType,
      currency: a.currency,
      iban: a.iban,
      accountNumber: a.accountNumber,
      branchCode: a.branchCode,
      balance: a.balance,
      integrationType: a.integrationType,
      lastSyncedAt: a.lastSyncedAt
        ? a.lastSyncedAt instanceof Date
          ? a.lastSyncedAt.toISOString()
          : new Date(a.lastSyncedAt).toISOString()
        : null,
      isActive: a.isActive,
      posCount: a.posTerminals.length,
      txCount: a._count.transactions,
    }));

    initialPosTerminals = posTerminals.map((p) => ({
      id: p.id,
      name: p.name,
      terminalId: p.terminalId,
      merchantId: p.merchantId,
      bankAccountId: p.bankAccountId,
      bankName: p.bankAccount.bankName,
      accountName: p.bankAccount.accountName,
      commissionRate: p.commissionRate,
      blockingDays: p.blockingDays,
      isActive: p.isActive,
    }));

    initialSettlements = settlements.map((s) => ({
      id: s.id,
      posTerminalName: s.posTerminal.name,
      terminalId: s.posTerminal.terminalId,
      bankName: s.posTerminal.bankAccount.bankName,
      settlementDate: s.settlementDate instanceof Date ? s.settlementDate.toISOString() : new Date(s.settlementDate).toISOString(),
      maturityDate: s.maturityDate instanceof Date ? s.maturityDate.toISOString() : new Date(s.maturityDate).toISOString(),
      grossAmount: s.grossAmount,
      commissionAmount: s.commissionAmount,
      netAmount: s.netAmount,
      status: s.status,
    }));

    initialTransactions = transactions.map((t) => ({
      id: t.id,
      bankName: t.bankAccount.bankName,
      accountName: t.bankAccount.accountName,
      amount: t.amount,
      direction: t.direction,
      type: t.type,
      description: t.description,
      senderReceiverName: t.senderReceiverName,
      matchStatus: t.matchStatus,
      transactionDate: t.transactionDate instanceof Date ? t.transactionDate.toISOString() : new Date(t.transactionDate).toISOString(),
    }));

    // KPI İstatistikleri
    let totalTl = 0;
    let totalGold = 0;
    for (const a of accounts) {
      if (a.accountType === BANK_ACCOUNT_TYPE.ALTIN_HESABI) {
        totalGold += a.balance;
      } else if (a.currency === 'TL') {
        totalTl += a.balance;
      }
    }

    const blockedTL = settlements
      .filter((s) => s.status === POS_SETTLEMENT_STATUS.BLOCKED)
      .reduce((sum, s) => sum + s.netAmount, 0);

    const unmatched = transactions.filter((t) => t.matchStatus === BANK_MATCH_STATUS.UNMATCHED).length;

    stats = {
      totalTlBalance: totalTl,
      totalGoldBalanceGr: totalGold,
      blockedSettlementTL: blockedTL,
      unmatchedCount: unmatched,
    };
  } catch (error) {
    console.error('[BankingPage Error]:', error);
  }

  return (
    <BankingClient
      initialAccounts={initialAccounts}
      initialPosTerminals={initialPosTerminals}
      initialSettlements={initialSettlements}
      initialTransactions={initialTransactions}
      initialStats={stats}
    />
  );
}
