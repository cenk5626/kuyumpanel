import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthenticatedContext } from '@/lib/security/auth-context';
import { PURCHASE_ORDER_STATUS } from '@/constants/purchase-order';
import { logActivity } from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await getAuthenticatedContext();
    const dealerId = ctx.dealerId;
    const { id } = await params;

    const order = await prisma.purchaseOrder.findFirst({
      where: { id, dealerId },
      include: {
        supplier: true,
        lines: true,
        messages: {
          orderBy: { sentAt: 'desc' },
        },
        receipts: {
          include: { lines: true },
        },
      },
    });

    if (!order) {
      return NextResponse.json({ error: 'Sipariş bulunamadı.' }, { status: 404 });
    }

    return NextResponse.json({ order });
  } catch (error: any) {
    if (error.statusCode === 401 || error.statusCode === 403) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error('[API Purchase Order Detail] GET Error:', error);
    return NextResponse.json({ error: 'Sipariş detayı alınamadı.' }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await getAuthenticatedContext();
    const dealerId = ctx.dealerId;
    const { id } = await params;

    const existing = await prisma.purchaseOrder.findFirst({
      where: { id, dealerId },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Sipariş bulunamadı.' }, { status: 404 });
    }

    const body = await req.json();
    const { status, notes, expectedDeliveryDate } = body;

    const updateData: any = {};
    if (notes !== undefined) updateData.notes = notes;
    if (expectedDeliveryDate !== undefined) {
      updateData.expectedDeliveryDate = expectedDeliveryDate ? new Date(expectedDeliveryDate) : null;
    }

    if (status && status !== existing.status) {
      updateData.status = status;
      if (status === PURCHASE_ORDER_STATUS.APPROVED) {
        updateData.approvedBy = ctx.userName || ctx.userId;
      } else if (status === PURCHASE_ORDER_STATUS.CANCELLED) {
        updateData.cancelledAt = new Date();
      }
    }

    const updated = await prisma.purchaseOrder.update({
      where: { id },
      data: updateData,
      include: {
        supplier: true,
        lines: true,
        messages: true,
      },
    });

    await logActivity({
      dealerId,
      userId: ctx.userId,
      action: 'PURCHASE_ORDER_UPDATE',
      details: `${existing.orderNumber} nolu sipariş güncellendi (Durum: ${updated.status})`,
    });

    return NextResponse.json({ success: true, order: updated });
  } catch (error: any) {
    if (error.statusCode === 401 || error.statusCode === 403) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error('[API Purchase Order Detail] PATCH Error:', error);
    return NextResponse.json({ error: 'Sipariş güncellenemedi.' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await getAuthenticatedContext();
    const dealerId = ctx.dealerId;
    const { id } = await params;

    const existing = await prisma.purchaseOrder.findFirst({
      where: { id, dealerId },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Sipariş bulunamadı.' }, { status: 404 });
    }

    if (existing.status !== PURCHASE_ORDER_STATUS.DRAFT && existing.status !== PURCHASE_ORDER_STATUS.CANCELLED) {
      return NextResponse.json({
        error: 'Yalnızca taslak veya iptal edilmiş siparişler silinebilir.',
      }, { status: 400 });
    }

    await prisma.purchaseOrder.delete({
      where: { id },
    });

    await logActivity({
      dealerId,
      userId: ctx.userId,
      action: 'PURCHASE_ORDER_DELETE',
      details: `${existing.orderNumber} nolu sipariş silindi.`,
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (error.statusCode === 401 || error.statusCode === 403) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error('[API Purchase Order Detail] DELETE Error:', error);
    return NextResponse.json({ error: 'Sipariş silinemedi.' }, { status: 500 });
  }
}
