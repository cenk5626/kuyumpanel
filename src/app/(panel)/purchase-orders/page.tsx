import prisma from '@/lib/prisma';
import { getAuthenticatedContext } from '@/lib/security/auth-context';
import PurchaseOrdersClient from './PurchaseOrdersClient';

export const dynamic = 'force-dynamic';

export default async function PurchaseOrdersPage() {
  try {
    const ctx = await getAuthenticatedContext();
    const dealerId = ctx.dealerId;

    const [orders, suppliers, branches] = await Promise.all([
      prisma.purchaseOrder.findMany({
        where: { dealerId },
        include: {
          supplier: {
            select: { id: true, name: true, phone: true, hasBalance: true, tlBalance: true },
          },
          lines: true,
          messages: {
            orderBy: { sentAt: 'desc' },
            take: 3,
          },
          receipts: {
            select: { id: true, receiptNumber: true, receiptDate: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 100,
      }),
      prisma.supplier.findMany({
        where: { dealerId },
        select: { id: true, name: true, phone: true, hasBalance: true, tlBalance: true },
        orderBy: { name: 'asc' },
      }),
      prisma.branch.findMany({
        where: { dealerId },
        select: { id: true, name: true, code: true },
      }),
    ]);

    const safeOrders = orders.map((o) => ({
      ...o,
      orderDate: o.orderDate instanceof Date ? o.orderDate.toISOString() : new Date(o.orderDate).toISOString(),
      expectedDeliveryDate: o.expectedDeliveryDate
        ? o.expectedDeliveryDate instanceof Date
          ? o.expectedDeliveryDate.toISOString()
          : new Date(o.expectedDeliveryDate).toISOString()
        : null,
      sentAt: o.sentAt ? (o.sentAt instanceof Date ? o.sentAt.toISOString() : new Date(o.sentAt).toISOString()) : null,
      receivedAt: o.receivedAt ? (o.receivedAt instanceof Date ? o.receivedAt.toISOString() : new Date(o.receivedAt).toISOString()) : null,
      cancelledAt: o.cancelledAt ? (o.cancelledAt instanceof Date ? o.cancelledAt.toISOString() : new Date(o.cancelledAt).toISOString()) : null,
      createdAt: o.createdAt instanceof Date ? o.createdAt.toISOString() : new Date(o.createdAt).toISOString(),
      updatedAt: o.updatedAt instanceof Date ? o.updatedAt.toISOString() : new Date(o.updatedAt).toISOString(),
      lines: o.lines.map((l) => ({
        ...l,
        createdAt: l.createdAt instanceof Date ? l.createdAt.toISOString() : new Date(l.createdAt).toISOString(),
        updatedAt: l.updatedAt instanceof Date ? l.updatedAt.toISOString() : new Date(l.updatedAt).toISOString(),
      })),
      messages: o.messages.map((m) => ({
        ...m,
        sentAt: m.sentAt instanceof Date ? m.sentAt.toISOString() : new Date(m.sentAt).toISOString(),
      })),
      receipts: o.receipts.map((r) => ({
        ...r,
        receiptDate: r.receiptDate instanceof Date ? r.receiptDate.toISOString() : new Date(r.receiptDate).toISOString(),
      })),
    }));

    return (
      <PurchaseOrdersClient
        initialOrders={safeOrders}
        suppliers={suppliers}
        branches={branches}
      />
    );
  } catch (error) {
    console.error('[PurchaseOrdersPage] Server error:', error);
    return (
      <div className="p-8 text-center text-red-500">
        Toptancı siparişleri yüklenirken bir hata oluştu.
      </div>
    );
  }
}
