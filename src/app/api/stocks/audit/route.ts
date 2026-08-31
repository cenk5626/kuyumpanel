import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { logActivity } from '@/lib/logger';

export const dynamic = 'force-dynamic';

/**
 * GET /api/stocks/audit — Önceki sayım geçmişini listeler veya kategoriye göre mevcut stok listesini getirir.
 */
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const currentUserRole = (session.user as any)?.role;
    const currentUserDealerId = (session.user as any)?.dealerId || 'merkez';

    let whereDealer: any = {};
    if (currentUserRole !== 'SUPER_ADMIN') {
      whereDealer.dealerId = currentUserDealerId;
    }

    const { searchParams } = new URL(req.url);
    const category = searchParams.get('category'); // Opsiyonel kategori filtresi

    // Eğer anlık sayım için stok listesi isteniyorsa
    if (searchParams.get('fetchInventory') === 'true') {
      let productWhere: any = { ...whereDealer, status: 'IN_STOCK' };
      if (category && category !== 'ALL') {
        productWhere.category = category;
      }

      const products = await prisma.productItem.findMany({
        where: productWhere,
        orderBy: { barcode: 'asc' },
      });

      return NextResponse.json({
        products,
        totalCount: products.length,
        totalWeight: products.reduce((acc, p) => acc + (p.weight || 0), 0),
      });
    }

    // Geçmiş sayım oturumlarını getir
    const sessions = await prisma.stockAuditSession.findMany({
      where: whereDealer,
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    const parsed = sessions.map((s) => ({
      ...s,
      scannedBarcodes: JSON.parse(s.scannedBarcodes || '[]'),
      missingItems: JSON.parse(s.missingItems || '[]'),
    }));

    return NextResponse.json(parsed);
  } catch (error) {
    console.error('[API Stock Audit] GET Error:', error);
    return NextResponse.json([], { status: 200 });
  }
}

/**
 * POST /api/stocks/audit — Yeni vitrin sayımı oturumunu mutabakatla kaydeder.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const currentUserDealerId = (session.user as any)?.dealerId || 'merkez';
    const currentUserName = session.user?.name || 'Yetkili';
    const body = await req.json();

    const { scope, categoryFilter, scannedBarcodes, notes } = body;

    const barcodes: string[] = Array.isArray(scannedBarcodes) ? scannedBarcodes : [];

    // 1. Beklenen stokları veritabanından çek
    let whereClause: any = { dealerId: currentUserDealerId, status: 'IN_STOCK' };
    if (scope === 'CATEGORY' && categoryFilter && categoryFilter !== 'ALL') {
      whereClause.category = categoryFilter;
    }

    const expectedProducts = await prisma.productItem.findMany({
      where: whereClause,
    });

    const expectedBarcodeMap = new Map(expectedProducts.map((p) => [p.barcode, p]));
    const expectedWeight = expectedProducts.reduce((acc, p) => acc + (p.weight || 0), 0);

    // 2. Sayılan ve Eksik Ürünleri Hesapla
    let countedWeight = 0;
    let surplusCount = 0;
    const missingProducts: any[] = [];
    const scannedSet = new Set(barcodes);

    // Sayılan ürünlerin gramajını topla ve fazla olanları belirle
    barcodes.forEach((code) => {
      const match = expectedBarcodeMap.get(code);
      if (match) {
        countedWeight += match.weight || 0;
      } else {
        surplusCount++;
      }
    });

    // Beklenen ama taranmayan (eksik / kayıp riski) ürünleri belirle
    expectedProducts.forEach((p) => {
      if (!scannedSet.has(p.barcode)) {
        missingProducts.push({
          id: p.id,
          barcode: p.barcode,
          title: p.title || p.category || 'Takı Ürünü',
          category: p.category,
          subType: p.subType,
          carat: p.carat,
          weight: p.weight,
          costPrice: p.costPrice,
        });
      }
    });

    const totalExpected = expectedProducts.length;
    const totalCounted = barcodes.length;
    const totalMissing = missingProducts.length;
    const weightDiff = Number((countedWeight - expectedWeight).toFixed(3));

    const sessionCount = await prisma.stockAuditSession.count({ where: { dealerId: currentUserDealerId } });
    const sessionNumber = `SAYIM-${new Date().getFullYear()}-${String(sessionCount + 1).padStart(4, '0')}`;

    const newAudit = await prisma.stockAuditSession.create({
      data: {
        sessionNumber,
        dealerId: currentUserDealerId,
        scope: scope || 'ALL',
        categoryFilter: categoryFilter || null,
        status: 'COMPLETED',
        totalExpected,
        totalCounted,
        totalMissing,
        totalSurplus: surplusCount,
        expectedWeight: Number(expectedWeight.toFixed(3)),
        countedWeight: Number(countedWeight.toFixed(3)),
        weightDiff,
        scannedBarcodes: JSON.stringify(barcodes),
        missingItems: JSON.stringify(missingProducts),
        auditedBy: currentUserName,
        notes: notes || null,
      },
    });

    await logActivity({
      dealerId: currentUserDealerId,
      action: 'Vitrin Sayımı Yapıldı',
      details: `${sessionNumber} — Beklenen: ${totalExpected} adet, Sayılan: ${totalCounted} adet, Eksik: ${totalMissing} adet, Gram Farkı: ${weightDiff} gr.`,
      userEmail: session.user?.email || '',
      userName: currentUserName,
    });

    return NextResponse.json({
      ...newAudit,
      scannedBarcodes: barcodes,
      missingItems: missingProducts,
    }, { status: 201 });
  } catch (error) {
    console.error('[API Stock Audit] POST Error:', error);
    return NextResponse.json({ error: 'Sayım kaydedilirken bir hata oluştu.' }, { status: 500 });
  }
}
