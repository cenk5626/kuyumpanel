import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';
import BankAccountsClient from './BankAccountsClient';

export const dynamic = 'force-dynamic';

export default async function BankAccountsPage() {
  let session = null;
  try {
    session = await auth();
  } catch (e) {
    console.error('[BankAccountsPage] Auth error:', e);
  }

  if (!session || !session.user) {
    redirect('/login');
  }

  const currentUserRole = (session.user as any)?.role;
  const currentUserDealerId = (session.user as any)?.dealerId || 'merkez';

  let whereClause: any = {};
  if (currentUserRole !== 'SUPER_ADMIN') {
    whereClause.dealerId = currentUserDealerId;
  }

  let safeAccounts: any[] = [];
  let branches: any[] = [];

  try {
    const [accounts, brs] = await Promise.all([
      prisma.businessBankAccount.findMany({
        where: whereClause,
        select: {
          id: true,
          bankName: true,
          accountHolderName: true,
          currency: true,
          maskedIban: true,
          isActive: true,
          isDefault: true,
          note: true,
          branchId: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: [
          { isDefault: 'desc' },
          { createdAt: 'asc' },
        ],
      }).catch((err) => {
        console.warn('[BankAccountsPage] accounts query fallback:', err.message);
        return [];
      }),
      prisma.branch.findMany({
        where: whereClause,
        select: { id: true, name: true, code: true },
      }).catch(() => []),
    ]);

    branches = brs || [];
    safeAccounts = (accounts || []).map((a) => ({
      ...a,
      createdAt: a.createdAt instanceof Date ? a.createdAt.toISOString() : new Date(a.createdAt).toISOString(),
      updatedAt: a.updatedAt instanceof Date ? a.updatedAt.toISOString() : new Date(a.updatedAt).toISOString(),
    }));
  } catch (error) {
    console.error('[BankAccountsPage] Data fetch error:', error);
  }

  return (
    <BankAccountsClient
      initialAccounts={safeAccounts}
      branches={branches}
    />
  );
}
