import prisma from '@/lib/prisma';
import { getAuthenticatedContext } from '@/lib/security/auth-context';
import IdentityVaultClient from './IdentityVaultClient';

export const dynamic = 'force-dynamic';

export default async function IdentityVaultPage() {
  try {
    const ctx = await getAuthenticatedContext();
    const dealerId = ctx.dealerId;

    const [identities, customers] = await Promise.all([
      prisma.customerIdentity.findMany({
        where: { dealerId },
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
      }),
      prisma.customer.findMany({
        where: { dealerId },
        select: { id: true, name: true, phone: true },
        orderBy: { name: 'asc' },
        take: 200,
      }),
    ]);

    const safeIdentities = identities.map((item) => ({
      ...item,
      collectedAt: item.collectedAt instanceof Date ? item.collectedAt.toISOString() : new Date(item.collectedAt).toISOString(),
      retentionUntil: item.retentionUntil instanceof Date ? item.retentionUntil.toISOString() : new Date(item.retentionUntil).toISOString(),
      createdAt: item.createdAt instanceof Date ? item.createdAt.toISOString() : new Date(item.createdAt).toISOString(),
    }));

    return (
      <IdentityVaultClient
        initialIdentities={safeIdentities}
        customers={customers}
      />
    );
  } catch (error) {
    console.error('[IdentityVaultPage] Server error:', error);
    return (
      <div className="p-8 text-center text-red-500">
        Kimlik havuzu kayıtları yüklenirken bir hata oluştu.
      </div>
    );
  }
}
