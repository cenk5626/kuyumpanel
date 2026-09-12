import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';
import IdentityVaultClient from './IdentityVaultClient';

export const dynamic = 'force-dynamic';

export default async function IdentityVaultPage() {
  let session = null;
  try {
    session = await auth();
  } catch (e) {
    console.error('[IdentityVaultPage] Auth error:', e);
  }

  if (!session || !session.user) {
    redirect('/login');
  }

  const currentUserRole = (session.user as any)?.role;
  const currentUserDealerId = (session.user as any)?.dealerId || 'merkez';

  let whereClause: any = {};
  if (currentUserRole !== 'SUPER_ADMIN') {
    whereClause.dealerId = currentUserDealerId;
  }

  let safeIdentities: any[] = [];
  let customers: any[] = [];

  try {
    const [identities, custs] = await Promise.all([
      prisma.customerIdentity.findMany({
        where: whereClause,
        select: {
          id: true,
          customerId: true,
          customer: {
            select: { id: true, name: true, phone: true },
          },
          firstName: true,
          lastName: true,
          maskedTcNo: true,
          purpose: true,
          legalBasisOrConsentReference: true,
          collectedAt: true,
          retentionUntil: true,
          status: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 200,
      }).catch((err) => {
        console.warn('[IdentityVaultPage] identities query fallback:', err.message);
        return [];
      }),
      prisma.customer.findMany({
        where: whereClause,
        select: { id: true, name: true, phone: true },
        orderBy: { name: 'asc' },
        take: 200,
      }).catch((err) => {
        console.warn('[IdentityVaultPage] customers query fallback:', err.message);
        return [];
      }),
    ]);

    customers = custs || [];
    safeIdentities = (identities || []).map((item) => ({
      ...item,
      collectedAt: item.collectedAt instanceof Date ? item.collectedAt.toISOString() : new Date(item.collectedAt).toISOString(),
      retentionUntil: item.retentionUntil instanceof Date ? item.retentionUntil.toISOString() : new Date(item.retentionUntil).toISOString(),
      createdAt: item.createdAt instanceof Date ? item.createdAt.toISOString() : new Date(item.createdAt).toISOString(),
    }));
  } catch (error) {
    console.error('[IdentityVaultPage] Data fetch error:', error);
  }

  return (
    <IdentityVaultClient
      initialIdentities={safeIdentities}
      customers={customers}
    />
  );
}
