import prisma from '@/lib/prisma';
import { getAuthenticatedContext } from '@/lib/security/auth-context';
import BankAccountsClient from './BankAccountsClient';

export const dynamic = 'force-dynamic';

export default async function BankAccountsPage() {
  try {
    const ctx = await getAuthenticatedContext();
    const dealerId = ctx.dealerId;

    const [accounts, branches] = await Promise.all([
      prisma.businessBankAccount.findMany({
        where: { dealerId },
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
      }),
      prisma.branch.findMany({
        where: { dealerId },
        select: { id: true, name: true, code: true },
      }),
    ]);

    const safeAccounts = accounts.map((a) => ({
      ...a,
      createdAt: a.createdAt instanceof Date ? a.createdAt.toISOString() : new Date(a.createdAt).toISOString(),
      updatedAt: a.updatedAt instanceof Date ? a.updatedAt.toISOString() : new Date(a.updatedAt).toISOString(),
    }));

    return (
      <BankAccountsClient
        initialAccounts={safeAccounts}
        branches={branches}
      />
    );
  } catch (error) {
    console.error('[BankAccountsPage] Server error:', error);
    return (
      <div className="p-8 text-center text-red-500">
        Banka hesapları yüklenirken bir hata oluştu.
      </div>
    );
  }
}
