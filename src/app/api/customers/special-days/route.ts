import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedContext, assertTenantOwnership } from '@/lib/security/auth-context';
import { logActivity } from '@/lib/logger';
import { sanitizeBody } from '@/lib/security/validation';
import {
  SPECIAL_DAY_TYPES,
  LOYALTY_DEFAULTS,
  SpecialDayType,
} from '@/constants/loyalty';
import { generateSpecialDayWhatsAppMessage } from '@/lib/loyalty/rfm-engine';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const ctx = await getAuthenticatedContext();
    const dealerId = ctx.dealerId;

    const { searchParams } = new URL(req.url);
    const windowDays = Number(searchParams.get('window')) || LOYALTY_DEFAULTS.UPCOMING_DAYS_WINDOW;

    // Doğum günü veya yıldönümü tanımlı müşterileri çek
    const customers = await prisma.customer.findMany({
      where: {
        dealerId,
        OR: [
          { birthDate: { not: null } },
          { anniversaryDate: { not: null } },
        ],
      },
      select: {
        id: true,
        name: true,
        phone: true,
        birthDate: true,
        anniversaryDate: true,
        loyaltyPoints: true,
        loyaltyTier: true,
        specialDayLogs: {
          orderBy: { sentAt: 'desc' },
          take: 5,
        },
      },
    });

    const today = new Date();
    const currentMonth = today.getMonth();
    const currentDay = today.getDate();

    const upcomingEvents: any[] = [];

    for (const c of customers) {
      // 1. Doğum Günü Kontrolü
      if (c.birthDate) {
        const bDate = new Date(c.birthDate);
        const bMonth = bDate.getMonth();
        const bDay = bDate.getDate();

        // Bu yılki tarihi oluştur
        let nextEventDate = new Date(today.getFullYear(), bMonth, bDay);
        if (nextEventDate < today && nextEventDate.toDateString() !== today.toDateString()) {
          nextEventDate = new Date(today.getFullYear() + 1, bMonth, bDay);
        }

        const diffDays = Math.ceil((nextEventDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays >= 0 && diffDays <= windowDays) {
          upcomingEvents.push({
            customerId: c.id,
            customerName: c.name,
            phone: c.phone,
            type: SPECIAL_DAY_TYPES.BIRTHDAY,
            typeLabel: 'Doğum Günü',
            date: bDate,
            daysLeft: diffDays,
            loyaltyPoints: c.loyaltyPoints,
            loyaltyTier: c.loyaltyTier,
            lastNotified: c.specialDayLogs[0]?.sentAt || null,
          });
        }
      }

      // 2. Yıldönümü Kontrolü
      if (c.anniversaryDate) {
        const aDate = new Date(c.anniversaryDate);
        const aMonth = aDate.getMonth();
        const aDay = aDate.getDate();

        let nextEventDate = new Date(today.getFullYear(), aMonth, aDay);
        if (nextEventDate < today && nextEventDate.toDateString() !== today.toDateString()) {
          nextEventDate = new Date(today.getFullYear() + 1, aMonth, aDay);
        }

        const diffDays = Math.ceil((nextEventDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays >= 0 && diffDays <= windowDays) {
          upcomingEvents.push({
            customerId: c.id,
            customerName: c.name,
            phone: c.phone,
            type: SPECIAL_DAY_TYPES.WEDDING_ANNIVERSARY,
            typeLabel: 'Evlilik Yıldönümü',
            date: aDate,
            daysLeft: diffDays,
            loyaltyPoints: c.loyaltyPoints,
            loyaltyTier: c.loyaltyTier,
            lastNotified: c.specialDayLogs[0]?.sentAt || null,
          });
        }
      }
    }

    upcomingEvents.sort((a, b) => a.daysLeft - b.daysLeft);

    return NextResponse.json({
      windowDays,
      totalUpcoming: upcomingEvents.length,
      events: upcomingEvents,
    });
  } catch (error: any) {
    if (error.statusCode === 401 || error.statusCode === 403) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error('[API Special Days] GET Error:', error);
    return NextResponse.json({ error: 'Özel günler listesi alınamadı.' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const ctx = await getAuthenticatedContext();
    const dealerId = ctx.dealerId;

    const rawBody = await req.json();
    const body = sanitizeBody(rawBody, [
      'customerId',
      'specialDayType',
      'giftPoints',
      'discountCode',
    ] as const);

    const { customerId, specialDayType, giftPoints, discountCode } = body;

    if (!customerId || !specialDayType) {
      return NextResponse.json({ error: 'Müşteri ve özel gün türü zorunludur.' }, { status: 400 });
    }

    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
    });

    if (!customer) {
      return NextResponse.json({ error: 'Müşteri bulunamadı.' }, { status: 404 });
    }

    assertTenantOwnership(ctx, customer.dealerId, 'Customer');

    const numGiftPoints = giftPoints ? Number(giftPoints) : 0;

    // 1. WhatsApp Mesaj Metnini Üret
    const messageText = generateSpecialDayWhatsAppMessage({
      customerName: customer.name,
      specialDayType: specialDayType as SpecialDayType,
      giftPoints: numGiftPoints,
      discountCode,
    });

    // 2. Transaction içinde hediye puan yükle ve log kaydı aç
    const result = await prisma.$transaction(async (tx) => {
      let updatedPoints = customer.loyaltyPoints;

      if (numGiftPoints > 0) {
        updatedPoints += numGiftPoints;

        await tx.customerLoyaltyLog.create({
          data: {
            dealerId,
            customerId,
            actionType: 'EARN',
            points: numGiftPoints,
            tlValue: numGiftPoints * LOYALTY_DEFAULTS.POINT_TL_CONVERSION_RATE,
            balanceAfter: updatedPoints,
            referenceType: 'SPECIAL_DAY_GIFT',
            description: `${specialDayType === 'BIRTHDAY' ? 'Doğum Günü' : 'Yıldönümü'} Kutlama Hediyesi`,
          },
        });

        await tx.customer.update({
          where: { id: customerId },
          data: { loyaltyPoints: updatedPoints },
        });
      }

      const log = await tx.customerSpecialDayLog.create({
        data: {
          dealerId,
          customerId,
          specialDayType,
          channel: 'WHATSAPP',
          messageText,
          giftPoints: numGiftPoints > 0 ? numGiftPoints : null,
          discountCode: discountCode || null,
          status: 'SENT',
        },
      });

      return { log, updatedPoints };
    });

    // 3. WhatsApp Doğrudan Paylaşım Linki
    let waUrl = '';
    if (customer.phone) {
      const cleanPhone = customer.phone.replace(/\D/g, '');
      const formattedPhone = cleanPhone.startsWith('90')
        ? cleanPhone
        : cleanPhone.startsWith('0')
        ? `9${cleanPhone}`
        : `90${cleanPhone}`;
      waUrl = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(messageText)}`;
    }

    await logActivity({
      dealerId,
      userId: ctx.userId,
      action: 'SPECIAL_DAY_CONGRATULATION',
      details: `${customer.name} için ${specialDayType} tebriği oluşturuldu. Hediye Puan: ${numGiftPoints}`,
    });

    return NextResponse.json({
      success: true,
      log: result.log,
      messageText,
      waUrl,
      currentPoints: result.updatedPoints,
    });
  } catch (error: any) {
    if (error.statusCode === 401 || error.statusCode === 403) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error('[API Special Days] POST Error:', error);
    return NextResponse.json({ error: 'Özel gün işlemi kaydedilemedi.' }, { status: 500 });
  }
}
