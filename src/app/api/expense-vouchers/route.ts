import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedContext, assertTenantOwnership } from '@/lib/security/auth-context';
import { logActivity } from '@/lib/logger';
import {
  EXPENSE_VOUCHER_STATUS,
  EXPENSE_VOUCHER_SIGNATURE_STATUS,
  EXPENSE_VOUCHER_PAYMENT_METHODS,
  EXPENSE_VOUCHER_WITHHOLDING_RATES,
} from '@/constants/expense-voucher';
import {
  calculateExpenseVoucher,
  generateExpenseVoucherNumber,
  ExpenseVoucherLineInput,
} from '@/lib/invoice/expense-voucher-engine';
import { gibProvider } from '@/lib/invoice/gib-provider';

export const dynamic = 'force-dynamic';

/**
 * GET /api/expense-vouchers — Bayiye ait gider pusulalarını listeler.
 */
export async function GET(request: NextRequest) {
  try {
    const ctx = await getAuthenticatedContext();
    const currentUserRole = ctx.role;
    const currentUserDealerId = ctx.dealerId;

    const searchParams = request.nextUrl.searchParams;
    const statusFilter = searchParams.get('status');
    const branchFilter = searchParams.get('branchId');
    const query = searchParams.get('q');

    const whereClause: any = {};
    if (currentUserRole !== 'SUPER_ADMIN') {
      whereClause.dealerId = currentUserDealerId;
    }
    if (statusFilter) {
      whereClause.status = statusFilter;
    }
    if (branchFilter) {
      whereClause.branchId = branchFilter;
    }
    if (query) {
      whereClause.OR = [
        { voucherNumber: { contains: query } },
        { sellerName: { contains: query } },
        { sellerTaxId: { contains: query } },
      ];
    }

    const vouchers = await prisma.expenseVoucher.findMany({
      where: whereClause,
      include: {
        lines: true,
        events: {
          orderBy: { createdAt: 'desc' },
        },
        branch: {
          select: { id: true, name: true, code: true },
        },
      },
      orderBy: { issueDate: 'desc' },
      take: 100,
    });

    const safeVouchers = vouchers.map((v) => ({
      ...v,
      issueDate: v.issueDate ? (v.issueDate instanceof Date ? v.issueDate.toISOString() : new Date(v.issueDate).toISOString()) : new Date().toISOString(),
      createdAt: v.createdAt ? (v.createdAt instanceof Date ? v.createdAt.toISOString() : new Date(v.createdAt).toISOString()) : new Date().toISOString(),
      updatedAt: v.updatedAt ? (v.updatedAt instanceof Date ? v.updatedAt.toISOString() : new Date(v.updatedAt).toISOString()) : new Date().toISOString(),
    }));

    return NextResponse.json(safeVouchers);
  } catch (error) {
    console.error('[API ExpenseVouchers] GET Error:', error);
    return NextResponse.json([], { status: 200 }); // Fault-tolerant fallback
  }
}

/**
 * POST /api/expense-vouchers — Yeni Resmî Gider Pusulası tanzim eder.
 */
