import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { NOTEBOOK_STATUS, NOTEBOOK_VISIBILITY } from '@/constants/notebook';
import NotebookClient from './NotebookClient';

export const dynamic = 'force-dynamic';

export default async function NotebookPage() {
  let session = null;
  try {
    session = await auth();
  } catch (e) {
    console.error('[NotebookPage] Auth error:', e);
  }

  if (!session || !session.user) {
    redirect('/login');
  }

  const currentUserRole = (session.user as any)?.role;
  const dealerId = (session.user as any)?.dealerId || 'merkez';
  const currentUserId = (session.user as any)?.id || '';
  const currentUserEmail = (session.user as any)?.email || '';

  let safeEntries: any[] = [];
  let customers: any[] = [];
  let suppliers: any[] = [];
  let branches: any[] = [];

  try {
    const [entries, custs, supps, brs] = await Promise.all([
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
      }).catch((err) => {
        console.warn('[NotebookPage] entries query fallback:', err.message);
        return [];
      }),
      prisma.customer.findMany({
        where: { dealerId },
        select: { id: true, name: true },
        orderBy: { name: 'asc' },
        take: 100,
      }).catch(() => []),
      prisma.supplier.findMany({
        where: { dealerId },
        select: { id: true, name: true },
        orderBy: { name: 'asc' },
        take: 100,
      }).catch(() => []),
      prisma.branch.findMany({
        where: { dealerId },
        select: { id: true, name: true, code: true },
      }).catch(() => []),
    ]);

    customers = custs || [];
    suppliers = supps || [];
    branches = brs || [];

    safeEntries = (entries || []).map((entry) => ({
      ...entry,
      reminderAt: entry.reminderAt instanceof Date ? entry.reminderAt.toISOString() : (entry.reminderAt ? new Date(entry.reminderAt).toISOString() : null),
      createdAt: entry.createdAt instanceof Date ? entry.createdAt.toISOString() : new Date(entry.createdAt).toISOString(),
      updatedAt: entry.updatedAt instanceof Date ? entry.updatedAt.toISOString() : new Date(entry.updatedAt).toISOString(),
    }));
  } catch (error) {
    console.error('[NotebookPage] Data fetch error:', error);
  }

  return (
    <NotebookClient
      initialEntries={safeEntries}
      customers={customers}
      suppliers={suppliers}
      branches={branches}
    />
  );
}
