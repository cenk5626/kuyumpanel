import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedContext } from '@/lib/security/auth-context';
import { logActivity } from '@/lib/logger';
import {
  INSTALLMENT_STATUS,
  INSTALLMENT_PERIODS,
  INSTALLMENT_LIMITS,
  INSTALLMENT_DEFAULTS,
} from '@/constants/installment';
import {
  PAYMENT_METHODS,
  SESSION_STATUS,
  CASH_MOVEMENT_TYPES,
  CASH_MOVEMENT_CATEGORIES,
} from '@/constants/kasa';
import { CUSTOMER_TRANSACTION_TYPES, ASSET_TYPES } from '@/constants/cari';

export const dynamic = 'force-dynamic';

/**
 * GET /api/installments — Taksitli satış ve senet planlarını listeler.
 */
export async function GET(request: NextRequest) {
  try {
    const ctx = await getAuthenticatedContext();
    const currentUserRole = ctx.role;
    const currentUserDealerId = ctx.dealerId;

    const searchParams = request.nextUrl.searchParams;
    const statusFilter = searchParams.get('status');
    const customerId = searchParams.get('customerId');

    let whereClause: any = {};
    if (currentUserRole !== 'SUPER_ADMIN') {
      whereClause.dealerId = currentUserDealerId;
    }
    if (statusFilter) {
      whereClause.status = statusFilter;
    }
    if (customerId) {
      whereClause.customerId = customerId;
    }

    const plans = await prisma.installmentPlan.findMany({
      where: whereClause,
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            phone: true,
            tcNo: true,
          },
        },
        items: {
          orderBy: { installmentNo: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    const safePlans = plans.map((p) => ({
      ...p,
      createdAt: p.createdAt
        ? p.createdAt instanceof Date
          ? p.createdAt.toISOString()
          : new Date(p.createdAt).toISOString()
        : new Date().toISOString(),
      updatedAt: p.updatedAt
        ? p.updatedAt instanceof Date
          ? p.updatedAt.toISOString()
          : new Date(p.updatedAt).toISOString()
        : new Date().toISOString(),
      items: p.items.map((it) => ({
        ...it,
        dueDate: it.dueDate
          ? it.dueDate instanceof Date
            ? it.dueDate.toISOString()
            : new Date(it.dueDate).toISOString()
          : new Date().toISOString(),
        paidDate: it.paidDate
          ? it.paidDate instanceof Date
            ? it.paidDate.toISOString()
            : new Date(it.paidDate).toISOString()
          : null,
      })),
    }));

    return NextResponse.json(safePlans);
  } catch (error: any) {
    console.error('[API Installments] GET Error:', error);
    if (error?.statusCode) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    return NextResponse.json([], { status: 200 }); // Safe fallback
  }
}

/**
 * POST /api/installments — Yeni taksit ve senet planı oluşturur.
 */
export async function POST(request: NextRequest) {
  try {
    const ctx = await getAuthenticatedContext();
    const currentUserRole = ctx.role;
    const currentUserDealerId = ctx.dealerId;
    const userEmail = ctx.userEmail;
    const userName = ctx.userName;

    const body = await request.json();
    const {
      customerId,
      totalAmount,
      downPayment = 0,
      installmentCount = INSTALLMENT_LIMITS.DEFAULT_COUNT,
      firstDueDate,
      periodDays = INSTALLMENT_PERIODS.MONTHLY_DAYS,
      notes,
    } = body;

    if (!customerId) {
      return NextResponse.json({ error: 'Müşteri seçimi zorunludur.' }, { status: 400 });
    }

    // Çok kiracılı müşteri kontrolü
    const targetCustomer = await prisma.customer.findUnique({
      where: { id: customerId },
    });

    if (!targetCustomer || (currentUserRole !== 'SUPER_ADMIN' && targetCustomer.dealerId !== currentUserDealerId)) {
      return NextResponse.json({ error: 'Seçilen müşteri bulunamadı veya yetkiniz yok.' }, { status: 403 });
    }

    const tAmount = Number(totalAmount) || 0;
    const dPayment = Number(downPayment) || 0;
    const count = Math.max(
      INSTALLMENT_LIMITS.MIN_COUNT,
      Math.min(INSTALLMENT_LIMITS.MAX_COUNT, Number(installmentCount) || INSTALLMENT_LIMITS.DEFAULT_COUNT)
    );

    if (tAmount <= 0) {
      return NextResponse.json({ error: 'Geçerli bir toplam tutar giriniz.' }, { status: 400 });
    }

    if (dPayment >= tAmount) {
      return NextResponse.json(
        { error: 'Peşinat toplam tutardan küçük olmalıdır (Taksitlendirilecek bakiye kalmadı).' },
        { status: 400 }
      );
    }

    const remaining = Number((tAmount - dPayment).toFixed(2));
    const rawPerInstallment = Number((remaining / count).toFixed(2));

    // Plan numarası üret (Örn: TKST-2026-0001)
    const existingCount = await prisma.installmentPlan.count({
      where: { dealerId: currentUserDealerId },
    });
    const year = new Date().getFullYear();
    const planNumber = `${INSTALLMENT_DEFAULTS.PLAN_PREFIX}-${year}-${String(existingCount + 1).padStart(4, '0')}`;

    // Taksit kalemleri ve senet numaraları oluştur (Tarih güvenliği)
    const parsedFirstDue = firstDueDate ? new Date(firstDueDate) : null;
    const isValidFirstDue = parsedFirstDue !== null && !isNaN(parsedFirstDue.getTime());
    const startDate = isValidFirstDue ? parsedFirstDue : new Date();

    const itemsData: Array<{
      installmentNo: number;
      dueDate: Date;
      amount: number;
      paidAmount: number;
      status: string;
      senetNo: string;
      notes: string;
    }> = [];
    let allocatedSum = 0;

    for (let i = 1; i <= count; i++) {
      const itemDueDate = new Date(startDate.getTime());
      if (isValidFirstDue && i === 1) {
        // İlk taksit doğrudan belirtilen geçerli tarihte
      } else {
        itemDueDate.setDate(itemDueDate.getDate() + (i - (isValidFirstDue ? 1 : 0)) * periodDays);
      }

      // Son taksitte kuruş yuvarlama farkını denkleştir
      const itemAmount =
        i === count ? Number((remaining - allocatedSum).toFixed(2)) : rawPerInstallment;
      allocatedSum += itemAmount;

      const senetNo = `${INSTALLMENT_DEFAULTS.SENET_PREFIX}-${year}-${String(existingCount + 1).padStart(4, '0')}-${i}`;

      itemsData.push({
        installmentNo: i,
        dueDate: itemDueDate,
        amount: itemAmount,
        paidAmount: 0,
        status: INSTALLMENT_STATUS.PENDING,
        senetNo,
        notes: `${count} taksitin ${i}. taksit ve senedi`,
      });
    }

    // Atomik Prisma İşlemi
    const createdPlan = await prisma.$transaction(async (tx) => {
      const plan = await tx.installmentPlan.create({
        data: {
          planNumber,
          dealerId: currentUserDealerId,
          customerId,
          totalAmount: tAmount,
          downPayment: dPayment,
          remainingAmount: remaining,
          installmentCount: count,
          status: INSTALLMENT_STATUS.PENDING,
          notes: notes?.trim() || null,
          items: {
            create: itemsData,
          },
        },
        include: {
          customer: true,
          items: true,
        },
      });

      // Müşteri cari borç kaydı ve peşinat muhasebeleştirmesi
      await tx.customerTransaction.create({
        data: {
          customerId,
          dealerId: currentUserDealerId,
          type: CUSTOMER_TRANSACTION_TYPES.BORC,
          assetType: ASSET_TYPES.TL,
          amount: tAmount,
          hasEquivalent: 0,
          description: `Taksitli Satış Sözleşmesi (${planNumber}) - Toplam: ${tAmount} TL`,
          employeeName: userName || 'Kasa',
        },
      });

      if (dPayment > 0) {
        await tx.customerTransaction.create({
          data: {
            customerId,
            dealerId: currentUserDealerId,
            type: CUSTOMER_TRANSACTION_TYPES.TAHSILAT,
            assetType: ASSET_TYPES.TL,
            amount: dPayment,
            hasEquivalent: 0,
            description: `Taksitli Satış Peşinatı (${planNumber})`,
            employeeName: userName || 'Kasa',
          },
        });

        // Açık kasa oturumu varsa peşinat nakit girişi olarak kasaya yansıt
        const openSession = await tx.cashRegisterSession.findFirst({
          where: {
            dealerId: currentUserDealerId,
            status: SESSION_STATUS.OPEN,
          },
          orderBy: { openedAt: 'desc' },
        });

        if (openSession) {
          await tx.cashMovement.create({
            data: {
              sessionId: openSession.id,
              dealerId: currentUserDealerId,
              type: CASH_MOVEMENT_TYPES.CUSTOMER_COLLECTION,
              category: CASH_MOVEMENT_CATEGORIES.COLLECTION,
              paymentMethod: PAYMENT_METHODS.CASH,
              amount: dPayment,
              currency: ASSET_TYPES.TL,
              hasEquivalent: 0,
              description: `Taksitli Satış Peşinatı - ${plan.customer.name} (${planNumber})`,
              referenceId: plan.id,
              employeeName: userName || 'Kasa',
            },
          });
        }
      }

      // Kalan taksit bakiyesini müşterinin borcuna ekle
      await tx.customer.update({
        where: { id: customerId },
        data: {
          tlBalance: { increment: remaining },
        },
      });

      return plan;
    });

    await logActivity({
      dealerId: currentUserDealerId,
      action: 'INSTALLMENT_CREATE',
      details: `${planNumber} numaralı taksit planı açıldı (Müşteri: ${createdPlan.customer.name}, Tutar: ${tAmount} TL, ${count} Taksit).`,
      userEmail,
      userName,
    });

    // Güvenli Tarih Serileştirmesi
    const safeCreatedPlan = {
      ...createdPlan,
      createdAt: createdPlan.createdAt instanceof Date ? createdPlan.createdAt.toISOString() : new Date().toISOString(),
      updatedAt: createdPlan.updatedAt instanceof Date ? createdPlan.updatedAt.toISOString() : new Date().toISOString(),
      items: createdPlan.items.map((it) => ({
        ...it,
        dueDate: it.dueDate instanceof Date ? it.dueDate.toISOString() : new Date().toISOString(),
        paidDate: it.paidDate ? (it.paidDate instanceof Date ? it.paidDate.toISOString() : new Date(it.paidDate).toISOString()) : null,
      })),
    };

    return NextResponse.json(safeCreatedPlan);
  } catch (error: any) {
    console.error('[API Installments] POST Error:', error);
    return NextResponse.json(
      { error: error?.message || 'Taksit planı oluşturulurken hata oluştu.' },
      { status: error?.statusCode || 500 }
    );
  }
}
