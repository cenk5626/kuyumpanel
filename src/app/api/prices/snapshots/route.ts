import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthenticatedContext } from '@/lib/security/auth-context';
import { capturePriceSnapshot, getCaptureSlotKey } from '@/lib/rates/snapshot-engine';
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
    const productCode = searchParams.get('productCode');
    const source = searchParams.get('source');
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

    if (source && source !== 'ALL') {
      whereClause.source = source;
    }

    const snapshots = await prisma.priceSnapshot.findMany({
      where: whereClause,
      include: {
        items: productCode && productCode !== 'ALL'
          ? { where: { productCode } }
          : true,
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
    console.error('[API Prices Snapshots] GET Error:', error);
    return NextResponse.json({ error: 'Geçmiş fiyat kayıtları alınamadı.' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    // 1. Cron secret veya Kullanıcı Oturumu Doğrulaması
    const authHeader = req.headers.get('authorization');
    const cronSecretHeader = req.headers.get('x-cron-secret');
    const expectedSecret = process.env.CRON_SECRET || 'kuyumpanel-cron-secret-key-2026';

    let dealerId: string | null = null;
    let isCron = false;

    if (
      (authHeader && authHeader === `Bearer ${expectedSecret}`) ||
      (cronSecretHeader && cronSecretHeader === expectedSecret)
    ) {
      isCron = true;
      // Cron çağrısında body'den dealerId veya ilk aktif bayi alınır
      try {
        const body = await req.json();
        dealerId = body.dealerId;
      } catch {
        // Body boş olabilir
      }

      if (!dealerId) {
        const firstDealer = await prisma.dealer.findFirst({ select: { id: true } });
        dealerId = firstDealer?.id || null;
      }
    } else {
      // Normal kullanıcı oturumu
      const ctx = await getAuthenticatedContext();
      dealerId = ctx.dealerId;
    }

    if (!dealerId) {
      return NextResponse.json({ error: 'Geçerli bayi bulunamadı.' }, { status: 400 });
    }

    let customItems: any = undefined;
    try {
      const body = await req.clone().json();
      customItems = body.items;
    } catch {}

    const result = await capturePriceSnapshot(dealerId, {
      source: isCron ? SNAPSHOT_SOURCE.SYSTEM : SNAPSHOT_SOURCE.MANUAL,
      customItems,
    });

    if (!isCron) {
      await logActivity({
        dealerId,
        action: 'MANUAL_PRICE_SNAPSHOT',
        details: `Manuel kur snapshot'ı alındı: Slot=${result.snapshot.captureSlotKey}, Yeni=${result.isNew}`,
      });
    }

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
    console.error('[API Prices Snapshots] POST Error:', error);
    return NextResponse.json({ error: 'Fiyat snapshot kaydı oluşturulamadı.' }, { status: 500 });
  }
}
