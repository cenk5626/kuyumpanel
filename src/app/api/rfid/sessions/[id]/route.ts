import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedContext } from '@/lib/security/auth-context';
import {
  RFID_SESSION_STATUS,
  RFID_ERRORS,
} from '@/constants/rfid';
import {
  reconcileRfidScan,
  formatRfidAuditSummary,
  ScannedTag,
} from '@/lib/rfid/rfid-engine';

export const dynamic = 'force-dynamic';

/**
 * GET /api/rfid/sessions/[id]
 * Sayım oturumu detayını ve kalemlerini döner.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await getAuthenticatedContext();
    const dealerId = ctx.dealerId;
    const { id } = await params;

    const session = await prisma.rfidStocktakeSession.findFirst({
      where: { id, dealerId },
      include: {
        items: {
          orderBy: [{ matchStatus: 'asc' }, { carat: 'desc' }],
        },
      },
    });

    if (!session) {
      return NextResponse.json(
        { success: false, error: RFID_ERRORS.SESSION_NOT_FOUND },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, session });
  } catch (error: any) {
    console.error('[API RFID Session GET Error]:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Oturum detayı alınamadı' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/rfid/sessions/[id]
 * Taranan RFID etiket akışını işler, mutabakat yapar ve oturumu tamamlar.
 * Body: { scannedTags: ScannedTag[], complete?: boolean }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await getAuthenticatedContext();
    const dealerId = ctx.dealerId;
    const { id } = await params;

    const body = await request.json();
    const { scannedTags = [], complete = false } = body;

    const session = await prisma.rfidStocktakeSession.findFirst({
      where: { id, dealerId },
      include: { items: true },
    });

    if (!session) {
      return NextResponse.json(
        { success: false, error: RFID_ERRORS.SESSION_NOT_FOUND },
        { status: 404 }
      );
    }

    if (session.status === RFID_SESSION_STATUS.COMPLETED) {
      return NextResponse.json(
        { success: false, error: RFID_ERRORS.SESSION_ALREADY_COMPLETED },
        { status: 400 }
      );
    }

    // Beklenen ürünleri hazırla
    const expectedItems = session.items.map((it) => ({
      epc: it.epc,
      barcode: it.barcode || '',
      title: it.title || '',
      carat: it.carat ?? undefined,
      weight: it.weight ?? undefined,
      expectedLocation: it.expectedLocation ?? undefined,
    }));

    // Mutabakat motorunu çalıştır
    const reconciliation = reconcileRfidScan(
      expectedItems,
      scannedTags as ScannedTag[],
      session.location
    );

    // Veritabanı güncellemesi
    const updatedSession = await prisma.$transaction(async (tx) => {
      // 1. Mevcut item kayıtlarını güncelle
      for (const recItem of reconciliation.items) {
        const existing = session.items.find((i) => i.epc === recItem.epc);
        if (existing) {
          await tx.rfidStocktakeItem.update({
            where: { id: existing.id },
            data: {
              matchStatus: recItem.matchStatus,
              readCount: recItem.readCount,
              rssi: recItem.rssi ?? null,
              actualLocation: recItem.actualLocation || null,
              scannedAt: recItem.readCount > 0 ? new Date() : null,
            },
          });
        } else {
          // Fazla (SURPLUS) ürün ekle
          await tx.rfidStocktakeItem.create({
            data: {
              sessionId: session.id,
              epc: recItem.epc,
              barcode: recItem.barcode || null,
              title: recItem.title || 'Fazla RFID Etiketi',
              expectedLocation: 'Bilinmiyor',
              actualLocation: session.location,
              matchStatus: recItem.matchStatus,
              readCount: recItem.readCount,
              rssi: recItem.rssi ?? null,
              scannedAt: new Date(),
            },
          });
        }
      }

      // 2. Oturum özetini güncelle
      return await tx.rfidStocktakeSession.update({
        where: { id },
        data: {
          scannedCount: reconciliation.totalScanned,
          matchedCount: reconciliation.matchedCount,
          missingCount: reconciliation.missingCount,
          surplusCount: reconciliation.surplusCount,
          status: complete ? RFID_SESSION_STATUS.COMPLETED : session.status,
          completedAt: complete ? new Date() : null,
          completedBy: complete ? ctx.userName || ctx.userEmail.split('@')[0] : null,
        },
        include: {
          items: {
            orderBy: [{ matchStatus: 'asc' }, { carat: 'desc' }],
          },
        },
      });
    });

    const auditSummary = formatRfidAuditSummary(
      updatedSession.sessionNumber,
      updatedSession.location,
      reconciliation
    );

    return NextResponse.json({
      success: true,
      session: updatedSession,
      reconciliation,
      auditSummary,
    });
  } catch (error: any) {
    console.error('[API RFID Session Reconcile Error]:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Sayım mutabakatı gerçekleştirilemedi' },
      { status: 500 }
    );
  }
}
