import { prisma } from '@/lib/prisma';
import { getAuthenticatedContext } from '@/lib/security/auth-context';
import ServicesClient from './ServicesClient';

export const dynamic = 'force-dynamic';

export default async function ServicesPage() {
  try {
    const ctx = await getAuthenticatedContext();
    const dealerId = ctx.dealerId;
    const role = ctx.role;

    const whereClause: any = {};
    if (role !== 'SUPER_ADMIN') {
      whereClause.dealerId = dealerId;
    }

    const [orders, customers, branches, workshopJobs] = await Promise.all([
      prisma.serviceOrder.findMany({
        where: whereClause,
        include: {
          customer: { select: { id: true, name: true, phone: true } },
          branch: { select: { id: true, name: true, code: true } },
          workshopJob: { select: { id: true, jobNo: true, workshopName: true } },
          events: { orderBy: { createdAt: 'desc' }, take: 5 },
          photos: { select: { id: true, fileName: true, mimeType: true, fileSize: true, photoType: true, storageReference: true, createdAt: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 100,
      }),
      prisma.customer.findMany({
        where: whereClause,
        select: { id: true, name: true, phone: true },
        orderBy: { name: 'asc' },
        take: 200,
      }),
      prisma.branch.findMany({
        where: whereClause,
        select: { id: true, name: true, code: true },
      }),
      prisma.workshopJob.findMany({
        where: whereClause,
        select: { id: true, jobNo: true, workshopName: true, status: true },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
    ]);

    const safeOrders = orders.map((ord) => ({
      ...ord,
      promisedDate: ord.promisedDate
        ? ord.promisedDate instanceof Date
          ? ord.promisedDate.toISOString()
          : new Date(ord.promisedDate).toISOString()
        : new Date().toISOString(),
      deliveredAt: ord.deliveredAt
        ? ord.deliveredAt instanceof Date
          ? ord.deliveredAt.toISOString()
          : new Date(ord.deliveredAt).toISOString()
        : null,
      customerApprovalDate: ord.customerApprovalDate
        ? ord.customerApprovalDate instanceof Date
          ? ord.customerApprovalDate.toISOString()
          : new Date(ord.customerApprovalDate).toISOString()
        : null,
      warrantyExpiresAt: ord.warrantyExpiresAt
        ? ord.warrantyExpiresAt instanceof Date
          ? ord.warrantyExpiresAt.toISOString()
          : new Date(ord.warrantyExpiresAt).toISOString()
        : null,
      createdAt: ord.createdAt
        ? ord.createdAt instanceof Date
          ? ord.createdAt.toISOString()
          : new Date(ord.createdAt).toISOString()
        : new Date().toISOString(),
      updatedAt: ord.updatedAt
        ? ord.updatedAt instanceof Date
          ? ord.updatedAt.toISOString()
          : new Date(ord.updatedAt).toISOString()
        : new Date().toISOString(),
      events: ord.events.map((e) => ({
        ...e,
        createdAt: e.createdAt
          ? e.createdAt instanceof Date
            ? e.createdAt.toISOString()
            : new Date(e.createdAt).toISOString()
          : new Date().toISOString(),
      })),
      photos: (ord.photos || []).map((p) => ({
        ...p,
        createdAt: p.createdAt
          ? p.createdAt instanceof Date
            ? p.createdAt.toISOString()
            : new Date(p.createdAt).toISOString()
          : new Date().toISOString(),
      })),
    }));

    return (
      <ServicesClient
        initialOrders={safeOrders}
        customers={customers}
        branches={branches}
        workshopJobs={workshopJobs}
      />
    );
  } catch (error) {
    console.error('[ServicesPage] Server error:', error);
    return (
      <ServicesClient
        initialOrders={[]}
        customers={[]}
        branches={[]}
        workshopJobs={[]}
      />
    );
  }
}
