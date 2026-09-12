import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthenticatedContext } from '@/lib/security/auth-context';
import { captureMilyemSnapshot, getCaptureSlotKey } from '@/lib/rates/snapshot-engine';
import { logActivity } from '@/lib/logger';
import { SNAPSHOT_SOURCE } from '@/constants/history-rates';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const ctx = await getAuthenticatedContext();
    const dealerId = ctx.dealerId;

    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 500);

    const whereClause: any = { dealerId };

    if (startDate || endDate) {
      whereClause.capturedAt = {};
      if (startDate) whereClause.capturedAt.gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        whereClause.capturedAt.lte = end;
      }
    }

    const snapshots = await prisma.milyemSnapshot.findMany({
      where: whereClause,
      include: {
        items: true,
      },
      orderBy: { capturedAt: 'desc' },
      take: limit,
    });

    return NextResponse.json({
      snapshots,
      currentSlot: getCaptureSlotKey(),
    });
  } catch (error: any) {
    if (error.statusCode === 401 || error.statusCode === 403) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error('[API Milyem Snapshots] GET Error:', error);
    return NextResponse.json({ error: 'Geçmiş milyem kayıtları alınamadı.' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const ctx = await getAuthenticatedContext();
    const dealerId = ctx.dealerId;

    const result = await captureMilyemSnapshot(dealerId, {
      source: SNAPSHOT_SOURCE.MANUAL,
    });

    await logActivity({
      dealerId,
      action: 'MANUAL_MILYEM_SNAPSHOT',
      details: `Manuel milyem snapshot'ı alındı: Slot=${result.snapshot.captureSlotKey}, Yeni=${result.isNew}`,
    });

    return NextResponse.json({
      success: true,
      snapshot: result.snapshot,
      isNew: result.isNew,
      slotKey: result.snapshot.captureSlotKey,
    });
  } catch (error: any) {
    if (error.statusCode === 401 || error.statusCode === 403) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error('[API Milyem Snapshots] POST Error:', error);
    return NextResponse.json({ error: 'Milyem snapshot kaydı oluşturulamadı.' }, { status: 500 });
  }
}
