import { prisma } from '@/lib/prisma';
import { getAuthenticatedContext } from '@/lib/security/auth-context';
import RfidStocktakeClient from './RfidStocktakeClient';

export const dynamic = 'force-dynamic';

export default async function RfidStocktakePage() {
  let initialSessions: any[] = [];
  let latestSession: any = null;

  try {
    const ctx = await getAuthenticatedContext();
    const dealerId = ctx.dealerId;

    const sessions = await prisma.rfidStocktakeSession.findMany({
      where: { dealerId },
      include: {
        items: {
          orderBy: [{ matchStatus: 'asc' }, { carat: 'desc' }],
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    initialSessions = sessions.map((s) => ({
      id: s.id,
      sessionNumber: s.sessionNumber,
      location: s.location,
      status: s.status,
      expectedCount: s.expectedCount,
      scannedCount: s.scannedCount,
      matchedCount: s.matchedCount,
      missingCount: s.missingCount,
      surplusCount: s.surplusCount,
      startedBy: s.startedBy,
      completedBy: s.completedBy,
      startedAt: s.startedAt
        ? s.startedAt instanceof Date
          ? s.startedAt.toISOString()
          : new Date(s.startedAt).toISOString()
        : new Date().toISOString(),
      completedAt: s.completedAt
        ? s.completedAt instanceof Date
          ? s.completedAt.toISOString()
          : new Date(s.completedAt).toISOString()
        : null,
      notes: s.notes,
      items: s.items.map((it) => ({
        id: it.id,
        epc: it.epc,
        barcode: it.barcode,
        title: it.title,
        carat: it.carat,
        weight: it.weight,
        expectedLocation: it.expectedLocation,
        actualLocation: it.actualLocation,
        matchStatus: it.matchStatus,
        readCount: it.readCount,
        rssi: it.rssi,
        scannedAt: it.scannedAt
          ? it.scannedAt instanceof Date
            ? it.scannedAt.toISOString()
            : new Date(it.scannedAt).toISOString()
          : null,
      })),
    }));

    if (initialSessions.length > 0) {
      latestSession = initialSessions[0];
    }
  } catch (error) {
    console.error('[RfidStocktakePage Load Error]:', error);
  }

  return (
    <RfidStocktakeClient
      initialSessions={initialSessions}
      currentSession={latestSession}
    />
  );
}
