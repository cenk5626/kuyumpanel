import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedContext } from '@/lib/security/auth-context';
import { CRM_CAMPAIGN_STATUS } from '@/constants/crm';
import { generateWhatsAppBroadcastUrl, calculateCampaignAnalytics } from '@/lib/crm/campaign-engine';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await getAuthenticatedContext();
    const dealerId = ctx.dealerId;

    const { id } = await params;

    const campaign = await prisma.campaign.findFirst({
      where: { id, dealerId },
      include: {
        segment: { select: { id: true, name: true, type: true } },
        recipients: {
          include: {
            customer: {
              select: { id: true, name: true, phone: true, loyaltyPoints: true },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!campaign) {
      return NextResponse.json({ error: 'Kampanya bulunamadı.' }, { status: 404 });
    }

    // Alıcılar için hazır WhatsApp linkleri ekle
    const recipientsWithUrls = campaign.recipients.map((r: any) => ({
      ...r,
      whatsappUrl: generateWhatsAppBroadcastUrl(r.phone, r.personalizedMessage),
    }));

    const analytics = calculateCampaignAnalytics(campaign.recipients);

    return NextResponse.json({
      success: true,
      campaign: {
        ...campaign,
        recipients: recipientsWithUrls,
      },
      analytics,
    });
  } catch (error: any) {
    console.error('CRM Campaign Details GET Hatası:', error);
    return NextResponse.json({ error: error.message || 'Kampanya detayları alınamadı.' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await getAuthenticatedContext();
    const dealerId = ctx.dealerId;

    const { id } = await params;
    const body = await request.json();
    const { action, recipientId, recipientStatus } = body;

    const existing = await prisma.campaign.findFirst({
      where: { id, dealerId },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Kampanya bulunamadı.' }, { status: 404 });
    }

    // 1. Kampanya durumu değiştirme
    if (action === 'ACTIVATE') {
      const updated = await prisma.campaign.update({
        where: { id },
        data: {
          status: CRM_CAMPAIGN_STATUS.ACTIVE,
          startedAt: new Date(),
        },
      });
      return NextResponse.json({ success: true, campaign: updated });
    }

    if (action === 'COMPLETE') {
      const updated = await prisma.campaign.update({
        where: { id },
        data: {
          status: CRM_CAMPAIGN_STATUS.COMPLETED,
          completedAt: new Date(),
        },
      });
      return NextResponse.json({ success: true, campaign: updated });
    }

    if (action === 'CANCEL') {
      const updated = await prisma.campaign.update({
        where: { id },
        data: {
          status: CRM_CAMPAIGN_STATUS.CANCELLED,
        },
      });
      return NextResponse.json({ success: true, campaign: updated });
    }

    // 2. Belirli bir alıcının gönderim/tıklanma durumunu güncelleme
    if (recipientId && recipientStatus) {
      const updatedRecipient = await prisma.campaignRecipient.update({
        where: { id: recipientId },
        data: {
          status: recipientStatus,
          sentAt: recipientStatus === 'SENT' ? new Date() : undefined,
          clickedAt: recipientStatus === 'CLICKED' ? new Date() : undefined,
        },
      });

      // Kampanyanın genel sayaçlarını güncelle
      if (recipientStatus === 'SENT') {
        await prisma.campaign.update({
          where: { id },
          data: { sentCount: { increment: 1 } },
        });
      }

      return NextResponse.json({ success: true, recipient: updatedRecipient });
    }

    return NextResponse.json({ error: 'Geçersiz işlem.' }, { status: 400 });
  } catch (error: any) {
    console.error('CRM Campaign PATCH Hatası:', error);
    return NextResponse.json({ error: error.message || 'Kampanya güncellenemedi.' }, { status: 500 });
  }
}
