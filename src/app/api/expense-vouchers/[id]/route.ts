import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedContext, assertTenantOwnership } from '@/lib/security/auth-context';
import { logActivity } from '@/lib/logger';
import {
  EXPENSE_VOUCHER_STATUS,
  EXPENSE_VOUCHER_SIGNATURE_STATUS,
  EXPENSE_VOUCHER_PAYMENT_METHODS,
  E_DOCUMENT_ENVIRONMENTS,
} from '@/constants/expense-voucher';
import { gibProvider } from '@/lib/invoice/gib-provider';

export const dynamic = 'force-dynamic';

/**
 * GET /api/expense-vouchers/[id] — Tekil gider pusulası detayı
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const ctx = await getAuthenticatedContext();
    const currentUserRole = ctx.role;
    const currentUserDealerId = ctx.dealerId;

    const voucher = await prisma.expenseVoucher.findUnique({
      where: { id },
      include: {
        lines: true,
        events: { orderBy: { createdAt: 'desc' } },
        branch: true,
      },
    });

    if (!voucher) {
      return NextResponse.json({ error: 'Gider pusulası bulunamadı.' }, { status: 404 });
    }

    if (currentUserRole !== 'SUPER_ADMIN') {
      assertTenantOwnership(ctx, voucher.dealerId);
    }

    return NextResponse.json(voucher);
  } catch (error: any) {
    console.error('[API ExpenseVouchers ID] GET Error:', error);
    return NextResponse.json({ error: error?.message || 'Sunucu hatası' }, { status: 500 });
  }
}

/**
 * PATCH /api/expense-vouchers/[id] — Gider pusulası durum geçişi, onaylama, imzalama, GİB e-Belge ve iptal
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const ctx = await getAuthenticatedContext();
    const currentUserRole = ctx.role;
    const currentUserDealerId = ctx.dealerId;
    const userEmail = ctx.userEmail;
    const userName = ctx.userName;

    const voucher = await prisma.expenseVoucher.findUnique({
      where: { id },
      include: { lines: true },
    });

    if (!voucher) {
      return NextResponse.json({ error: 'Gider pusulası bulunamadı.' }, { status: 404 });
    }

    if (currentUserRole !== 'SUPER_ADMIN') {
      assertTenantOwnership(ctx, voucher.dealerId);
    }

    const body = await request.json();
    const { action, signatureStatus, reason } = body;

    if (action === 'SIGN') {
      const updatedVoucher = await prisma.expenseVoucher.update({
        where: { id },
        data: {
          signatureStatus: signatureStatus || EXPENSE_VOUCHER_SIGNATURE_STATUS.SIGNED_DIGITAL,
          events: {
            create: {
              eventType: 'SIGNED',
              actorEmail: userEmail || 'system',
              notes: `Belge ${signatureStatus || 'SIGNED_DIGITAL'} ile imzalandı.`,
            },
          },
        },
        include: { lines: true, events: true },
      });

      return NextResponse.json(updatedVoucher);
    }

    if (action === 'SUBMIT_E_DOCUMENT') {
      const submission = await gibProvider.submitExpenseVoucher(
        {
          voucherNumber: voucher.voucherNumber,
          sellerName: voucher.sellerName,
          sellerTaxId: voucher.sellerTaxId,
          sellerPhone: voucher.sellerPhone,
          sellerAddress: voucher.sellerAddress,
          issueDate: voucher.issueDate.toISOString(),
          grossAmount: voucher.grossAmount,
          withholdingRate: voucher.withholdingRate,
          withholdingAmount: voucher.withholdingAmount,
          netAmount: voucher.netAmount,
          hasEquivalent: voucher.hasEquivalent,
          lines: voucher.lines.map((l) => ({
            description: l.description,
            carat: l.carat,
            milyem: l.milyem,
            weight: l.weight,
            unitPrice: l.unitPrice,
            totalPrice: l.totalPrice,
            hasEquivalent: l.hasEquivalent,
          })),
        },
        E_DOCUMENT_ENVIRONMENTS.TEST
      );

      const updated = await prisma.expenseVoucher.update({
        where: { id },
        data: {
          events: {
            create: {
              eventType: 'SUBMITTED',
              actorEmail: userEmail || 'system',
              notes: submission.success
                ? `GİB e-Gider Pusulası başarıyla onaylandı. UUID: ${submission.uuid}`
                : `GİB Gönderim Hatası: ${submission.errorMessage}`,
            },
          },
        },
        include: { lines: true, events: true },
      });

      return NextResponse.json({ ...updated, submission });
    }

    if (action === 'CANCEL') {
      if (voucher.status === EXPENSE_VOUCHER_STATUS.CANCELLED) {
        return NextResponse.json({ error: 'Belge zaten iptal edilmiş.' }, { status: 400 });
      }

      const cancelledVoucher = await prisma.$transaction(async (tx) => {
        // Eğer daha önce onaylandıysa hurda stoklarını ve kasayı tersine çevir
        if (voucher.status === EXPENSE_VOUCHER_STATUS.APPROVED) {
          // 1. Hurda stoğundan gramajları düş
          for (const line of voucher.lines) {
            await tx.scrapInventory.updateMany({
              where: {
                dealerId: currentUserDealerId,
                carat: line.carat,
              },
              data: {
                weight: { decrement: line.weight },
                pureWeight: { decrement: line.hasEquivalent },
              },
            });
          }

          // 2. Kasa nakit iadesi (Nakit ödendiyse kasaya parayı geri koy)
          if (voucher.paymentMethod === EXPENSE_VOUCHER_PAYMENT_METHODS.NAKIT) {
            const activeSession = await tx.cashRegisterSession.findFirst({
              where: { dealerId: currentUserDealerId, status: 'OPEN' },
              orderBy: { createdAt: 'desc' },
            });

            if (activeSession) {
              await tx.cashMovement.create({
                data: {
                  sessionId: activeSession.id,
                  dealerId: currentUserDealerId,
                  type: 'MANUAL_IN',
                  category: 'CORRECTION',
                  paymentMethod: 'CASH',
                  amount: voucher.netAmount,
                  currency: 'TL',
                  hasEquivalent: voucher.hasEquivalent,
                  description: `Gider Pusulası İptal İadesi - ${voucher.voucherNumber}`,
                  referenceId: voucher.id,
                  employeeName: userName || userEmail || 'Yönetici',
                },
              });

              await tx.cashRegisterSession.update({
                where: { id: activeSession.id },
                data: {
                  systemCashTL: { increment: voucher.netAmount },
                  systemHasGram: { decrement: voucher.hasEquivalent },
                },
              });
            }
          }
        }

        return tx.expenseVoucher.update({
          where: { id },
          data: {
            status: EXPENSE_VOUCHER_STATUS.CANCELLED,
            events: {
              create: {
                eventType: 'CANCELLED',
                actorEmail: userEmail || 'system',
                notes: `Gider pusulası iptal edildi. Gerekçe: ${reason || 'Belirtilmedi'}`,
              },
            },
          },
          include: { lines: true, events: true },
        });
      });

      await logActivity({
        dealerId: currentUserDealerId,
        action: 'GİDER PUSULASI İPTALİ',
        details: `${voucher.voucherNumber} numaralı gider pusulası iptal edildi. Gerekçe: ${reason || 'N/A'}`,
        userEmail,
        userName,
      });

      return NextResponse.json(cancelledVoucher);
    }

    return NextResponse.json({ error: 'Geçersiz işlem.' }, { status: 400 });
  } catch (error: any) {
    console.error('[API ExpenseVouchers ID] PATCH Error:', error);
    return NextResponse.json({ error: error?.message || 'İşlem başarısız' }, { status: 500 });
  }
}
