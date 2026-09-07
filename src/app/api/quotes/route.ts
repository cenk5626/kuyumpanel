import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedContext, assertTenantOwnership } from '@/lib/security/auth-context';
import {
  QUOTE_STATUS,
  QUOTE_DEFAULTS,
} from '@/constants/pricing';
import {
  generateQuoteNumber,
  calculateQuoteTotals,
  checkDiscountAuthorization,
  isQuoteExpiredOrInvalidated,
} from '@/lib/pricing/quote-engine';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const ctx = await getAuthenticatedContext();
    const dealerId = ctx.dealerId;
    const role = ctx.role;

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const search = searchParams.get('search');
    const branchId = searchParams.get('branchId');

    const whereClause: any = {};
    if (role !== 'SUPER_ADMIN') {
      whereClause.dealerId = dealerId;
    }
    if (status) whereClause.status = status;
    if (branchId) whereClause.branchId = branchId;
    if (search) {
      whereClause.OR = [
        { quoteNumber: { contains: search } },
        { customerName: { contains: search } },
        { customerPhone: { contains: search } },
      ];
    }

    // Canlı Has altın fiyatını al (Tolerans kıyası için)
    const liveHasPrice = await prisma.hasPrice.findUnique({
      where: { id: 'singleton' },
    });
    const currentLiveAsk = liveHasPrice?.ask || 0;

    const quotes = await prisma.quote.findMany({
      where: whereClause,
      include: {
        customer: { select: { id: true, name: true, phone: true } },
        branch: { select: { id: true, name: true, code: true } },
        lines: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    // Her teklif için anlık geçersizlik / tolerans kontrolü yap
    const evaluatedQuotes = quotes.map((q) => {
      const evaluation = isQuoteExpiredOrInvalidated(q, currentLiveAsk);
      return {
        ...q,
        isInvalidated: evaluation.isInvalid,
        invalidationReason: evaluation.reason,
        invalidationMessage: evaluation.message,
        currentLiveGoldPrice: currentLiveAsk,
      };
    });

    return NextResponse.json({ success: true, quotes: evaluatedQuotes });
  } catch (error: any) {
    console.error('Quotes GET Hatası:', error);
    return NextResponse.json({ error: error.message || 'Teklifler yüklenemedi.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const ctx = await getAuthenticatedContext();
    const dealerId = ctx.dealerId;
    const role = ctx.role;
    const branchId = ctx.branchId || null;

    const body = await request.json();
    const {
      customerId,
      customerName,
      customerPhone,
      lines,
      discountPercent = 0,
      discountTl = 0,
      validityMinutes = QUOTE_DEFAULTS.DEFAULT_VALIDITY_MINUTES,
      maxGoldTolerancePercent = QUOTE_DEFAULTS.DEFAULT_TOLERANCE_PERCENT,
      notes,
    } = body;

    if (!customerName || !customerName.trim()) {
      return NextResponse.json({ error: 'Müşteri adı zorunludur.' }, { status: 400 });
    }

    if (!lines || !Array.isArray(lines) || lines.length === 0) {
      return NextResponse.json({ error: 'En az bir ürün kalemi eklenmelidir.' }, { status: 400 });
    }

    // 1. Hesaplama
    const totals = calculateQuoteTotals(lines, parseFloat(discountPercent) || 0, parseFloat(discountTl) || 0);

    // 2. İskonto Yetki Kontrolü
    const authCheck = checkDiscountAuthorization(role, totals.appliedDiscountPercent);
    const requiresApproval = authCheck.requiresApproval;
    const initialStatus = requiresApproval ? QUOTE_STATUS.PENDING_APPROVAL : QUOTE_STATUS.APPROVED;

    // 3. Canlı Has Altın Referans Kuru
    const liveHasPrice = await prisma.hasPrice.findUnique({
      where: { id: 'singleton' },
    });
    const baseGoldPrice = liveHasPrice?.ask || 3000;

    // 4. Geçerlilik Bitiş Zamanı
    const validUntil = new Date(Date.now() + validityMinutes * 60 * 1000);

    // 5. Sıradaki Teklif Numarası
    const count = await prisma.quote.count({ where: { dealerId } });
    const quoteNumber = generateQuoteNumber(dealerId, count);

    // 6. DB Kaydı (Transaction)
    const quote = await prisma.$transaction(async (tx: any) => {
      const created = await tx.quote.create({
        data: {
          dealerId,
          branchId,
          quoteNumber,
          customerId: customerId || null,
          customerName: customerName.trim(),
          customerPhone: customerPhone?.trim() || null,
          status: initialStatus,
          validUntil,
          baseGoldPrice,
          maxGoldTolerancePercent: parseFloat(maxGoldTolerancePercent) || QUOTE_DEFAULTS.DEFAULT_TOLERANCE_PERCENT,
          subtotalTl: totals.subtotalTl,
          discountTl: totals.discountAmountTl,
          discountPercent: totals.appliedDiscountPercent,
          totalTl: totals.totalTl,
          totalHas: totals.totalHas,
          requiresApproval,
          notes: notes?.trim() || null,
        },
      });

      for (const line of totals.lines) {
        await tx.quoteLine.create({
          data: {
            quoteId: created.id,
            barcode: line.barcode,
            title: line.title,
            carat: line.carat,
            weight: line.weight,
            laborCost: line.laborCost,
            unitPrice: line.unitPrice,
            totalPrice: line.totalPrice,
            hasEquivalent: line.hasEquivalent,
          },
        });
      }

      return created;
    });

    return NextResponse.json({
      success: true,
      quote,
      authCheck,
    });
  } catch (error: any) {
    console.error('Quotes POST Hatası:', error);
    return NextResponse.json({ error: error.message || 'Teklif oluşturulamadı.' }, { status: 500 });
  }
}
