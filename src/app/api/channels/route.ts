import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedContext } from '@/lib/security/auth-context';
import {
  CHANNEL_TYPE,
  OMNICHANNEL_DEFAULTS,
  ChannelType,
} from '@/constants/omnichannel';

export const dynamic = 'force-dynamic';

/**
 * GET /api/channels
 * Bayiye ait tanımlı e-ticaret satış kanallarını listeler.
 */
export async function GET() {
  try {
    const ctx = await getAuthenticatedContext();
    const dealerId = ctx.dealerId;

    const channels = await prisma.salesChannel.findMany({
      where: { dealerId },
      include: {
        _count: {
          select: { orders: true, syncLogs: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    return NextResponse.json({ success: true, channels });
  } catch (error: any) {
    console.error('[API Channels GET Error]:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Satış kanalları listelenemedi' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/channels
 * Yeni bir pazar yeri veya e-ticaret satış kanalı ekler.
 */
export async function POST(request: NextRequest) {
  try {
    const ctx = await getAuthenticatedContext();
    const dealerId = ctx.dealerId;

    const body = await request.json();
    const {
      name,
      channelType,
      apiKey,
      apiSecret,
      merchantId,
      priceMarkupPercent = OMNICHANNEL_DEFAULTS.DEFAULT_MARKUP_PERCENT,
      autoPriceSync = true,
    } = body;

    if (!name || !channelType) {
      return NextResponse.json(
        { success: false, error: 'Kanal adı ve türü zorunludur' },
        { status: 400 }
      );
    }

    const channel = await prisma.salesChannel.create({
      data: {
        dealerId,
        name,
        channelType: channelType as ChannelType,
        apiKey: apiKey || null,
        apiSecret: apiSecret || null,
        merchantId: merchantId || null,
        priceMarkupPercent: Number(priceMarkupPercent),
        autoPriceSync: Boolean(autoPriceSync),
      },
    });

    return NextResponse.json({ success: true, channel });
  } catch (error: any) {
    console.error('[API Channels POST Error]:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Satış kanalı oluşturulamadı' },
      { status: 500 }
    );
  }
}
