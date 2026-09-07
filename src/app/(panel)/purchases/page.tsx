import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { ensureDefaultBranch } from '@/lib/branch/bootstrap';
import PurchasesClient from './PurchasesClient';

export const dynamic = 'force-dynamic';

export default async function PurchasesPage() {
  let session = null;
  try {
    session = await auth();
  } catch (e) {
    console.error('[PurchasesPage] Auth error:', e);
  }

  if (!session) {
    redirect('/login');
  }

  const currentUserRole = (session.user as any)?.role || 'ADMIN';
  const currentUserDealerId = (session.user as any)?.dealerId;

  if (!currentUserDealerId) {
    redirect('/login');
  }

  try {
    const defaultBranchId = await ensureDefaultBranch(currentUserDealerId);

    const whereClause: any = {};
    if (currentUserRole !== 'SUPER_ADMIN') {
      whereClause.dealerId = currentUserDealerId;
    }

    const [suppliers, branches, orders, receipts] = await Promise.all([
      prisma.supplier.findMany({
        where: whereClause,
        select: { id: true, name: true, phone: true, hasBalance: true, tlBalance: true },
        orderBy: { name: 'asc' },
      }),
      prisma.branch.findMany({
        where: whereClause,
        select: { id: true, name: true, code: true, isDefault: true },
        orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
      }),
      prisma.purchaseOrder.findMany({
        where: whereClause,
        include: {
          supplier: true,
          branch: true,
          lines: true,
          receipts: {
            select: { id: true, receiptNumber: true, totalActualWeight: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 100,
      }),
      prisma.goodsReceipt.findMany({
        where: whereClause,
        include: {
          supplier: true,
          branch: true,
          purchaseOrder: true,
          lines: true,
        },
        orderBy: { receiptDate: 'desc' },
        take: 100,
      }),
    ]);

    const serializedOrders = orders.map((o) => ({
      ...o,
      orderDate: o.orderDate
        ? o.orderDate instanceof Date
          ? o.orderDate.toISOString()
          : new Date(o.orderDate).toISOString()
        : new Date().toISOString(),
      expectedDeliveryDate: o.expectedDeliveryDate
        ? o.expectedDeliveryDate instanceof Date
          ? o.expectedDeliveryDate.toISOString()
          : new Date(o.expectedDeliveryDate).toISOString()
        : null,
      createdAt: o.createdAt
        ? o.createdAt instanceof Date
          ? o.createdAt.toISOString()
          : new Date(o.createdAt).toISOString()
        : new Date().toISOString(),
      updatedAt: o.updatedAt
        ? o.updatedAt instanceof Date
          ? o.updatedAt.toISOString()
          : new Date(o.updatedAt).toISOString()
        : new Date().toISOString(),
      lines: o.lines.map((l) => ({
        ...l,
        createdAt: l.createdAt
          ? l.createdAt instanceof Date
            ? l.createdAt.toISOString()
            : new Date(l.createdAt).toISOString()
          : new Date().toISOString(),
        updatedAt: l.updatedAt
          ? l.updatedAt instanceof Date
            ? l.updatedAt.toISOString()
            : new Date(l.updatedAt).toISOString()
          : new Date().toISOString(),
      })),
    }));

    const serializedReceipts = receipts.map((r) => ({
      ...r,
      receiptDate: r.receiptDate
        ? r.receiptDate instanceof Date
          ? r.receiptDate.toISOString()
          : new Date(r.receiptDate).toISOString()
        : new Date().toISOString(),
      createdAt: r.createdAt
        ? r.createdAt instanceof Date
          ? r.createdAt.toISOString()
          : new Date(r.createdAt).toISOString()
        : new Date().toISOString(),
      updatedAt: r.updatedAt
        ? r.updatedAt instanceof Date
          ? r.updatedAt.toISOString()
          : new Date(r.updatedAt).toISOString()
        : new Date().toISOString(),
      purchaseOrder: r.purchaseOrder
        ? {
            ...r.purchaseOrder,
            orderDate: r.purchaseOrder.orderDate
              ? r.purchaseOrder.orderDate instanceof Date
                ? r.purchaseOrder.orderDate.toISOString()
                : new Date(r.purchaseOrder.orderDate).toISOString()
              : new Date().toISOString(),
          }
        : null,
      lines: r.lines.map((l) => ({
        ...l,
        createdAt: l.createdAt
          ? l.createdAt instanceof Date
            ? l.createdAt.toISOString()
            : new Date(l.createdAt).toISOString()
          : new Date().toISOString(),
      })),
    }));

    return (
      <PurchasesClient
        initialOrders={serializedOrders}
        initialReceipts={serializedReceipts}
        suppliers={suppliers}
        branches={branches}
        defaultBranchId={defaultBranchId}
        currentUserRole={currentUserRole}
      />
    );
  } catch (error) {
    console.error('[PurchasesPage] Fetch error:', error);
    return (
      <PurchasesClient
        initialOrders={[]}
        initialReceipts={[]}
        suppliers={[]}
        branches={[]}
        currentUserRole={currentUserRole}
      />
    );
  }
}
