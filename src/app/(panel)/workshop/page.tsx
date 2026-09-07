import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { SUPPORTED_SCRAP_CARATS } from '@/constants/workshop';
import WorkshopClient from './WorkshopClient';

export const dynamic = 'force-dynamic';

export default async function WorkshopPage() {
  let session = null;
  try {
    session = await auth();
  } catch (e) {
    console.error('[WorkshopPage] Auth error:', e);
  }

  if (!session) {
    redirect('/login');
  }

  const currentUserRole = (session.user as any)?.role || 'ADMIN';
  const currentUserDealerId = (session.user as any)?.dealerId || 'merkez';

  let whereClause: any = {};
  if (currentUserRole !== 'SUPER_ADMIN') {
    whereClause.dealerId = currentUserDealerId;
  }

  try {
    const [dbJobs, dbScrap, dbDeposits, dbCustomers] = await Promise.all([
      prisma.workshopJob.findMany({
        where: whereClause,
        orderBy: { createdAt: 'desc' },
        take: 100,
      }).catch(() => []),
      prisma.scrapInventory.findMany({
        where: whereClause,
        orderBy: { carat: 'asc' },
      }).catch(() => []),
      prisma.customerDeposit.findMany({
        where: whereClause,
        include: {
          customer: {
            select: { id: true, name: true, phone: true, loyaltyPoints: true, emanetGold: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }).catch(() => []),
      prisma.customer.findMany({
        where: whereClause,
        select: { id: true, name: true, phone: true, loyaltyPoints: true, emanetGold: true },
        orderBy: { name: 'asc' },
      }).catch(() => []),
    ]);

    // Eğer scrap inventory boşsa varsayılanları doldur
    let scrapList = dbScrap;
    if (scrapList.length === 0) {
      for (const carat of SUPPORTED_SCRAP_CARATS) {
        await prisma.scrapInventory.upsert({
          where: {
            dealerId_carat: {
              dealerId: currentUserDealerId,
              carat,
            },
          },
          update: {},
          create: {
            dealerId: currentUserDealerId,
            carat,
            weight: 0,
            pureWeight: 0,
          },
        }).catch(() => null);
      }
      scrapList = await prisma.scrapInventory.findMany({
        where: whereClause,
        orderBy: { carat: 'asc' },
      }).catch(() => []);
    }

    const serializedJobs = dbJobs.map((j) => ({
      ...j,
      createdAt: j.createdAt
        ? j.createdAt instanceof Date
          ? j.createdAt.toISOString()
          : new Date(j.createdAt).toISOString()
        : new Date().toISOString(),
      updatedAt: j.updatedAt
        ? j.updatedAt instanceof Date
          ? j.updatedAt.toISOString()
          : new Date(j.updatedAt).toISOString()
        : new Date().toISOString(),
      deliveryDate: j.deliveryDate
        ? j.deliveryDate instanceof Date
          ? j.deliveryDate.toISOString()
          : new Date(j.deliveryDate).toISOString()
        : null,
      completedDate: j.completedDate
        ? j.completedDate instanceof Date
          ? j.completedDate.toISOString()
          : new Date(j.completedDate).toISOString()
        : null,
    }));

    const serializedDeposits = dbDeposits.map((d) => ({
      ...d,
      createdAt: d.createdAt
        ? d.createdAt instanceof Date
          ? d.createdAt.toISOString()
          : new Date(d.createdAt).toISOString()
        : new Date().toISOString(),
      updatedAt: d.updatedAt
        ? d.updatedAt instanceof Date
          ? d.updatedAt.toISOString()
          : new Date(d.updatedAt).toISOString()
        : new Date().toISOString(),
    }));

    return (
      <WorkshopClient
        initialJobs={serializedJobs}
        initialScrap={scrapList}
        initialDeposits={serializedDeposits}
        customers={dbCustomers}
      />
    );
  } catch (error) {
    console.error('[WorkshopPage] Server error:', error);
    return (
      <WorkshopClient
        initialJobs={[]}
        initialScrap={[]}
        initialDeposits={[]}
        customers={[]}
      />
    );
  }
}
