import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { logActivity } from '@/lib/logger';
import {
  CARAT_MILYEM_MAP,
  CUSTOMER_DEPOSIT_ACTIONS,
  CUSTOMER_DEPOSIT_STATUS,
} from '@/constants/workshop';

export const dynamic = 'force-dynamic';

/**
 * GET /api/customers/deposits — Emanet Altın Kasası kayıtlarını listeler.
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth().catch(() => null);
    const currentUserRole = (session?.user as any)?.role || 'ADMIN';
    const currentUserDealerId = (session?.user as any)?.dealerId || 'merkez';

    const customerId = request.nextUrl.searchParams.get('customerId');
    const status = request.nextUrl.searchParams.get('status');

    let whereClause: any = {};
    if (currentUserRole !== 'SUPER_ADMIN') {
      whereClause.dealerId = currentUserDealerId;
    }
    if (customerId) {
      whereClause.customerId = customerId;
    }
    if (status) {
      whereClause.status = status;
    }

    const deposits = await prisma.customerDeposit.findMany({
      where: whereClause,
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            phone: true,
            loyaltyPoints: true,
            emanetGold: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    const safeDeposits = deposits.map((d) => ({
      ...d,
      createdAt: d.createdAt
        ? d.createdAt instanceof Date
          ? d.createdAt.toISOString()
          : new Date(d.createdAt).toISOString()
        : new Date().toISOString(),
      updatedAt: d.updatedAt
        ? d.updatedAt instanceof Date
          ? d.updatedAt.toISOString()
          : new Date(d.updatedAt).toISOString()
        : new Date().toISOString(),
    }));

    return NextResponse.json(safeDeposits);
  } catch (error) {
    console.error('[API Deposits] GET Error:', error);
    return NextResponse.json([], { status: 200 });
  }
}

/**
 * POST /api/customers/deposits — Emanet altın girişi / iadesi ve Müşteri ParaPuan yönetimi.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth().catch(() => null);
    const currentUserRole = (session?.user as any)?.role || 'ADMIN';
    const currentUserDealerId = (session?.user as any)?.dealerId || 'merkez';
    const userEmail = (session?.user as any)?.email;
    const userName = (session?.user as any)?.name;

    const body = await request.json();
    const { action = CUSTOMER_DEPOSIT_ACTIONS.DEPOSIT } = body;

    // 1. Emanet Altın Alma (Müşteri kasaya altın emanet etti)
    if (action === CUSTOMER_DEPOSIT_ACTIONS.DEPOSIT) {
      const { customerId, itemDescription, weight, carat = 24, notes } = body;

      if (!customerId || !itemDescription) {
        return NextResponse.json(
          { error: 'Müşteri ve emanet eşya tanımı zorunludur.' },
          { status: 400 }
        );
      }

      const numWeight = Number(weight) || 0;
      if (numWeight <= 0) {
        return NextResponse.json(
          { error: 'Emanet bırakılan gramaj sıfırdan büyük olmalıdır.' },
          { status: 400 }
        );
      }

      // Çok kiracılı bayi yalıtımı kontrolü
      const customer = await prisma.customer.findUnique({
        where: { id: customerId },
      });

      if (!customer || (currentUserRole !== 'SUPER_ADMIN' && customer.dealerId !== currentUserDealerId)) {
        return NextResponse.json(
          { error: 'Seçilen müşteri bulunamadı veya bu işlem için yetkiniz yok.' },
          { status: 403 }
        );
      }

      const numCarat = Number(carat) || 24;
      const milyem = CARAT_MILYEM_MAP[numCarat] || 0.995;
      const pureGoldWeight = Number((numWeight * milyem).toFixed(4));

      const deposit = await prisma.$transaction(async (tx) => {
        const created = await tx.customerDeposit.create({
          data: {
            dealerId: currentUserDealerId,
            customerId,
            type: CUSTOMER_DEPOSIT_ACTIONS.DEPOSIT,
            itemDescription: itemDescription.trim(),
            weight: numWeight,
            carat: numCarat,
            pureGoldWeight,
            status: CUSTOMER_DEPOSIT_STATUS.ACTIVE,
            notes: notes?.trim() || null,
          },
          include: { customer: true },
        });

        await tx.customer.update({
          where: { id: customerId },
          data: {
            emanetGold: { increment: pureGoldWeight },
          },
        });

        return created;
      });

      await logActivity({
        dealerId: currentUserDealerId,
        action: 'CUSTOMER_DEPOSIT',
        details: `${deposit.customer.name} emanet altın bıraktı: ${itemDescription} (${numWeight} gr, Has: ${pureGoldWeight} gr).`,
        userEmail,
        userName,
      });

      return NextResponse.json(deposit);
    }

    // 2. Emanet Altın İadesi (Müşteri emanetini geri teslim aldı)
    if (action === CUSTOMER_DEPOSIT_ACTIONS.WITHDRAW) {
      const { depositId } = body;

      const deposit = await prisma.customerDeposit.findUnique({
        where: { id: depositId },
        include: { customer: true },
      });

      if (!deposit || deposit.status !== CUSTOMER_DEPOSIT_STATUS.ACTIVE) {
        return NextResponse.json({ error: 'Aktif emanet kaydı bulunamadı.' }, { status: 404 });
      }

      // Çok kiracılı bayi yalıtımı kontrolü
      if (currentUserRole !== 'SUPER_ADMIN' && deposit.dealerId !== currentUserDealerId) {
        return NextResponse.json({ error: 'Bu işlem için yetkiniz yok.' }, { status: 403 });
      }

      const updated = await prisma.$transaction(async (tx) => {
        const dep = await tx.customerDeposit.update({
          where: { id: depositId },
          data: { status: CUSTOMER_DEPOSIT_STATUS.RETURNED },
        });

        await tx.customer.update({
          where: { id: deposit.customerId },
          data: {
            emanetGold: { decrement: deposit.pureGoldWeight },
          },
        });

        return dep;
      });

      await logActivity({
        dealerId: currentUserDealerId,
        action: 'CUSTOMER_DEPOSIT_RETURN',
        details: `${deposit.customer.name} emanetini teslim aldı: ${deposit.itemDescription} (${deposit.weight} gr).`,
        userEmail,
        userName,
      });

      return NextResponse.json(updated);
    }

    // 3. Müşteri ParaPuan / Sadakat Puanı İşlemi
    if (action === CUSTOMER_DEPOSIT_ACTIONS.LOYALTY_POINT) {
      const { customerId, points, isDeduct = false, reason } = body;
      const numPoints = Number(points) || 0;

      if (!customerId || numPoints <= 0) {
        return NextResponse.json({ error: 'Geçerli müşteri ve puan tutarı giriniz.' }, { status: 400 });
      }

      const customer = await prisma.customer.findUnique({
        where: { id: customerId },
      });

      if (!customer || (currentUserRole !== 'SUPER_ADMIN' && customer.dealerId !== currentUserDealerId)) {
        return NextResponse.json({ error: 'Müşteri bulunamadı veya bu işlem için yetkiniz yok.' }, { status: 403 });
      }

      if (isDeduct && (customer.loyaltyPoints || 0) < numPoints) {
        return NextResponse.json(
          { error: `Yetersiz puan! Müşterinin mevcut ParaPuanı (${customer.loyaltyPoints || 0}), düşülmek istenen puandan (${numPoints}) az olamaz.` },
          { status: 400 }
        );
      }

      const updatedCustomer = await prisma.customer.update({
        where: { id: customerId },
        data: {
          loyaltyPoints: isDeduct
            ? { decrement: numPoints }
            : { increment: numPoints },
        },
      });

      await logActivity({
        dealerId: currentUserDealerId,
        action: 'LOYALTY_POINT_UPDATE',
        details: `${updatedCustomer.name} için ${numPoints} ParaPuan ${isDeduct ? 'kullanıldı/düşüldü' : 'kazanıldı/eklendi'} (${reason || 'Mağaza Alışverişi'}).`,
        userEmail,
        userName,
      });

      return NextResponse.json(updatedCustomer);
    }

    return NextResponse.json({ error: 'Bilinmeyen işlem.' }, { status: 400 });
  } catch (error: any) {
    console.error('[API Deposits] POST Error:', error);
    return NextResponse.json(
      { error: error?.message || 'Emanet / ParaPuan işlemi yürütülürken hata oluştu.' },
      { status: 500 }
    );
  }
}
