import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';
import HistoryRatesClient from './HistoryRatesClient';

export const dynamic = 'force-dynamic';

export default async function HistoryRatesPage() {
  let session = null;
  try {
    session = await auth();
  } catch (e) {
    console.error('[HistoryRatesPage] Auth error:', e);
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

  let safeSnapshots: any[] = [];
  let safeMilyem: any[] = [];

  try {
    const [recentSnapshots, recentMilyemSnapshots] = await Promise.all([
      prisma.priceSnapshot.findMany({
        where: whereClause,
        include: {
          items: true,
        },
        orderBy: { capturedAt: 'desc' },
        take: 100,
      }).catch((err) => {
        console.warn('[HistoryRatesPage] snapshots query fallback:', err.message);
        return [];
      }),
      prisma.milyemSnapshot.findMany({
        where: whereClause,
        include: {
          items: true,
        },
        orderBy: { capturedAt: 'desc' },
        take: 50,
      }).catch((err) => {
        console.warn('[HistoryRatesPage] milyem query fallback:', err.message);
        return [];
      }),
    ]);

    safeSnapshots = (recentSnapshots || []).map((s) => ({
      ...s,
      capturedAt: s.capturedAt instanceof Date ? s.capturedAt.toISOString() : new Date(s.capturedAt).toISOString(),
      createdAt: s.createdAt instanceof Date ? s.createdAt.toISOString() : new Date(s.createdAt).toISOString(),
      items: (s.items || []).map((i) => ({
        ...i,
        providerUpdatedAt: i.providerUpdatedAt
          ? i.providerUpdatedAt instanceof Date
            ? i.providerUpdatedAt.toISOString()
            : new Date(i.providerUpdatedAt).toISOString()
          : null,
        createdAt: i.createdAt instanceof Date ? i.createdAt.toISOString() : new Date(i.createdAt).toISOString(),
      })),
    }));

    safeMilyem = (recentMilyemSnapshots || []).map((m) => ({
      ...m,
      capturedAt: m.capturedAt instanceof Date ? m.capturedAt.toISOString() : new Date(m.capturedAt).toISOString(),
      createdAt: m.createdAt instanceof Date ? m.createdAt.toISOString() : new Date(m.createdAt).toISOString(),
      items: (m.items || []).map((i) => ({
        ...i,
        createdAt: i.createdAt instanceof Date ? i.createdAt.toISOString() : new Date(i.createdAt).toISOString(),
      })),
    }));
  } catch (error) {
    console.error('[HistoryRatesPage] Data fetch error:', error);
  }

  return (
    <HistoryRatesClient
      initialSnapshots={safeSnapshots}
      initialMilyemSnapshots={safeMilyem}
    />
  );
}
