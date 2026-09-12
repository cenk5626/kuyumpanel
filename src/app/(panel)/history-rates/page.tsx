import prisma from '@/lib/prisma';
import { getAuthenticatedContext } from '@/lib/security/auth-context';
import HistoryRatesClient from './HistoryRatesClient';

export const dynamic = 'force-dynamic';

export default async function HistoryRatesPage() {
  try {
    const ctx = await getAuthenticatedContext();
    const dealerId = ctx.dealerId;

    const [recentSnapshots, recentMilyemSnapshots] = await Promise.all([
      prisma.priceSnapshot.findMany({
        where: { dealerId },
        include: {
          items: true,
        },
        orderBy: { capturedAt: 'desc' },
        take: 100,
      }),
      prisma.milyemSnapshot.findMany({
        where: { dealerId },
        include: {
          items: true,
        },
        orderBy: { capturedAt: 'desc' },
        take: 50,
      }),
    ]);

    const safeSnapshots = recentSnapshots.map((s) => ({
      ...s,
      capturedAt: s.capturedAt instanceof Date ? s.capturedAt.toISOString() : new Date(s.capturedAt).toISOString(),
      createdAt: s.createdAt instanceof Date ? s.createdAt.toISOString() : new Date(s.createdAt).toISOString(),
      items: s.items.map((i) => ({
        ...i,
        providerUpdatedAt: i.providerUpdatedAt
          ? i.providerUpdatedAt instanceof Date
            ? i.providerUpdatedAt.toISOString()
            : new Date(i.providerUpdatedAt).toISOString()
          : null,
        createdAt: i.createdAt instanceof Date ? i.createdAt.toISOString() : new Date(i.createdAt).toISOString(),
      })),
    }));

    const safeMilyem = recentMilyemSnapshots.map((m) => ({
      ...m,
      capturedAt: m.capturedAt instanceof Date ? m.capturedAt.toISOString() : new Date(m.capturedAt).toISOString(),
      createdAt: m.createdAt instanceof Date ? m.createdAt.toISOString() : new Date(m.createdAt).toISOString(),
      items: m.items.map((i) => ({
        ...i,
        createdAt: i.createdAt instanceof Date ? i.createdAt.toISOString() : new Date(i.createdAt).toISOString(),
      })),
    }));

    return (
      <HistoryRatesClient
        initialSnapshots={safeSnapshots}
        initialMilyemSnapshots={safeMilyem}
      />
    );
  } catch (error) {
    console.error('[HistoryRatesPage] Server error:', error);
    return (
      <div className="p-8 text-center text-red-500">
        Geçmiş kur ve milyem verileri yüklenirken bir hata oluştu.
      </div>
    );
  }
}
