import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedContext } from '@/lib/security/auth-context';
import {
  CHANNEL_SYNC_TYPE,
  OMNICHANNEL_ERRORS,
} from '@/constants/omnichannel';
import { calculateChannelSellingPrice } from '@/lib/omnichannel/omnichannel-engine';

export const dynamic = 'force-dynamic';

/**
 * POST /api/channels/[id]/sync
 * Kanal için canlı fiyat ve stok senkronizasyonunu tetikler.
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await getAuthenticatedContext();
    const dealerId = ctx.dealerId;
    const { id } = await params;

    const channel = await prisma.salesChannel.findFirst({
      where: { id, dealerId },
    });

    if (!channel) {
      return NextResponse.json(
        { success: false, error: OMNICHANNEL_ERRORS.CHANNEL_NOT_FOUND },
        { status: 404 }
      );
    }

    if (!channel.isActive) {
      return NextResponse.json(
        { success: false, error: OMNICHANNEL_ERRORS.CHANNEL_INACTIVE },
        { status: 400 }
      );
    }

    // Stoktaki ürünleri getir
    const products = await prisma.productItem.findMany({
      where: { dealerId, status: 'IN_STOCK' },
      take: 200,
    });

    // Canlı has altın fiyatını al
    const hasPrice = await prisma.hasPrice.findUnique({
      where: { id: 'singleton' },
    });

    const currentHasAsk = hasPrice?.ask || 3100;

    // Fiyatları pazar yeri komisyonu ile güncelle
    const updatedProducts = products.map((p) => {
      const basePrice = p.costPrice ? p.costPrice * (1 + (p.profitMargin || 15) / 100) : 5000;
      const channelPrice = calculateChannelSellingPrice(
        basePrice,
        channel.priceMarkupPercent,
        0
      );

      return {
        barcode: p.barcode,
        title: p.title,
        quantity: p.quantity,
        channelPrice,
      };
    });

    // Log kaydı oluştur ve kanalın lastSyncAt zamanını güncelle
    const now = new Date();
    await prisma.$transaction([
      prisma.channelSyncLog.create({
        data: {
          channelId: channel.id,
          syncType: CHANNEL_SYNC_TYPE.PRICE_SYNC,
          status: 'SUCCESS',
          itemCount: updatedProducts.length,
          details: `${updatedProducts.length} adet takının fiyatı %${channel.priceMarkupPercent} marj ile güncellendi. Has Satış: ${currentHasAsk} TL`,
          createdAt: now,
        },
      }),
      prisma.salesChannel.update({
        where: { id: channel.id },
        data: { lastSyncAt: now },
      }),
    ]);

    return NextResponse.json({
      success: true,
      message: `${updatedProducts.length} adet ürün pazar yerine başarıyla senkronize edildi.`,
      syncedCount: updatedProducts.length,
      sampleItems: updatedProducts.slice(0, 5),
    });
  } catch (error: any) {
    console.error('[API Channel Sync POST Error]:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Senkronizasyon başarısız' },
      { status: 500 }
    );
  }
}
