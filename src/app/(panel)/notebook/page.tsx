import prisma from '@/lib/prisma';
import { getAuthenticatedContext } from '@/lib/security/auth-context';
import { NOTEBOOK_STATUS, NOTEBOOK_VISIBILITY } from '@/constants/notebook';
import NotebookClient from './NotebookClient';

export const dynamic = 'force-dynamic';

export default async function NotebookPage() {
  try {
    const ctx = await getAuthenticatedContext();
    const dealerId = ctx.dealerId;
    const currentUserId = ctx.userId;
    const currentUserEmail = ctx.userEmail || '';

    const [entries, customers, suppliers, branches] = await Promise.all([
      prisma.jewelerNotebookEntry.findMany({
        where: {
          dealerId,
          status: NOTEBOOK_STATUS.ACTIVE,
          OR: [
            { visibility: { not: NOTEBOOK_VISIBILITY.PRIVATE } },
            { createdBy: currentUserId },
            { createdBy: currentUserEmail },
          ],
        },
        include: {
          linkedCustomer: { select: { id: true, name: true, phone: true } },
          linkedSupplier: { select: { id: true, name: true } },
          linkedServiceOrder: { select: { id: true, serviceNumber: true, customerName: true } },
        },
        orderBy: [
          { isPinned: 'desc' },
          { createdAt: 'desc' },
        ],
        take: 200,
      }),
      prisma.customer.findMany({
        where: { dealerId },
        select: { id: true, name: true },
        orderBy: { name: 'asc' },
        take: 100,
      }),
      prisma.supplier.findMany({
        where: { dealerId },
        select: { id: true, name: true },
        orderBy: { name: 'asc' },
        take: 100,
      }),
      prisma.branch.findMany({
        where: { dealerId },
        select: { id: true, name: true, code: true },
      }),
    ]);

    const safeEntries = entries.map((entry) => ({
      ...entry,
      reminderAt: entry.reminderAt instanceof Date ? entry.reminderAt.toISOString() : (entry.reminderAt ? new Date(entry.reminderAt).toISOString() : null),
      createdAt: entry.createdAt instanceof Date ? entry.createdAt.toISOString() : new Date(entry.createdAt).toISOString(),
      updatedAt: entry.updatedAt instanceof Date ? entry.updatedAt.toISOString() : new Date(entry.updatedAt).toISOString(),
    }));

    return (
      <NotebookClient
        initialEntries={safeEntries}
        customers={customers}
        suppliers={suppliers}
        branches={branches}
      />
    );
  } catch (error) {
    console.error('[NotebookPage] Server error:', error);
    return (
      <div className="p-8 text-center text-red-500">
        Kuyumcu defteri notları yüklenirken bir hata oluştu.
      </div>
    );
  }
}
