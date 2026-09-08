import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedContext } from '@/lib/security/auth-context';
import { OMNICHANNEL_ERRORS } from '@/constants/omnichannel';

export const dynamic = 'force-dynamic';

/**
 * GET /api/channels/[id]
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await getAuthenticatedContext();
    const dealerId = ctx.dealerId;
    const { id } = await params;

    const channel = await prisma.salesChannel.findFirst({
      where: { id, dealerId },
      include: {
        syncLogs: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!channel) {
      return NextResponse.json(
        { success: false, error: OMNICHANNEL_ERRORS.CHANNEL_NOT_FOUND },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, channel });
  } catch (error: any) {
    console.error('[API Channel GET Error]:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Kanal bulunamadı' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/channels/[id]
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await getAuthenticatedContext();
    const dealerId = ctx.dealerId;
    const { id } = await params;

    const body = await request.json();
    const { name, isActive, priceMarkupPercent, autoPriceSync, apiKey, apiSecret, merchantId } = body;

    const existing = await prisma.salesChannel.findFirst({
      where: { id, dealerId },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: OMNICHANNEL_ERRORS.CHANNEL_NOT_FOUND },
        { status: 404 }
      );
    }

    const updated = await prisma.salesChannel.update({
      where: { id },
      data: {
        name: name !== undefined ? name : existing.name,
        isActive: isActive !== undefined ? Boolean(isActive) : existing.isActive,
        priceMarkupPercent:
          priceMarkupPercent !== undefined ? Number(priceMarkupPercent) : existing.priceMarkupPercent,
        autoPriceSync:
          autoPriceSync !== undefined ? Boolean(autoPriceSync) : existing.autoPriceSync,
        apiKey: apiKey !== undefined ? apiKey : existing.apiKey,
        apiSecret: apiSecret !== undefined ? apiSecret : existing.apiSecret,
        merchantId: merchantId !== undefined ? merchantId : existing.merchantId,
      },
    });

    return NextResponse.json({ success: true, channel: updated });
  } catch (error: any) {
    console.error('[API Channel PATCH Error]:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Kanal güncellenemedi' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/channels/[id]
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await getAuthenticatedContext();
    const dealerId = ctx.dealerId;
    const { id } = await params;

    const existing = await prisma.salesChannel.findFirst({
      where: { id, dealerId },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: OMNICHANNEL_ERRORS.CHANNEL_NOT_FOUND },
        { status: 404 }
      );
    }

    await prisma.salesChannel.delete({ where: { id } });

    return NextResponse.json({ success: true, message: 'Kanal başarıyla silindi' });
  } catch (error: any) {
    console.error('[API Channel DELETE Error]:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Kanal silinemedi' },
      { status: 500 }
    );
  }
}
