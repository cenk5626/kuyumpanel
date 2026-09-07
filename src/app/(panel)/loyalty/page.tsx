import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import LoyaltyClient from './LoyaltyClient';
import { RFM_SEGMENTS, LOYALTY_DEFAULTS } from '@/constants/loyalty';

export const dynamic = 'force-dynamic';

export default async function LoyaltyPage() {
  let session = null;
  try {
    session = await auth();
  } catch (e) {
    console.error('LoyaltyPage auth error:', e);
  }

  if (!session) {
    redirect('/login');
  }

  const dealerId = (session.user as any)?.dealerId || 'merkez';
  const userName = (session.user as any)?.name || (session.user as any)?.email || 'Yönetici';

  try {
    // 1. Müşterileri ve RFM verilerini çek
    const customers = await prisma.customer.findMany({
      where: { dealerId },
      include: {
        loyaltyLogs: {
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
        deposits: {
          where: { status: 'ACTIVE' },
        },
      },
      orderBy: { loyaltyPoints: 'desc' },
    });

    // 2. Aktif emanet altın toplamı
    let totalEmanetGold = 0;
    for (const c of customers) {
      for (const d of c.deposits) {
        totalEmanetGold += d.pureGoldWeight || 0;
      }
    }

    // 3. Yaklaşan özel günleri filtrele
    const today = new Date();
    const upcomingEvents: any[] = [];

    for (const c of customers) {
      if (c.birthDate) {
        const bDate = new Date(c.birthDate);
        let nextEventDate = new Date(today.getFullYear(), bDate.getMonth(), bDate.getDate());
        if (nextEventDate < today && nextEventDate.toDateString() !== today.toDateString()) {
          nextEventDate = new Date(today.getFullYear() + 1, bDate.getMonth(), bDate.getDate());
        }
        const diffDays = Math.ceil((nextEventDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays >= 0 && diffDays <= LOYALTY_DEFAULTS.UPCOMING_DAYS_WINDOW) {
          upcomingEvents.push({
            customerId: c.id,
            customerName: c.name,
            phone: c.phone,
            type: 'BIRTHDAY',
            typeLabel: 'Doğum Günü',
            date: bDate.toISOString(),
            daysLeft: diffDays,
            loyaltyPoints: c.loyaltyPoints,
            loyaltyTier: c.loyaltyTier,
          });
        }
      }

      if (c.anniversaryDate) {
        const aDate = new Date(c.anniversaryDate);
        let nextEventDate = new Date(today.getFullYear(), aDate.getMonth(), aDate.getDate());
        if (nextEventDate < today && nextEventDate.toDateString() !== today.toDateString()) {
          nextEventDate = new Date(today.getFullYear() + 1, aDate.getMonth(), aDate.getDate());
        }
        const diffDays = Math.ceil((nextEventDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays >= 0 && diffDays <= LOYALTY_DEFAULTS.UPCOMING_DAYS_WINDOW) {
          upcomingEvents.push({
            customerId: c.id,
            customerName: c.name,
            phone: c.phone,
            type: 'WEDDING_ANNIVERSARY',
            typeLabel: 'Evlilik Yıldönümü',
            date: aDate.toISOString(),
            daysLeft: diffDays,
            loyaltyPoints: c.loyaltyPoints,
            loyaltyTier: c.loyaltyTier,
          });
        }
      }
    }

    upcomingEvents.sort((a, b) => a.daysLeft - b.daysLeft);

    // 4. Müşteri emanetlerini çek
    const deposits = await prisma.customerDeposit.findMany({
      where: { dealerId },
      include: {
        customer: {
          select: { id: true, name: true, phone: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    const serializedData = JSON.parse(
      JSON.stringify({
        customers,
        upcomingEvents,
        deposits,
        totalEmanetGold,
      })
    );

    return (
      <LoyaltyClient
        initialData={serializedData}
        dealerId={dealerId}
        currentUserName={userName}
      />
    );
  } catch (error) {
    console.error('[LoyaltyPage] Error loading data:', error);
    return (
      <LoyaltyClient
        initialData={{
          customers: [],
          upcomingEvents: [],
          deposits: [],
          totalEmanetGold: 0,
        }}
        dealerId={dealerId}
        currentUserName={userName}
      />
    );
  }
}
