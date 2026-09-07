import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedContext, assertTenantOwnership } from '@/lib/security/auth-context';
import { PO_STATUS } from '@/constants/purchase';
import { logActivity } from '@/lib/logger';
import { sanitizeBody } from '@/lib/security/validation';

export const dynamic = 'force-dynamic';

export async function GET(
  _req: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await getAuthenticatedContext();
    const { id } = await props.params;

    const order = await prisma.purchaseOrder.findUnique({
      where: { id },
      include: {
        supplier: true,
        branch: true,
        lines: true,
        receipts: {
          include: {
            lines: true,
          },
          orderBy: { receiptDate: 'desc' },
        },
      },
    });

    if (!order) {
      return NextResponse.json({ error: 'Sipariş bulunamadı.' }, { status: 404 });
    }

    assertTenantOwnership(ctx, order.dealerId, 'PurchaseOrder');

    return NextResponse.json({ order });
  } catch (error: any) {
    if (error.statusCode === 401 || error.statusCode === 403) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    return NextResponse.json({ error: 'Sipariş detayı alınamadı.' }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await getAuthenticatedContext();
    const { id } = await props.params;

    const order = await prisma.purchaseOrder.findUnique({
      where: { id },
    });

    if (!order) {
      return NextResponse.json({ error: 'Sipariş bulunamadı.' }, { status: 404 });
    }

    assertTenantOwnership(ctx, order.dealerId, 'PurchaseOrder');

    const rawBody = await req.json();
    const body = sanitizeBody(rawBody, [
      'status',
      'notes',
      'expectedDeliveryDate',
    ] as const);
    const { status, notes, expectedDeliveryDate } = body;

    const updated = await prisma.purchaseOrder.update({
      where: { id },
      data: {
        status: status || order.status,
        notes: notes !== undefined ? notes : order.notes,
        expectedDeliveryDate: expectedDeliveryDate ? new Date(expectedDeliveryDate) : order.expectedDeliveryDate,
      },
      include: {
        supplier: true,
        branch: true,
        lines: true,
      },
    });

    return NextResponse.json({ success: true, order: updated });
  } catch (error: any) {
    if (error.statusCode === 401 || error.statusCode === 403) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    return NextResponse.json({ error: 'Sipariş güncellenemedi.' }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await getAuthenticatedContext();
    const { id } = await props.params;

    const order = await prisma.purchaseOrder.findUnique({
      where: { id },
      include: { receipts: true },
    });

    if (!order) {
      return NextResponse.json({ error: 'Sipariş bulunamadı.' }, { status: 404 });
    }

    assertTenantOwnership(ctx, order.dealerId, 'PurchaseOrder');

    if (order.receipts.length > 0) {
      return NextResponse.json(
        { error: 'Bu siparişe bağlı mal kabul fişleri bulunduğundan silinemez. Önce siparişi iptal ediniz.' },
        { status: 400 }
      );
    }

    await prisma.$transaction([
      prisma.purchaseOrderLine.deleteMany({ where: { purchaseOrderId: id } }),
      prisma.purchaseOrder.delete({ where: { id } }),
    ]);

    await logActivity({
      dealerId: ctx.dealerId,
      userId: ctx.userId,
      action: 'PURCHASE_ORDER_DELETE',
      details: `${order.orderNumber} nolu sipariş silindi.`,
    });

    return NextResponse.json({ success: true, message: 'Sipariş silindi.' });
  } catch (error: any) {
    if (error.statusCode === 401 || error.statusCode === 403) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    return NextResponse.json({ error: 'Sipariş silinirken hata oluştu.' }, { status: 500 });
  }
}
