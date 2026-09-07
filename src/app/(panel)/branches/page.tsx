import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { ensureDefaultBranch } from '@/lib/branch/bootstrap';
import BranchesClient from './BranchesClient';

export const dynamic = 'force-dynamic';

export default async function BranchesPage() {
  let session = null;
  try {
    session = await auth();
  } catch (e) {
    console.error('[BranchesPage] Auth error:', e);
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
    // Otomatik Merkez Şube denetimi ve oluşturma
    await ensureDefaultBranch(currentUserDealerId);

    const whereClause: any = {};
    if (currentUserRole !== 'SUPER_ADMIN') {
      whereClause.dealerId = currentUserDealerId;
    }

    const branches = await prisma.branch.findMany({
      where: whereClause,
      include: {
        _count: {
          select: {
            users: true,
            stocks: true,
            productItems: true,
            transfersFrom: true,
            transfersTo: true,
          },
        },
      },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
    });

    const serializedBranches = branches.map((b) => ({
      ...b,
      createdAt: b.createdAt
        ? b.createdAt instanceof Date
          ? b.createdAt.toISOString()
          : new Date(b.createdAt).toISOString()
        : new Date().toISOString(),
      updatedAt: b.updatedAt
        ? b.updatedAt instanceof Date
          ? b.updatedAt.toISOString()
          : new Date(b.updatedAt).toISOString()
        : new Date().toISOString(),
    }));

    return (
      <BranchesClient
        initialBranches={serializedBranches}
        currentUserRole={currentUserRole}
        dealerId={currentUserDealerId}
      />
    );
  } catch (error) {
    console.error('[BranchesPage] Fetch error:', error);
    return (
      <BranchesClient
        initialBranches={[]}
        currentUserRole={currentUserRole}
        dealerId={currentUserDealerId}
      />
    );
  }
}
