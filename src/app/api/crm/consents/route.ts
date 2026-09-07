import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedContext, assertTenantOwnership } from '@/lib/security/auth-context';
import { CRM_CONSENT_STATUS, CRM_CONSENT_CHANNELS } from '@/constants/crm';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const ctx = await getAuthenticatedContext();
    const dealerId = ctx.dealerId;

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const search = searchParams.get('search');

    const whereClause: any = { dealerId };
    if (status) {
      whereClause.status = status;
    }
    if (search) {
      whereClause.OR = [
        { customer: { name: { contains: search } } },
        { phone: { contains: search } },
      ];
    }

    const [consents, totalCustomers, optInCount, optOutCount] = await Promise.all([
      prisma.contactConsent.findMany({
        where: whereClause,
        include: {
          customer: {
            select: {
              id: true,
              name: true,
              phone: true,
              loyaltyPoints: true,
              loyaltyTier: true,
            },
          },
        },
        orderBy: { updatedAt: 'desc' },
      }),
      prisma.customer.count({ where: { dealerId } }),
      prisma.contactConsent.count({ where: { dealerId, status: CRM_CONSENT_STATUS.OPT_IN } }),
      prisma.contactConsent.count({ where: { dealerId, status: CRM_CONSENT_STATUS.OPT_OUT } }),
    ]);

    const optInRatio = totalCustomers > 0 ? Math.round((optInCount / totalCustomers) * 100) : 0;

    return NextResponse.json({
      success: true,
      consents,
      stats: {
        totalCustomers,
        optInCount,
        optOutCount,
        optInRatio,
      },
    });
  } catch (error: any) {
    console.error('CRM Consents GET Hatası:', error);
    return NextResponse.json({ error: error.message || 'İzinler yüklenemedi.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const ctx = await getAuthenticatedContext();
    const dealerId = ctx.dealerId;

    const body = await request.json();
    const { customerId, phone, status, channel, notes } = body;

    if (!customerId || !phone) {
      return NextResponse.json({ error: 'Müşteri ve telefon zorunludur.' }, { status: 400 });
    }

    const consentStatus = status === CRM_CONSENT_STATUS.OPT_OUT ? CRM_CONSENT_STATUS.OPT_OUT : CRM_CONSENT_STATUS.OPT_IN;
    const consentChannel = channel || CRM_CONSENT_CHANNELS.IN_STORE_FORM;
    const revokedAt = consentStatus === CRM_CONSENT_STATUS.OPT_OUT ? new Date() : null;

    const consent = await prisma.contactConsent.upsert({
      where: {
        dealerId_customerId_phone: {
          dealerId,
          customerId,
          phone,
        },
      },
      update: {
        status: consentStatus,
        channel: consentChannel,
        revokedAt,
        notes: notes ?? undefined,
        updatedAt: new Date(),
      },
      create: {
        dealerId,
        customerId,
        phone,
        status: consentStatus,
        channel: consentChannel,
        consentDate: new Date(),
        revokedAt,
        notes: notes || null,
      },
      include: {
        customer: {
          select: { id: true, name: true, phone: true },
        },
      },
    });

    return NextResponse.json({ success: true, consent });
  } catch (error: any) {
    console.error('CRM Consents POST Hatası:', error);
    return NextResponse.json({ error: error.message || 'İzin kaydedilemedi.' }, { status: 500 });
  }
}