export async function POST(request: NextRequest) {
  try {
    const ctx = await getAuthenticatedContext();
    const currentUserDealerId = ctx.dealerId;
    const userEmail = ctx.userEmail;
    const userName = ctx.userName;

    const body = await request.json();
    const {
      sellerName,
      sellerTaxId,
      sellerPhone,
      sellerAddress,
      paymentMethod = EXPENSE_VOUCHER_PAYMENT_METHODS.NAKIT,
      withholdingRate = EXPENSE_VOUCHER_WITHHOLDING_RATES.EXEMPT,
      status = EXPENSE_VOUCHER_STATUS.APPROVED,
      signatureStatus = EXPENSE_VOUCHER_SIGNATURE_STATUS.SIGNED_MANUAL,
      branchId,
      notes,
      lines = [],
    } = body;

    if (!sellerName || !sellerName.trim()) {
      return NextResponse.json({ error: 'Satıcı adı-soyadı zorunludur.' }, { status: 400 });
    }

    if (!sellerTaxId || sellerTaxId.trim().length < 10) {
      return NextResponse.json({ error: 'Geçerli bir TCKN veya Vergi No girilmelidir.' }, { status: 400 });
    }

    if (!lines || lines.length === 0) {
      return NextResponse.json({ error: 'En az bir hurda veya altın kalemi eklenmelidir.' }, { status: 400 });
    }

    // Hesaplama motoru
    const calculation = calculateExpenseVoucher(lines, Number(withholdingRate));

    const totalCount = await prisma.expenseVoucher.count({
      where: { dealerId: currentUserDealerId },
    });
    const voucherNumber = generateExpenseVoucherNumber(currentUserDealerId, totalCount);

    // Atomik işlem
    const newVoucher = await prisma.$transaction(async (tx) => {
      const createdVoucher = await tx.expenseVoucher.create({
        data: {
          dealerId: currentUserDealerId,
          branchId: branchId || null,
          voucherNumber,
          sellerName: sellerName.trim(),
          sellerTaxId: sellerTaxId.trim(),
          sellerPhone: sellerPhone?.trim() || null,
          sellerAddress: sellerAddress?.trim() || null,
          paymentMethod,
          grossAmount: calculation.grossAmount,
          withholdingRate: calculation.withholdingRate,
          withholdingAmount: calculation.withholdingAmount,
          netAmount: calculation.netAmount,
          hasEquivalent: calculation.totalPureGoldWeight,
          status,
          signatureStatus,
          notes: notes?.trim() || null,
          createdById: userEmail || userName || 'system',
          lines: {
            create: calculation.lines.map((l) => ({
              description: l.description,
              carat: l.carat,
              milyem: l.milyem,
              weight: l.weight,
              unitPrice: l.unitPrice,
              totalPrice: l.totalPrice,
              hasEquivalent: l.hasEquivalent,
            })),
          },
          events: {
            create: {
              eventType: 'CREATED',
              actorEmail: userEmail || 'system',
              notes: `Gider pusulası ${status === EXPENSE_VOUCHER_STATUS.APPROVED ? 'onaylı olarak' : 'taslak olarak'} oluşturuldu.`,
            },
          },
        },
        include: {
          lines: true,
          events: true,
        },
      });

      // Eğer belge onaylı ise hurda stoklarını ve kasayı güncelle
      if (status === EXPENSE_VOUCHER_STATUS.APPROVED) {
        // 1. Hurda kasasına gramaj ekleme (ScrapInventory)
        for (const line of calculation.lines) {
          await tx.scrapInventory.upsert({
            where: {
              dealerId_carat: {
                dealerId: currentUserDealerId,
                carat: line.carat,
              },
            },
            update: {
              weight: { increment: line.weight },
              pureWeight: { increment: line.hasEquivalent },
            },
            create: {
              dealerId: currentUserDealerId,
              carat: line.carat,
              weight: line.weight,
              pureWeight: line.hasEquivalent,
              notes: `Gider Pusulası (${voucherNumber}) alımı`,
            },
          });
        }

        // 2. Kasa nakit çıkışı (Nakit ödeme ise ve açık kasa oturumu varsa)
        if (paymentMethod === EXPENSE_VOUCHER_PAYMENT_METHODS.NAKIT) {
          const activeSession = await tx.cashRegisterSession.findFirst({
            where: {
              dealerId: currentUserDealerId,
              status: 'OPEN',
            },
            orderBy: { createdAt: 'desc' },
          });

          if (activeSession) {
            await tx.cashMovement.create({
              data: {
                sessionId: activeSession.id,
                dealerId: currentUserDealerId,
                type: 'SCRAP_BUY',
                category: 'EXPENSE',
                paymentMethod: 'CASH',
                amount: calculation.netAmount,
                currency: 'TL',
                hasEquivalent: calculation.totalPureGoldWeight,
                description: `Gider Pusulası Hurda Alım Ödemesi - ${voucherNumber} (${sellerName})`,
                referenceId: createdVoucher.id,
                employeeName: userName || userEmail || 'Kasiyer',
              },
            });

            await tx.cashRegisterSession.update({
              where: { id: activeSession.id },
              data: {
                systemCashTL: { decrement: calculation.netAmount },
                systemHasGram: { increment: calculation.totalPureGoldWeight },
              },
            });
          }
        }
      }

      return createdVoucher;
    });

    await logActivity({
      dealerId: currentUserDealerId,
      action: 'GİDER PUSULASI TANZİMİ',
      details: `${voucherNumber} numaralı gider pusulası düzenlendi. Satıcı: ${sellerName}, Tutar: ₺${calculation.netAmount}, Has: ${calculation.totalPureGoldWeight} gr.`,
      userEmail,
      userName,
    });

    return NextResponse.json(newVoucher, { status: 201 });
  } catch (error: any) {
    console.error('[API ExpenseVouchers] POST Error:', error);
    return NextResponse.json(
      { error: error?.message || 'Gider pusulası oluşturulurken bir hata meydana geldi.' },
      { status: 500 }
    );
  }
}
