import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedContext } from '@/lib/security/auth-context';
import {
  RFID_SESSION_STATUS,
  RFID_MATCH_STATUS,
  RFID_DEFAULTS,
  RfidLocation,
} from '@/constants/rfid';
import { generateEpcFromBarcode } from '@/lib/rfid/rfid-engine';

export const dynamic = 'force-dynamic';

/**
 * GET /api/rfid/sessions
 * Bayiye ait RFID sayım oturumlarını listeler.
 */
export async function GET() {
  try {
    const ctx = await getAuthenticatedContext();
    const dealerId = ctx.dealerId;

    const sessions = await prisma.rfidStocktakeSession.findMany({
      where: { dealerId },
      include: {
        _count: {
          select: { items: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return NextResponse.json({ success: true, sessions });
  } catch (error: any) {
    console.error('[API RFID Sessions GET Error]:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Sayım oturumları listelenemedi' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/rfid/sessions
 * Yeni bir RFID sayım oturumu başlatır ve beklenen ürünleri yükler.
 */
export async function POST(request: NextRequest) {
  try {
    const ctx = await getAuthenticatedContext();
    const dealerId = ctx.dealerId;

    const body = await request.json();
    const { location = RFID_DEFAULTS.DEFAULT_LOCATION, notes } = body;

    // Oturum numarasını oluştur (Örn: RFID-2026-0001)
    const count = await prisma.rfidStocktakeSession.count({ where: { dealerId } });
    const year = new Date().getFullYear();
    const sessionNumber = `${RFID_DEFAULTS.SESSION_PREFIX}-${year}-${String(count + 1).padStart(4, '0')}`;

    // Mevcut stokta olan (IN_STOCK) ürünleri getir
    const productWhere: any = {
      dealerId,
      status: 'IN_STOCK',
    };

    const products = await prisma.productItem.findMany({
      where: productWhere,
      take: 200,
    });

    // Kayıtlı RFID etiketlerini getir
    const registeredTags = await prisma.rfidTag.findMany({
      where: { dealerId },
    });
    const tagMapByBarcode = new Map<string, string>();
    for (const t of registeredTags) {
      tagMapByBarcode.set(t.barcode, t.epc);
    }

    // Beklenen ürünleri hazırla
    const expectedItemsData = products.map((p) => {
      const epc = tagMapByBarcode.get(p.barcode) || generateEpcFromBarcode(p.barcode);
      return {
        epc,
        barcode: p.barcode,
        title: p.title || p.category || 'Ürün',
        carat: p.carat,
        weight: p.weight,
        expectedLocation: location,
        matchStatus: RFID_MATCH_STATUS.MISSING,
      };
    });

    // Sayım oturumunu ve başlangıç satırlarını oluştur
    const session = await prisma.rfidStocktakeSession.create({
      data: {
        dealerId,
        sessionNumber,
        location,
        status: RFID_SESSION_STATUS.ACTIVE,
        expectedCount: expectedItemsData.length,
        scannedCount: 0,
        matchedCount: 0,
        missingCount: expectedItemsData.length,
        surplusCount: 0,
        startedBy: ctx.userName || ctx.userEmail.split('@')[0],
        notes: notes || null,
        items: {
          create: expectedItemsData,
        },
      },
      include: {
        items: true,
      },
    });

    return NextResponse.json({
      success: true,
      session,
    });
  } catch (error: any) {
    console.error('[API RFID Sessions POST Error]:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Sayım oturumu başlatılamadı' },
      { status: 500 }
    );
  }
}
