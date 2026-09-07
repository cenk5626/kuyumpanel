import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedContext, assertTenantOwnership } from '@/lib/security/auth-context';
import { PO_STATUS, PO_DEFAULTS, PO_LINE_STATUS } from '@/constants/purchase';
import {
  generatePurchaseOrderNumber,
  calculateHasEquivalent,
} from '@/lib/purchase/variance-calculator';
import { logActivity } from '@/lib/logger';
import { sanitizeBody } from '@/lib/security/validation';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const ctx = await getAuthenticatedContext();
    const dealerId = ctx.dealerId;

    const { searchParams } = new URL(req.url);
    const supplierId = searchParams.get('supplierId');
    const status = searchParams.get('status');
    const branchId = searchParams.get('branchId');

    const whereClause: any = { dealerId };
    if (supplierId) whereClause.supplierId = supplierId;
    if (status && status !== 'ALL') whereClause.status = status;
    if (branchId) whereClause.branchId = branchId;

    const orders = await prisma.purchaseOrder.findMany({
      where: whereClause,
      include: {
        supplier: {
          select: { id: true, name: true, phone: true, hasBalance: true, tlBalance: true },
        },
        branch: {
          select: { id: true, name: true, code: true },
        },
        lines: true,
        receipts: {
          select: {
            id: true,
            receiptNumber: true,
            receiptDate: true,
            totalActualWeight: true,
            totalHasEquivalent: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });

    return NextResponse.json({ orders });
  } catch (error: any) {
    if (error.statusCode === 401 || error.statusCode === 403) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error('[API Purchases] GET Error:', error);
    return NextResponse.json({ error: 'Siparişler alınamadı.' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const ctx = await getAuthenticatedContext();
    const dealerId = ctx.dealerId;

    const rawBody = await req.json();
    const body = sanitizeBody(rawBody, [
      'supplierId',
      'branchId',
      'expectedDeliveryDate',
      'notes',
      'lines',
    ] as const);

    const {
      supplierId,
      branchId,
      expectedDeliveryDate,
      notes,
      lines,
    } = body;

    if (!supplierId) {
      return NextResponse.json({ error: 'Tedarikçi (toptancı) seçimi zorunludur.' }, { status: 400 });
    }

    if (!lines || !Array.isArray(lines) || lines.length === 0) {
      return NextResponse.json({ error: 'En az bir sipariş kalemi eklenmelidir.' }, { status: 400 });
    }

    if (lines.length > PO_DEFAULTS.MAX_LINES_PER_ORDER) {
      return NextResponse.json(
        { error: `Tek siparişte en fazla ${PO_DEFAULTS.MAX_LINES_PER_ORDER} kalem eklenebilir.` },
        { status: 400 }
      );
    }

    // Tedarikçi Bayi Kontrolü (IDOR Önlemi)
    const supplier = await prisma.supplier.findUnique({
      where: { id: supplierId },
    });
    if (!supplier) {
      return NextResponse.json({ error: 'Seçilen toptancı bulunamadı.' }, { status: 404 });
    }
    assertTenantOwnership(ctx, supplier.dealerId, 'Supplier');

    // Sipariş numarası üretimi
    const currentYear = new Date().getFullYear();
    const existingCount = await prisma.purchaseOrder.count({
      where: { dealerId },
    });
    const orderNumber = generatePurchaseOrderNumber(existingCount, currentYear);

    // Toplam tahmini ağırlık ve Has hesaplaması
    let totalWeight = 0;
    let totalHas = 0;
    let totalTl = 0;

    const sanitizedLines = lines.map((l: any) => {
      const carat = Number(l.carat) || 14;
      const weight = Number(l.orderedWeight) || 0;
      const qty = Number(l.orderedQuantity) || 1;
      const laborPerGr = Number(l.laborCostPerGram) || 0;
      const lineHas = calculateHasEquivalent(weight, carat);

      totalWeight += weight;
      totalHas += lineHas;
      totalTl += weight * laborPerGr;

      return {
        productCategory: String(l.productCategory || 'DIGER').trim(),
        description: String(l.description || 'Takı Siparişi').trim(),
        carat,
        orderedWeight: weight,
        orderedQuantity: qty,
        laborCostPerGram: laborPerGr,
        laborCurrency: String(l.laborCurrency || 'TL').trim(),
        status: PO_LINE_STATUS.PENDING,
        notes: l.notes ? String(l.notes).trim() : null,
      };
    });

    const newOrder = await prisma.purchaseOrder.create({
      data: {
        dealerId,
        supplierId,
        branchId: branchId || null,
        orderNumber,
        expectedDeliveryDate: expectedDeliveryDate ? new Date(expectedDeliveryDate) : null,
        status: PO_STATUS.ORDERED,
        totalEstimatedWeight: totalWeight,
        totalEstimatedHas: totalHas,
        totalEstimatedTl: totalTl,
        notes: notes ? String(notes).trim() : null,
        createdBy: ctx.userName,
        lines: {
          create: sanitizedLines,
        },
      },
      include: {
        supplier: {
          select: { id: true, name: true, phone: true },
        },
        branch: {
          select: { id: true, name: true, code: true },
        },
        lines: true,
      },
    });

    await logActivity({
      dealerId,
      userId: ctx.userId,
      action: 'PURCHASE_ORDER_CREATE',
      details: `${orderNumber} nolu tedarik siparişi oluşturuldu. Tedarikçi: ${supplier.name}, Tahmini: ${totalWeight.toFixed(2)} gr (${totalHas.toFixed(2)} Has)`,
    });

    return NextResponse.json({ success: true, order: newOrder }, { status: 201 });
  } catch (error: any) {
    if (error.statusCode === 401 || error.statusCode === 403) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error('[API Purchases] POST Error:', error);
    return NextResponse.json({ error: 'Sipariş oluşturulurken bir hata meydana geldi.' }, { status: 500 });
  }
}
