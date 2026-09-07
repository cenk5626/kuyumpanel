import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { INVOICE_DEFAULTS } from '@/constants/invoice';
import InvoicesClient from './InvoicesClient';

export const dynamic = 'force-dynamic';

export default async function InvoicesPage() {
  let session = null;
  try {
    session = await auth();
  } catch (e) {
    console.error('[InvoicesPage] Auth error:', e);
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
    const [dbInvoices, dbCustomers, dbHasPrice] = await Promise.all([
      prisma.invoice.findMany({
        where: whereClause,
        orderBy: { issueDate: 'desc' },
        take: 100,
      }).catch(() => []),
      prisma.customer.findMany({
        where: whereClause,
        select: { id: true, name: true, phone: true, tcNo: true, address: true },
        orderBy: { name: 'asc' },
      }).catch(() => []),
      prisma.hasPrice.findUnique({
        where: { id: 'singleton' },
      }).catch(() => null),
    ]);

    const serializedInvoices = dbInvoices.map((inv) => ({
      ...inv,
      items: (() => {
        try {
          return JSON.parse(inv.itemsJson);
        } catch {
          return [];
        }
      })(),
      issueDate: inv.issueDate
        ? inv.issueDate instanceof Date
          ? inv.issueDate.toISOString()
          : new Date(inv.issueDate).toISOString()
        : new Date().toISOString(),
      createdAt: inv.createdAt
        ? inv.createdAt instanceof Date
          ? inv.createdAt.toISOString()
          : new Date(inv.createdAt).toISOString()
        : new Date().toISOString(),
      updatedAt: inv.updatedAt
        ? inv.updatedAt instanceof Date
          ? inv.updatedAt.toISOString()
          : new Date(inv.updatedAt).toISOString()
        : new Date().toISOString(),
    }));

    return (
      <InvoicesClient
        initialInvoices={serializedInvoices}
        customers={dbCustomers}
        currentHasPrice={dbHasPrice?.ask || INVOICE_DEFAULTS.FALLBACK_HAS_PRICE}
      />
    );
  } catch (error) {
    console.error('[InvoicesPage] Server error:', error);
    return (
      <InvoicesClient
        initialInvoices={[]}
        customers={[]}
        currentHasPrice={INVOICE_DEFAULTS.FALLBACK_HAS_PRICE}
      />
    );
  }
}
