import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { ensureDefaultBranch } from '@/lib/branch/bootstrap';
import TransfersClient from './TransfersClient';

export const dynamic = 'force-dynamic';

export default async function TransfersPage() {
  let session = null;
  try {
    session = await auth();
  } catch (e) {
    console.error('[TransfersPage] Auth error:', e);
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

    const [branches, transfers, availableItems] = await Promise.all([
      prisma.branch.findMany({
        where: whereClause,
        orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
      }),
      prisma.inventoryTransfer.findMany({
        where: whereClause,
        include: {
          fromBranch: true,
          toBranch: true,
          lines: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 100,
      }),
      prisma.productItem.findMany({
        where: {
          dealerId: currentUserDealerId,
          status: 'IN_STOCK',
        },
        select: {
          id: true,
          barcode: true,
          title: true,
          weight: true,
          carat: true,
          branchId: true,
        },
        take: 300,
      }),
    ]);

    const serializedTransfers = transfers.map((tr) => ({
      ...tr,
      createdAt: tr.createdAt
        ? tr.createdAt instanceof Date
          ? tr.createdAt.toISOString()
          : new Date(tr.createdAt).toISOString()
        : new Date().toISOString(),
      updatedAt: tr.updatedAt
        ? tr.updatedAt instanceof Date
          ? tr.updatedAt.toISOString()
          : new Date(tr.updatedAt).toISOString()
        : new Date().toISOString(),
      shippedAt: tr.shippedAt
        ? tr.shippedAt instanceof Date
          ? tr.shippedAt.toISOString()
          : new Date(tr.shippedAt).toISOString()
        : null,
      receivedAt: tr.receivedAt
        ? tr.receivedAt instanceof Date
          ? tr.receivedAt.toISOString()
          : new Date(tr.receivedAt).toISOString()
        : null,
    }));

    return (
      <TransfersClient
        initialTransfers={serializedTransfers}
        branches={branches}
        availableItems={availableItems}
        currentUserRole={currentUserRole}
        defaultBranchId={defaultBranchId}
      />
    );
  } catch (error) {
    console.error('[TransfersPage] Fetch error:', error);
    return (
      <TransfersClient
        initialTransfers={[]}
        branches={[]}
        availableItems={[]}
        currentUserRole={currentUserRole}
      />
    );
  }
}
