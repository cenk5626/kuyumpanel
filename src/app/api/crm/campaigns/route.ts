import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedContext } from '@/lib/security/auth-context';
import {
  CRM_CAMPAIGN_STATUS,
  CRM_CONSENT_STATUS,
} from '@/constants/crm';
import {
  filterPermittedRecipients,
  buildPersonalizedCampaignMessage,
  evaluateCustomerSegmentation,
  CustomerForSegmentation,
} from '@/lib/crm/campaign-engine';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const ctx = await getAuthenticatedContext();
    const dealerId = ctx.dealerId;

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const type = searchParams.get('type');

    const whereClause: any = { dealerId };
    if (status) whereClause.status = status;
    if (type) whereClause.type = type;

    const campaigns = await prisma.campaign.findMany({
      where: whereClause,
      include: {
        segment: {
          select: { id: true, name: true, type: true },
        },
        _count: {
          select: { recipients: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ success: true, campaigns });
  } catch (error: any) {
    console.error('CRM Campaigns GET Hatası:', error);
    return NextResponse.json({ error: error.message || 'Kampanyalar yüklenemedi.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const ctx = await getAuthenticatedContext();
    const dealerId = ctx.dealerId;

    const body = await request.json();
    const { title, type, messageTemplate, segmentId, discountPercent, scheduledAt } = body;

    if (!title || !messageTemplate) {
      return NextResponse.json({ error: 'Kampanya başlığı ve mesaj şablonu zorunludur.' }, { status: 400 });
    }

    // 1. Bayi ve müşteri bilgilerini çek
    const [dealer, allCustomers, consents] = await Promise.all([
      prisma.dealer.findUnique({ where: { id: dealerId }, select: { name: true } }),
      prisma.customer.findMany({
        where: { dealerId },
        select: {
          id: true,
          name: true,
          phone: true,
          rfmMonetaryTL: true,
          rfmRecencyDays: true,
          rfmFrequency: true,
          loyaltyPoints: true,
        },
      }),
      prisma.contactConsent.findMany({
        where: { dealerId },
        select: { customerId: true, status: true },
      }),
    ]);

    if (!dealer) {
      return NextResponse.json({ error: 'Bayi kaydı bulunamadı.' }, { status: 404 });
    }

    // İzin haritası oluştur
    const consentMap = new Map<string, string>();
    for (const c of consents) {
      consentMap.set(c.customerId, c.status);
    }

    // 2. Segment filtresi (varsa)
    let candidateCustomers: CustomerForSegmentation[] = allCustomers.map((cust: any) => ({
      id: cust.id,
      name: cust.name,
      phone: cust.phone,
      monetary: cust.rfmMonetaryTL || 0,
      recencyDays: cust.rfmRecencyDays ?? 999,
      frequency: cust.rfmFrequency || 0,
      consentStatus: consentMap.get(cust.id) || CRM_CONSENT_STATUS.PENDING,
      loyaltyPoints: cust.loyaltyPoints || 0,
    }));

    if (segmentId) {
      const segment = await prisma.customerSegment.findUnique({
        where: { id: segmentId },
      });
      if (segment) {
        candidateCustomers = candidateCustomers.filter((c: CustomerForSegmentation) =>
          evaluateCustomerSegmentation(c, {
            type: segment.type as any,
            minSpendTl: segment.minSpendTl || 0,
            maxRecencyDays: segment.maxRecencyDays || undefined,
            minTransactions: segment.minTransactions || 0,
          })
        );
      }
    }

    // 3. ETK / KVKK İzin Filtresi (Zorunlu Güvenlik Kalkanı)
    const { permitted, rejectedCount } = filterPermittedRecipients(candidateCustomers);

    if (permitted.length === 0) {
      return NextResponse.json(
        {
          error: `Hedef kitlede iletişim izni (Opt-In) olan müşteri bulunamadı. (${rejectedCount} müşteri izinsiz veya telefonsuz olduğu için elendi)`,
        },
        { status: 400 }
      );
    }

    // 4. Kampanya ve Alıcı Kayıtlarını Transaction ile Oluştur
    const campaign = await prisma.$transaction(async (tx: any) => {
      const newCampaign = await tx.campaign.create({
        data: {
          dealerId,
          title: title.trim(),
          type: type || 'DISCOUNT_COUPON',
          status: scheduledAt ? CRM_CAMPAIGN_STATUS.SCHEDULED : CRM_CAMPAIGN_STATUS.DRAFT,
          messageTemplate: messageTemplate.trim(),
          segmentId: segmentId || null,
          targetCount: permitted.length,
          scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
        },
      });

      // Alıcılar için kişiselleştirilmiş mesajları oluştur ve kaydet
      for (const p of permitted) {
        const personalized = buildPersonalizedCampaignMessage(
          messageTemplate,
          {
            name: p.name,
            loyaltyPoints: p.loyaltyPoints || 0,
            discountPercent: discountPercent ? parseFloat(discountPercent) : undefined,
          },
          dealer
        );

        await tx.campaignRecipient.create({
          data: {
            campaignId: newCampaign.id,
            customerId: p.id,
            phone: p.phone!,
            personalizedMessage: personalized,
            status: 'PENDING',
          },
        });
      }

      return newCampaign;
    });

    return NextResponse.json({
      success: true,
      campaign,
      stats: {
        targetedCount: permitted.length,
        rejectedNonPermittedCount: rejectedCount,
      },
    });
  } catch (error: any) {
    console.error('CRM Campaigns POST Hatası:', error);
    return NextResponse.json({ error: error.message || 'Kampanya oluşturulamadı.' }, { status: 500 });
  }
}
