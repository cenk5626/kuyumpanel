import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedContext } from '@/lib/security/auth-context';
import { logActivity } from '@/lib/logger';
import { INSTALLMENT_STATUS } from '@/constants/installment';
import {
  PAYMENT_METHODS,
  SESSION_STATUS,
  CASH_MOVEMENT_TYPES,
  CASH_MOVEMENT_CATEGORIES,
} from '@/constants/kasa';
import { CUSTOMER_TRANSACTION_TYPES, ASSET_TYPES } from '@/constants/cari';

export const dynamic = 'force-dynamic';

/**
 * POST /api/installments/[id]/pay — Taksit tahsilatı gerçekleştirir.
 * Kasaya nakit/kart/banka girişi yapar, müşteri cari bakiyesini düşer ve plan kalanını günceller.
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: planId } = await context.params;
    const ctx = await getAuthenticatedContext();
    const currentUserRole = ctx.role;
    const currentUserDealerId = ctx.dealerId;
    const userEmail = ctx.userEmail;
    const userName = ctx.userName;

    const body = await request.json();
    const { itemId, amount, paymentMethod = PAYMENT_METHODS.CASH } = body;

    if (!itemId) {
      return NextResponse.json({ error: 'Taksit kalemi seçilmelidir.' }, { status: 400 });
    }

    const payAmount = Number(amount) || 0;
    if (payAmount <= 0) {
      return NextResponse.json({ error: 'Geçerli bir tahsilat tutarı giriniz.' }, { status: 400 });
    }

    // Plan ve kalemi bul
    const plan = await prisma.installmentPlan.findUnique({
      where: { id: planId },
      include: {
        customer: true,
        items: true,
      },
    });

    if (!plan) {
      return NextResponse.json({ error: 'Taksit planı bulunamadı.' }, { status: 404 });
    }

    if (currentUserRole !== 'SUPER_ADMIN' && plan.dealerId !== currentUserDealerId) {
      return NextResponse.json({ error: 'Bu işlem için yetkiniz yok.' }, { status: 403 });
    }

    if (plan.status === INSTALLMENT_STATUS.CANCELLED) {
      return NextResponse.json({ error: 'İptal edilmiş bir taksit planı için ödeme alınamaz.' }, { status: 400 });
    }

    if (plan.status === INSTALLMENT_STATUS.PAID || plan.remainingAmount <= 0) {
      return NextResponse.json({ error: 'Bu taksit planının borcu zaten tamamen ödenmiştir.' }, { status: 400 });
    }

    const targetItem = plan.items.find((it) => it.id === itemId);
    if (!targetItem) {
      return NextResponse.json({ error: 'Taksit kalemi bulunamadı.' }, { status: 404 });
    }

    // Taksit zaten ödenmiş mi ve kalan ödenebilir tutar kontrolü
    const itemRemaining = Number(Math.max(0, targetItem.amount - targetItem.paidAmount).toFixed(2));
    if (itemRemaining <= 0) {
      return NextResponse.json({ error: 'Bu taksit kalemi zaten tamamen ödenmiştir.' }, { status: 400 });
    }

    const actualPayAmount = Math.min(payAmount, itemRemaining);
    const newPaidAmount = Number((targetItem.paidAmount + actualPayAmount).toFixed(2));
    const isCompleted = newPaidAmount >= targetItem.amount;

    const newRemainingAmount = Math.max(0, Number((plan.remainingAmount - actualPayAmount).toFixed(2)));

    const allItems = await prisma.installmentItem.findMany({
      where: { planId },
    });
    const allPaid = allItems.every((it) =>
      it.id === itemId ? isCompleted : it.status === INSTALLMENT_STATUS.PAID
    );

    // Atomik Prisma İşlemi
    const { updatedItem } = await prisma.$transaction(async (tx) => {
      const itm = await tx.installmentItem.update({
        where: { id: itemId },
        data: {
          paidAmount: newPaidAmount,
          status: isCompleted ? INSTALLMENT_STATUS.PAID : targetItem.status,
          paidDate: isCompleted ? new Date() : targetItem.paidDate,
          paymentMethod,
        },
      });

      await tx.installmentPlan.update({
        where: { id: planId },
        data: {
          remainingAmount: newRemainingAmount,
          status: allPaid ? INSTALLMENT_STATUS.PAID : plan.status,
        },
      });

      // 1. Müşteri cari hareketine tahsilat olarak işle ve bakiyeyi düş
      if (plan.customerId) {
        await tx.customerTransaction.create({
          data: {
            customerId: plan.customerId,
            dealerId: plan.dealerId,
            type: CUSTOMER_TRANSACTION_TYPES.TAHSILAT,
            assetType: ASSET_TYPES.TL,
            amount: actualPayAmount,
            hasEquivalent: 0,
            description: `Taksit Tahsilatı (${targetItem.senetNo || `${plan.planNumber} #${targetItem.installmentNo}`}) - ${paymentMethod}`,
            employeeName: userName || 'Kasa',
          },
        });

        await tx.customer.update({
          where: { id: plan.customerId },
          data: {
            tlBalance: { decrement: actualPayAmount },
          },
        });
      }

      // 2. Açık kasa oturumu varsa Kasaya nakit/kart/banka giriş hareketi oluştur
      const openSession = await tx.cashRegisterSession.findFirst({
        where: {
          dealerId: plan.dealerId,
          status: SESSION_STATUS.OPEN,
        },
        orderBy: { openedAt: 'desc' },
      });

      if (openSession) {
        await tx.cashMovement.create({
          data: {
            sessionId: openSession.id,
            dealerId: plan.dealerId,
            type: CASH_MOVEMENT_TYPES.CUSTOMER_COLLECTION,
            category: CASH_MOVEMENT_CATEGORIES.COLLECTION,
            paymentMethod,
            amount: actualPayAmount,
            currency: ASSET_TYPES.TL,
            hasEquivalent: 0,
            description: `Taksit Tahsilatı - ${plan.customer?.name || 'Müşteri'} (${targetItem.senetNo || plan.planNumber}) [${paymentMethod}]`,
            referenceId: plan.id,
            employeeName: userName || 'Kasa',
          },
        });
      }

      return { updatedItem: itm };
    });

    await logActivity({
      dealerId: plan.dealerId,
      action: 'INSTALLMENT_PAY',
      details: `${plan.planNumber} nolu planın ${targetItem.installmentNo}. taksiti için ${actualPayAmount} TL tahsil edildi (${targetItem.senetNo || ''}) [Kalan: ${newRemainingAmount} TL].`,
      userEmail,
      userName,
    });

    const safeItem = {
      ...updatedItem,
      dueDate: updatedItem.dueDate instanceof Date ? updatedItem.dueDate.toISOString() : new Date(updatedItem.dueDate).toISOString(),
      paidDate: updatedItem.paidDate ? (updatedItem.paidDate instanceof Date ? updatedItem.paidDate.toISOString() : new Date(updatedItem.paidDate).toISOString()) : null,
    };

    return NextResponse.json({
      success: true,
      item: safeItem,
      paidAmount: actualPayAmount,
      planRemainingAmount: newRemainingAmount,
      planCompleted: allPaid,
    });
  } catch (error: any) {
    console.error('[API Installments Pay] Error:', error);
    return NextResponse.json(
      { error: error?.message || 'Taksit ödemesi kaydedilirken hata oluştu.' },
      { status: error?.statusCode || 500 }
    );
  }
}
