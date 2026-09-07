import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedContext } from '@/lib/security/auth-context';
import { logActivity } from '@/lib/logger';
import {
  calculateRfmScoreAndSegment,
  calculateLoyaltyTier,
} from '@/lib/loyalty/rfm-engine';
import { RFM_SEGMENTS, RfmSegment, RFM_SEGMENT_CONFIG } from '@/constants/loyalty';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const ctx = await getAuthenticatedContext();
    const dealerId = ctx.dealerId;

    const customers = await prisma.customer.findMany({
      where: { dealerId },
      select: {
        id: true,
        name: true,
        phone: true,
        loyaltyPoints: true,
        loyaltyTier: true,
        rfmSegment: true,
        rfmScore: true,
        rfmRecencyDays: true,
        rfmFrequency: true,
        rfmMonetaryTL: true,
        updatedAt: true,
      },
      orderBy: { rfmMonetaryTL: 'desc' },
    });

    // Segment dağılımı ve istatistikleri
    const segmentStats: Record<string, { count: number; totalMonetary: number; customers: any[] }> = {};
    for (const segKey of Object.values(RFM_SEGMENTS)) {
      segmentStats[segKey] = { count: 0, totalMonetary: 0, customers: [] };
    }

    let totalPointsInCirculation = 0;
    let totalCustomers = customers.length;

    for (const c of customers) {
      totalPointsInCirculation += c.loyaltyPoints || 0;
      const seg = (c.rfmSegment as RfmSegment) || RFM_SEGMENTS.NEW_CUSTOMERS;
      if (!segmentStats[seg]) {
        segmentStats[seg] = { count: 0, totalMonetary: 0, customers: [] };
      }
      segmentStats[seg].count += 1;
      segmentStats[seg].totalMonetary += c.rfmMonetaryTL || 0;
      if (segmentStats[seg].customers.length < 5) {
        segmentStats[seg].customers.push(c);
      }
    }

    return NextResponse.json({
      totalCustomers,
      totalPointsInCirculation,
      segmentStats,
      customers,
    });
  } catch (error: any) {
    if (error.statusCode === 401 || error.statusCode === 403) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error('[API Customers RFM] GET Error:', error);
    return NextResponse.json({ error: 'RFM analizi alınamadı.' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const ctx = await getAuthenticatedContext();
    const dealerId = ctx.dealerId;

    const now = new Date();

    // 1. Tüm müşterileri ve işlem geçmişlerini çek
    const customers = await prisma.customer.findMany({
      where: { dealerId },
      include: {
        transactions: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    let updatedCount = 0;

    // 2. Her müşteri için RFM hesapla ve güncelle
    for (const cust of customers) {
      const txCount = cust.transactions.length;
      let recencyDays = 365;
      let totalSpendTL = 0;

      if (txCount > 0) {
        const lastTx = cust.transactions[0];
        const lastTxDate = new Date(lastTx.createdAt);
        const diffMs = now.getTime() - lastTxDate.getTime();
        recencyDays = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));

        for (const tx of cust.transactions) {
          totalSpendTL += tx.amount || 0;
        }
      } else {
        const createdDate = new Date(cust.createdAt);
        const diffMs = now.getTime() - createdDate.getTime();
        recencyDays = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
      }

      const rfm = calculateRfmScoreAndSegment({
        recencyDays,
        frequency: txCount,
        monetaryTL: totalSpendTL,
      });

      const tier = calculateLoyaltyTier(totalSpendTL);

      await prisma.customer.update({
        where: { id: cust.id },
        data: {
          rfmSegment: rfm.segment,
          rfmScore: rfm.totalScore,
          rfmRecencyDays: recencyDays,
          rfmFrequency: txCount,
          rfmMonetaryTL: totalSpendTL,
          loyaltyTier: tier,
        },
      });

      updatedCount++;
    }

    await logActivity({
      dealerId,
      userId: ctx.userId,
      action: 'RFM_BULK_RECALCULATION',
      details: `${updatedCount} müşterinin RFM skoru ve segmentasyon analizi güncellendi.`,
    });

    return NextResponse.json({
      success: true,
      updatedCount,
      message: `${updatedCount} müşteri başarıyla skorlandı ve segmentlere ayrıldı.`,
    });
  } catch (error: any) {
    if (error.statusCode === 401 || error.statusCode === 403) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error('[API Customers RFM] POST Error:', error);
    return NextResponse.json({ error: 'RFM hesaplaması çalıştırılamadı.' }, { status: 500 });
  }
}
