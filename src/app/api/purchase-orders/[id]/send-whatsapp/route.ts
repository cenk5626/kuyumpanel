import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthenticatedContext } from '@/lib/security/auth-context';
import {
  PURCHASE_ORDER_STATUS,
  PO_MESSAGE_PROVIDER,
  PO_MESSAGE_STATUS,
} from '@/constants/purchase-order';
import {
  formatPurchaseOrderWhatsAppMessage,
  normalizePhoneNumber,
  buildWhatsAppIntentUrl,
} from '@/lib/purchase-order/whatsapp-order';
import { logActivity } from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await getAuthenticatedContext();
    const dealerId = ctx.dealerId;
    const { id } = await params;

    let body: any = {};
    try {
      body = await req.json();
    } catch {}

    const { forceResend, resendReason } = body;

    const order = await prisma.purchaseOrder.findFirst({
      where: { id, dealerId },
      include: {
        supplier: true,
        lines: true,
        dealer: {
          select: { name: true, whatsappProvider: true, waCloudAccessToken: true, waCloudPhoneId: true },
        },
      },
    });

    if (!order) {
      return NextResponse.json({ error: 'Sipariş bulunamadı.' }, { status: 404 });
    }

    if (!order.supplier.phone) {
      return NextResponse.json({
        error: `Toptancı (${order.supplier.name}) için kayıtlı telefon numarası bulunamadı. Lütfen toptancı kartını güncelleyiniz.`,
      }, { status: 400 });
    }

    const cleanPhone = normalizePhoneNumber(order.supplier.phone);
    if (!cleanPhone) {
      return NextResponse.json({
        error: `Toptancının telefon numarası (${order.supplier.phone}) geçerli bir GSM formatında değil.`,
      }, { status: 400 });
    }

    // Çift gönderim koruması (Idempotency)
    if (order.sentAt && !forceResend) {
      return NextResponse.json({
        error: `Bu sipariş daha önce ${new Date(order.sentAt).toLocaleString('tr-TR')} tarihinde toptancıya gönderilmiştir. Tekrar göndermek istiyorsanız lütfen tekrar gönderim onayı veriniz.`,
        alreadySent: true,
      }, { status: 409 });
    }

    // WhatsApp Mesaj Metni Snapshot'ı oluştur
    const messageBody = formatPurchaseOrderWhatsAppMessage({
      orderNumber: order.orderNumber,
      orderDate: order.orderDate,
      expectedDeliveryDate: order.expectedDeliveryDate,
      supplierName: order.supplier.name,
      dealerName: order.dealer.name,
      totalEstimatedWeight: order.totalEstimatedWeight,
      totalEstimatedHas: order.totalEstimatedHas,
      notes: order.notes,
      lines: order.lines.map((l) => ({
        productCategory: l.productCategory,
        description: l.description,
        carat: l.carat,
        orderedWeight: l.orderedWeight,
        orderedQuantity: l.orderedQuantity,
        laborCostPerGram: l.laborCostPerGram,
        notes: l.notes,
      })),
    });

    const webIntentUrl = buildWhatsAppIntentUrl(cleanPhone, messageBody);
    const provider = order.dealer.whatsappProvider || PO_MESSAGE_PROVIDER.WEB_INTENT;

    // Mesaj kaydını ve sipariş durumunu tek transaction ile güncelle
    const result = await prisma.$transaction(async (tx) => {
      const msgRecord = await tx.purchaseOrderMessage.create({
        data: {
          purchaseOrderId: order.id,
          provider,
          recipientPhone: cleanPhone,
          messageBodySnapshot: messageBody,
          status: PO_MESSAGE_STATUS.SENT,
          sentAt: new Date(),
        },
      });

      const updatedOrder = await tx.purchaseOrder.update({
        where: { id: order.id },
        data: {
          status: PURCHASE_ORDER_STATUS.SENT_TO_SUPPLIER,
          sentAt: new Date(),
        },
      });

      return { msgRecord, updatedOrder };
    });

    await logActivity({
      dealerId,
      userId: ctx.userId,
      action: 'PURCHASE_ORDER_WHATSAPP_SEND',
      details: `${order.orderNumber} nolu sipariş WhatsApp ile iletildi (${order.supplier.name}, Tel: ${cleanPhone})${resendReason ? ' - Neden: ' + resendReason : ''}`,
    });

    return NextResponse.json({
      success: true,
      webIntentUrl,
      provider,
      recipientPhone: cleanPhone,
      messageId: result.msgRecord.id,
      sentAt: result.msgRecord.sentAt,
    });
  } catch (error: any) {
    if (error.statusCode === 401 || error.statusCode === 403) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error('[API Purchase Order WhatsApp Send] Error:', error);
    return NextResponse.json({ error: 'WhatsApp sipariş mesajı gönderilemedi.' }, { status: 500 });
  }
}
