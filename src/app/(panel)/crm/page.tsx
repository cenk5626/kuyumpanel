import { prisma } from '@/lib/prisma';
import { getAuthenticatedContext } from '@/lib/security/auth-context';
import CrmClient from './CrmClient';
import { CRM_CONSENT_STATUS } from '@/constants/crm';

export const dynamic = 'force-dynamic';

export default async function CrmPage() {
  let initialCampaigns: any[] = [];
  let initialConsents: any[] = [];
  let initialSegments: any[] = [];
  let customers: any[] = [];
  let stats = {
    totalCustomers: 0,
    optInCount: 0,
    optOutCount: 0,
    optInRatio: 0,
    activeCampaignsCount: 0,
  };

  try {
    const ctx = await getAuthenticatedContext();
    const dealerId = ctx.dealerId;
    const role = ctx.role;

    const whereClause: any = {};
    if (role !== 'SUPER_ADMIN') {
      whereClause.dealerId = dealerId;
    }

    const [camps, cons, segs, custs, totalCustCount, optInCnt, optOutCnt, activeCamps] = await Promise.all([
      prisma.campaign.findMany({
        where: whereClause,
        include: {
          segment: { select: { id: true, name: true, type: true } },
          _count: { select: { recipients: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.contactConsent.findMany({
        where: whereClause,
        include: {
          customer: {
            select: { id: true, name: true, phone: true, loyaltyPoints: true, loyaltyTier: true },
          },
        },
        orderBy: { updatedAt: 'desc' },
      }),
      prisma.customerSegment.findMany({
        where: whereClause,
        include: {
          _count: { select: { campaigns: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.customer.findMany({
        where: whereClause,
        select: {
          id: true,
          name: true,
          phone: true,
          rfmMonetaryTL: true,
          loyaltyPoints: true,
        },
        orderBy: { name: 'asc' },
      }),
      prisma.customer.count({ where: whereClause }),
      prisma.contactConsent.count({ where: { ...whereClause, status: CRM_CONSENT_STATUS.OPT_IN } }),
      prisma.contactConsent.count({ where: { ...whereClause, status: CRM_CONSENT_STATUS.OPT_OUT } }),
      prisma.campaign.count({ where: { ...whereClause, status: 'ACTIVE' } }),
    ]);

    // Safe Date serialization
    initialCampaigns = camps.map((c: any) => ({
      ...c,
      scheduledAt: c.scheduledAt ? (c.scheduledAt instanceof Date ? c.scheduledAt.toISOString() : new Date(c.scheduledAt).toISOString()) : null,
      startedAt: c.startedAt ? (c.startedAt instanceof Date ? c.startedAt.toISOString() : new Date(c.startedAt).toISOString()) : null,
      completedAt: c.completedAt ? (c.completedAt instanceof Date ? c.completedAt.toISOString() : new Date(c.completedAt).toISOString()) : null,
      createdAt: c.createdAt ? (c.createdAt instanceof Date ? c.createdAt.toISOString() : new Date(c.createdAt).toISOString()) : new Date().toISOString(),
      updatedAt: c.updatedAt ? (c.updatedAt instanceof Date ? c.updatedAt.toISOString() : new Date(c.updatedAt).toISOString()) : new Date().toISOString(),
    }));

    initialConsents = cons.map((c: any) => ({
      ...c,
      consentDate: c.consentDate ? (c.consentDate instanceof Date ? c.consentDate.toISOString() : new Date(c.consentDate).toISOString()) : new Date().toISOString(),
      revokedAt: c.revokedAt ? (c.revokedAt instanceof Date ? c.revokedAt.toISOString() : new Date(c.revokedAt).toISOString()) : null,
      createdAt: c.createdAt ? (c.createdAt instanceof Date ? c.createdAt.toISOString() : new Date(c.createdAt).toISOString()) : new Date().toISOString(),
      updatedAt: c.updatedAt ? (c.updatedAt instanceof Date ? c.updatedAt.toISOString() : new Date(c.updatedAt).toISOString()) : new Date().toISOString(),
    }));

    initialSegments = segs.map((s: any) => ({
      ...s,
      createdAt: s.createdAt ? (s.createdAt instanceof Date ? s.createdAt.toISOString() : new Date(s.createdAt).toISOString()) : new Date().toISOString(),
      updatedAt: s.updatedAt ? (s.updatedAt instanceof Date ? s.updatedAt.toISOString() : new Date(s.updatedAt).toISOString()) : new Date().toISOString(),
    }));

    customers = custs;

    stats = {
      totalCustomers: totalCustCount,
      optInCount: optInCnt,
      optOutCount: optOutCnt,
      optInRatio: totalCustCount > 0 ? Math.round((optInCnt / totalCustCount) * 100) : 0,
      activeCampaignsCount: activeCamps,
    };
  } catch (error) {
    console.error('CRM Page Server Hatası:', error);
  }

  return (
    <CrmClient
      initialCampaigns={initialCampaigns}
      initialConsents={initialConsents}
      initialSegments={initialSegments}
      customers={customers}
      stats={stats}
    />
  );
}
