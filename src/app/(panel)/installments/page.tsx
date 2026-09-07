import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import InstallmentsClient from './InstallmentsClient';

export const dynamic = 'force-dynamic';

export default async function InstallmentsPage() {
  let session = null;
  try {
    session = await auth();
  } catch (e) {
    console.error('[InstallmentsPage] Auth error:', e);
  }

  if (!session) {
    redirect('/login');
  }

  const currentUserRole = (session.user as any)?.role || 'ADMIN';
  const currentUserDealerId = (session.user as any)?.dealerId || 'merkez';

  let whereClause: any = {};
  if (currentUserRole !== 'SUPER_ADMIN') {
    whereClause.dealerId = currentUserDealerId;
  }

  try {
    const [dbPlans, dbCustomers] = await Promise.all([
      prisma.installmentPlan.findMany({
        where: whereClause,
        include: {
          customer: {
            select: { id: true, name: true, phone: true, tcNo: true, address: true },
          },
          items: {
            orderBy: { installmentNo: 'asc' },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 100,
      }).catch(() => []),
      prisma.customer.findMany({
        where: whereClause,
        select: { id: true, name: true, phone: true, tcNo: true, address: true },
        orderBy: { name: 'asc' },
      }).catch(() => []),
    ]);

    const serializedPlans = dbPlans.map((p) => ({
      ...p,
      createdAt: p.createdAt
        ? p.createdAt instanceof Date
          ? p.createdAt.toISOString()
          : new Date(p.createdAt).toISOString()
        : new Date().toISOString(),
      updatedAt: p.updatedAt
        ? p.updatedAt instanceof Date
          ? p.updatedAt.toISOString()
          : new Date(p.updatedAt).toISOString()
        : new Date().toISOString(),
      items: p.items.map((it) => ({
        ...it,
        dueDate: it.dueDate
          ? it.dueDate instanceof Date
            ? it.dueDate.toISOString()
            : new Date(it.dueDate).toISOString()
          : new Date().toISOString(),
        paidDate: it.paidDate
          ? it.paidDate instanceof Date
            ? it.paidDate.toISOString()
            : new Date(it.paidDate).toISOString()
          : null,
      })),
    }));

    return (
      <InstallmentsClient
        initialPlans={serializedPlans}
        customers={dbCustomers}
      />
    );
  } catch (error) {
    console.error('[InstallmentsPage] Server error:', error);
    return (
      <InstallmentsClient
        initialPlans={[]}
        customers={[]}
      />
    );
  }
}
