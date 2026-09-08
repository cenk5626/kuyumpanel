import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedContext } from '@/lib/security/auth-context';
import {
  EXTERNAL_ORDER_STATUS,
  OMNICHANNEL_ERRORS,
} from '@/constants/omnichannel';
import {
  parseExternalOrderPayload,
  checkOversellRisk,
  formatOmnichannelOrderWhatsAppNotification,
} from '@/lib/omnichannel/omnichannel-engine';

export const dynamic = 'force-dynamic';

/**
 * GET /api/channels/orders
 * Pazar yeri ve e-ticaret siparişlerini listeler.
 */
export async function GET(request: NextRequest) {
  try {
    const ctx = await getAuthenticatedContext();
    const dealerId = ctx.dealerId;

    const { searchParams } = new URL(request.url);
    const channelId = searchParams.get('channelId');
    const status = searchParams.get('status');

    const where: any = { dealerId };
    if (channelId && channelId !== 'ALL') where.channelId = channelId;
    if (status && status !== 'ALL') where.status = status;

    const orders = await prisma.externalOrder.findMany({
      where,
      include: {
        channel: {
          select: { name: true, channelType: true },
        },
      },
      orderBy: { orderedAt: 'desc' },
      take: 100,
    });

    return NextResponse.json({ success: true, orders });
  } catch (error: any) {
    console.error('[API Channel Orders GET Error]:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Siparişler listelenemedi' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/channels/orders
 * Webhook veya entegrasyon üzerinden yeni internet siparişi alır ve çifte satış riskini kontrol eder.
 */
export async function POST(request: NextRequest) {
  try {
    const ctx = await getAuthenticatedContext();
    const dealerId = ctx.dealerId;

    const body = await request.json();
    const { channelId, rawOrder, cargoCompany, trackingNumber } = body;

    const channel = await prisma.salesChannel.findFirst({
      where: { id: channelId, dealerId },
    });

    if (!channel) {
      return NextResponse.json(
        { success: false, error: OMNICHANNEL_ERRORS.CHANNEL_NOT_FOUND },
        { status: 404 }
      );
    }

    const standardized = parseExternalOrderPayload(channel.channelType, rawOrder || body);

    // Çifte Satış (Oversell) Kontrolü
    const oversellWarnings: string[] = [];
    for (const item of standardized.items) {
      if (item.barcode) {
        const product = await prisma.productItem.findFirst({
          where: { barcode: item.barcode, dealerId },
        });

        const currentQty = product?.status === 'IN_STOCK' ? product.quantity : 0;
        const riskCheck = checkOversellRisk(currentQty, item.quantity);
        if (riskCheck.isRisk) {
          oversellWarnings.push(
            `[${item.barcode}] ${item.title} - Mevcut Stok: ${currentQty}, İstenen: ${item.quantity}`
          );
        }
      }
    }

    // Sipariş kaydı oluştur
    const order = await prisma.externalOrder.upsert({
      where: {
        dealerId_orderNumber: { dealerId, orderNumber: standardized.orderNumber },
      },
      create: {
        dealerId,
        channelId: channel.id,
        orderNumber: standardized.orderNumber,
        customerName: standardized.customerName,
        customerPhone: standardized.customerPhone || null,
        totalAmount: standardized.totalAmount,
        status: EXTERNAL_ORDER_STATUS.NEW,
        itemsJson: JSON.stringify(standardized.items),
        cargoCompany: cargoCompany || null,
        trackingNumber: trackingNumber || null,
        orderedAt: new Date(standardized.orderedAt),
      },
      update: {
        status: body.status || EXTERNAL_ORDER_STATUS.NEW,
        cargoCompany: cargoCompany || undefined,
        trackingNumber: trackingNumber || undefined,
      },
    });

    const notificationMessage = formatOmnichannelOrderWhatsAppNotification({
      orderNumber: order.orderNumber,
      channelName: channel.name,
      customerName: order.customerName,
      totalAmount: order.totalAmount,
      itemCount: standardized.items.length,
    });

    return NextResponse.json({
      success: true,
      order,
      oversellWarnings,
      hasOversellRisk: oversellWarnings.length > 0,
      notificationMessage,
    });
  } catch (error: any) {
    console.error('[API Channel Orders POST Error]:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Sipariş işlenemedi' },
      { status: 500 }
    );
  }
}
