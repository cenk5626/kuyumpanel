import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthenticatedContext } from '@/lib/security/auth-context';
import { PURCHASE_ORDER_STATUS } from '@/constants/purchase-order';
import { calculateHasEquivalent, generatePurchaseOrderNumber } from '@/lib/purchase/variance-calculator';
import { logActivity } from '@/lib/logger';

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
    if (supplierId && supplierId !== 'ALL') whereClause.supplierId = supplierId;
    if (status && status !== 'ALL') whereClause.status = status;
    if (branchId && branchId !== 'ALL') whereClause.branchId = branchId;

    const orders = await prisma.purchaseOrder.findMany({
      where: whereClause,
      include: {
        supplier: {
          select: { id: true, name: true, phone: true, hasBalance: true, tlBalance: true },
        },
        lines: true,
        messages: {
          orderBy: { sentAt: 'desc' },
          take: 5,
        },
        receipts: {
          select: { id: true, receiptNumber: true, receiptDate: true },
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
    console.error('[API Purchase Orders] GET Error:', error);
    return NextResponse.json({ error: 'Toptancı siparişleri alınamadı.' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const ctx = await getAuthenticatedContext();
    const dealerId = ctx.dealerId;

    const body = await req.json();
    const {
      supplierId,
      branchId,
      expectedDeliveryDate,
      notes,
      lines,
    } = body;

    if (!supplierId) {
      return NextResponse.json({ error: 'Lütfen bir toptancı seçiniz.' }, { status: 400 });
    }

    if (!lines || !Array.isArray(lines) || lines.length === 0) {
      return NextResponse.json({ error: 'Sipariş için en az bir kalem ürün eklenmelidir.' }, { status: 400 });
    }

    // Toptancıyı doğrula
    const supplier = await prisma.supplier.findFirst({
      where: { id: supplierId, dealerId },
    });

    if (!supplier) {
      return NextResponse.json({ error: 'Geçersiz toptancı seçimi.' }, { status: 400 });
    }

    // Sipariş numarasını üret
    const count = await prisma.purchaseOrder.count({ where: { dealerId } });
    const orderNumber = generatePurchaseOrderNumber(count);

    // Toplam tahmini ağırlık ve has hesapla
    let totalEstimatedWeight = 0;
    let totalEstimatedHas = 0;
    let totalEstimatedTl = 0;

    const formattedLines = lines.map((l: any) => {
      const weight = Number(l.orderedWeight) || 0;
      const carat = Number(l.carat) || 14;
      const qty = Number(l.orderedQuantity) || 1;
      const labor = Number(l.laborCostPerGram) || 0;
      const has = calculateHasEquivalent(weight, carat);

      totalEstimatedWeight += weight;
      totalEstimatedHas += has;
      totalEstimatedTl += weight * labor;

      return {
        productCategory: l.productCategory || 'DIGER',
        description: l.description || 'Altın / Takı Siparişi',
        carat,
        orderedWeight: weight,
        orderedQuantity: qty,
        laborCostPerGram: labor,
        laborCurrency: l.laborCurrency || 'TL',
        notes: l.notes || null,
      };
    });

    const newOrder = await prisma.$transaction(async (tx) => {
      return tx.purchaseOrder.create({
        data: {
          dealerId,
          supplierId,
          branchId: branchId || null,
          orderNumber,
          status: PURCHASE_ORDER_STATUS.DRAFT,
          expectedDeliveryDate: expectedDeliveryDate ? new Date(expectedDeliveryDate) : null,
          notes: notes || null,
          totalEstimatedWeight,
          totalEstimatedHas,
          totalEstimatedTl,
          createdBy: ctx.userName || ctx.userId,
          lines: {
            create: formattedLines,
          },
        },
        include: {
          supplier: true,
          lines: true,
        },
      });
    });

    await logActivity({
      dealerId,
      userId: ctx.userId,
      action: 'PURCHASE_ORDER_CREATE',
      details: `${orderNumber} nolu toptancı siparişi oluşturuldu (${supplier.name}, ~${totalEstimatedWeight.toFixed(2)} gr)`,
    });

    return NextResponse.json({
      success: true,
      order: newOrder,
    }, { status: 201 });
  } catch (error: any) {
    if (error.statusCode === 401 || error.statusCode === 403) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error('[API Purchase Orders] POST Error:', error);
    return NextResponse.json({ error: 'Toptancı siparişi kaydedilemedi.' }, { status: 500 });
  }
}
