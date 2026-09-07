import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedContext } from '@/lib/security/auth-context';
import { RFID_TAG_STATUS, RFID_ERRORS } from '@/constants/rfid';
import { generateEpcFromBarcode } from '@/lib/rfid/rfid-engine';

export const dynamic = 'force-dynamic';

/**
 * GET /api/rfid/tags
 * Kayıtlı RFID etiketlerini listeler.
 */
export async function GET(request: NextRequest) {
  try {
    const ctx = await getAuthenticatedContext();
    const dealerId = ctx.dealerId;

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search')?.trim();
    const location = searchParams.get('location')?.trim();

    const where: any = { dealerId };
    if (location && location !== 'TÜMÜ') {
      where.location = location;
    }
    if (search) {
      where.OR = [
        { epc: { contains: search } },
        { barcode: { contains: search } },
      ];
    }

    const tags = await prisma.rfidTag.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      take: 100,
    });

    return NextResponse.json({ success: true, tags });
  } catch (error: any) {
    console.error('[API RFID Tags GET Error]:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Etiketler listelenemedi' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/rfid/tags
 * Barkod ile RFID etiketini eşleştirir veya günceller.
 */
export async function POST(request: NextRequest) {
  try {
    const ctx = await getAuthenticatedContext();
    const dealerId = ctx.dealerId;

    const body = await request.json();
    const { barcode, epc: userEpc, location = 'VİTRİN_1' } = body;

    if (!barcode) {
      return NextResponse.json(
        { success: false, error: 'Barkod bilgisi zorunludur' },
        { status: 400 }
      );
    }

    // EPC verilmemişse barkoddan otomatik deterministik EPC türet
    const epc = userEpc ? userEpc.trim().toUpperCase() : generateEpcFromBarcode(barcode);

    // Ürünün veritabanında var olup olmadığını kontrol et
    const product = await prisma.productItem.findFirst({
      where: { barcode, dealerId },
    });

    const tag = await prisma.rfidTag.upsert({
      where: {
        dealerId_epc: { dealerId, epc },
      },
      create: {
        dealerId,
        epc,
        barcode,
        location,
        status: RFID_TAG_STATUS.ACTIVE,
      },
      update: {
        barcode,
        location,
        status: RFID_TAG_STATUS.ACTIVE,
      },
    });

    return NextResponse.json({
      success: true,
      tag,
      product: product
        ? {
            title: product.title,
            carat: product.carat,
            weight: product.weight,
          }
        : null,
    });
  } catch (error: any) {
    console.error('[API RFID Tags POST Error]:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'RFID etiketi kaydedilemedi' },
      { status: 500 }
    );
  }
}
