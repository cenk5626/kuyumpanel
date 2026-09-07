import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedContext, assertTenantOwnership } from '@/lib/security/auth-context';
import { QUOTE_STATUS } from '@/constants/pricing';
import { isQuoteExpiredOrInvalidated } from '@/lib/pricing/quote-engine';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await getAuthenticatedContext();
    const dealerId = ctx.dealerId;

    const { id } = await params;

    const quote = await prisma.quote.findFirst({
      where: { id, dealerId },
      include: {
        customer: true,
        branch: true,
        lines: true,
      },
    });

    if (!quote) {
      return NextResponse.json({ error: 'Teklif bulunamadı.' }, { status: 404 });
    }

    const liveHasPrice = await prisma.hasPrice.findUnique({
      where: { id: 'singleton' },
    });
    const currentLiveAsk = liveHasPrice?.ask || 0;
    const evaluation = isQuoteExpiredOrInvalidated(quote, currentLiveAsk);

    return NextResponse.json({
      success: true,
      quote: {
        ...quote,
        isInvalidated: evaluation.isInvalid,
        invalidationReason: evaluation.reason,
        invalidationMessage: evaluation.message,
        currentLiveGoldPrice: currentLiveAsk,
      },
    });
  } catch (error: any) {
    console.error('Quote Details GET Hatası:', error);
    return NextResponse.json({ error: error.message || 'Teklif detayları alınamadı.' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await getAuthenticatedContext();
    const dealerId = ctx.dealerId;
    const userRole = ctx.role;
    const userEmail = ctx.userEmail;

    const { id } = await params;
    const body = await request.json();
    const { action, paymentMethod = 'CASH' } = body;

    const existing = await prisma.quote.findFirst({
      where: { id, dealerId },
      include: { lines: true },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Teklif bulunamadı.' }, { status: 404 });
    }

    // 1. Yönetici Onayı (APPROVE)
    if (action === 'APPROVE') {
      if (userRole !== 'ADMIN' && userRole !== 'SUPER_ADMIN') {
        return NextResponse.json({ error: 'Yalnızca yönetici bu teklifi onaylayabilir.' }, { status: 403 });
      }

      const updated = await prisma.quote.update({
        where: { id },
        data: {
          status: QUOTE_STATUS.APPROVED,
          approvedBy: userEmail,
          approvedAt: new Date(),
        },
      });

      return NextResponse.json({ success: true, quote: updated });
    }

    // 2. Reddetme (REJECT)
    if (action === 'REJECT') {
      const updated = await prisma.quote.update({
        where: { id },
        data: {
          status: QUOTE_STATUS.REJECTED,
        },
      });

      return NextResponse.json({ success: true, quote: updated });
    }

    // 3. Satışa Dönüştürme (CONVERT to Transaction)
    if (action === 'CONVERT') {
      if (existing.status !== QUOTE_STATUS.APPROVED && existing.status !== QUOTE_STATUS.DRAFT) {
        return NextResponse.json(
          { error: `Yalnızca onaylı teklifler satışa dönüştürülebilir. Mevcut durum: ${existing.status}` },
          { status: 400 }
        );
      }

      // Canlı kur ve süre denetimi
      const liveHasPrice = await prisma.hasPrice.findUnique({
        where: { id: 'singleton' },
      });
      const evaluation = isQuoteExpiredOrInvalidated(existing, liveHasPrice?.ask || 0);
      if (evaluation.isInvalid) {
        return NextResponse.json(
          { error: `Teklif satışa dönüştürülemez: ${evaluation.message}` },
          { status: 400 }
        );
      }

      // Transaction kaydı aç
      const result = await prisma.$transaction(async (tx: any) => {
        const transaction = await tx.transaction.create({
          data: {
            dealerId,
            branchId: existing.branchId || null,
            customerId: existing.customerId || null,
            type: 'SALE',
            paymentMethod,
            totalAmount: existing.totalTl,
            receivedAmount: existing.totalTl,
            hasAmount: existing.totalHas,
            discountAmount: existing.discountTl,
            description: `Tekliften dönüştürüldü (${existing.quoteNumber}) - Müşteri: ${existing.customerName}`,
            items: JSON.stringify(existing.lines),
          },
        });

        const updatedQuote = await tx.quote.update({
          where: { id },
          data: {
            status: QUOTE_STATUS.CONVERTED,
            convertedTransactionId: transaction.id,
            convertedAt: new Date(),
          },
        });

        return { transaction, quote: updatedQuote };
      });

      return NextResponse.json({
        success: true,
        message: 'Teklif başarıyla resmi satışa dönüştürüldü.',
        ...result,
      });
    }

    return NextResponse.json({ error: 'Geçersiz eylem.' }, { status: 400 });
  } catch (error: any) {
    console.error('Quote PATCH Hatası:', error);
    return NextResponse.json({ error: error.message || 'Teklif güncellenemedi.' }, { status: 500 });
  }
}
