import { prisma } from '@/lib/prisma';
import { getAuthenticatedContext } from '@/lib/security/auth-context';
import ExpenseVouchersClient from './ExpenseVouchersClient';

export const dynamic = 'force-dynamic';

export default async function ExpenseVouchersPage() {
  try {
    const ctx = await getAuthenticatedContext();
    const dealerId = ctx.dealerId;
    const role = ctx.role;

    const whereClause: any = {};
    if (role !== 'SUPER_ADMIN') {
      whereClause.dealerId = dealerId;
    }

    const [vouchers, branches] = await Promise.all([
      prisma.expenseVoucher.findMany({
        where: whereClause,
        include: {
          lines: true,
          events: { orderBy: { createdAt: 'desc' } },
          branch: { select: { id: true, name: true, code: true } },
        },
        orderBy: { issueDate: 'desc' },
        take: 100,
      }),
      prisma.branch.findMany({
        where: whereClause,
        select: { id: true, name: true, code: true },
      }),
    ]);

    const safeVouchers = vouchers.map((v) => ({
      ...v,
      issueDate: v.issueDate
        ? v.issueDate instanceof Date
          ? v.issueDate.toISOString()
          : new Date(v.issueDate).toISOString()
        : new Date().toISOString(),
      createdAt: v.createdAt
        ? v.createdAt instanceof Date
          ? v.createdAt.toISOString()
          : new Date(v.createdAt).toISOString()
        : new Date().toISOString(),
      updatedAt: v.updatedAt
        ? v.updatedAt instanceof Date
          ? v.updatedAt.toISOString()
          : new Date(v.updatedAt).toISOString()
        : new Date().toISOString(),
      lines: v.lines.map((l) => ({
        ...l,
        createdAt: l.createdAt
          ? l.createdAt instanceof Date
            ? l.createdAt.toISOString()
            : new Date(l.createdAt).toISOString()
          : new Date().toISOString(),
      })),
      events: v.events.map((e) => ({
        ...e,
        createdAt: e.createdAt
          ? e.createdAt instanceof Date
            ? e.createdAt.toISOString()
            : new Date(e.createdAt).toISOString()
          : new Date().toISOString(),
      })),
    }));

    return (
      <ExpenseVouchersClient
        initialVouchers={safeVouchers}
        branches={branches}
      />
    );
  } catch (error) {
    console.error('[ExpenseVouchersPage] Server error:', error);
    return (
      <ExpenseVouchersClient
        initialVouchers={[]}
        branches={[]}
      />
    );
  }
}
