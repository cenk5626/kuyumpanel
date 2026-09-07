import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedContext } from '@/lib/security/auth-context';
import {
  calculateFxTransaction,
  generateFxExchangeNumber,
} from '@/lib/cash/forex-calculator';
import { logActivity } from '@/lib/logger';
import { sanitizeBody } from '@/lib/security/validation';
import { ensureDefaultBranch } from '@/lib/branch/bootstrap';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const ctx = await getAuthenticatedContext();
    const dealerId = ctx.dealerId;

    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get('sessionId');
    const branchId = searchParams.get('branchId');

    const whereClause: any = { dealerId };
    if (sessionId) whereClause.sessionId = sessionId;
    if (branchId) whereClause.branchId = branchId;

    const exchanges = await prisma.fxExchange.findMany({
      where: whereClause,
      include: {
        branch: {
          select: { id: true, name: true, code: true },
        },
        session: {
          select: { id: true, sessionNumber: true, status: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });

    return NextResponse.json({ exchanges });
  } catch (error: any) {
    if (error.statusCode === 401 || error.statusCode === 403) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error('[API FX Exchange] GET Error:', error);
    return NextResponse.json({ error: 'Döviz işlemleri alınamadı.' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const ctx = await getAuthenticatedContext();
    const dealerId = ctx.dealerId;

    const rawBody = await req.json();
    const body = sanitizeBody(rawBody, [
      'fromCurrency',
      'fromAmount',
      'toCurrency',
      'exchangeRate',
      'marketRate',
      'customerName',
      'customerPhone',
      'notes',
      'branchId',
    ] as const);

    const {
      fromCurrency,
      fromAmount,
      toCurrency,
      exchangeRate,
      marketRate,
      customerName,
      customerPhone,
      notes,
      branchId: reqBranchId,
    } = body;

    if (!fromCurrency || !toCurrency) {
      return NextResponse.json({ error: 'Kaynak ve hedef para birimleri zorunludur.' }, { status: 400 });
    }

    if (fromCurrency === toCurrency) {
      return NextResponse.json({ error: 'Kaynak ve hedef para birimi aynı olamaz.' }, { status: 400 });
    }

    const numFromAmount = Number(fromAmount);
    const numExchangeRate = Number(exchangeRate);
    const numMarketRate = marketRate ? Number(marketRate) : undefined;

    if (!numFromAmount || numFromAmount <= 0) {
      return NextResponse.json({ error: 'Geçersiz işlem tutarı.' }, { status: 400 });
    }

    if (!numExchangeRate || numExchangeRate <= 0) {
      return NextResponse.json({ error: 'Geçersiz döviz kuru.' }, { status: 400 });
    }

    const { toAmount, profitTL } = calculateFxTransaction({
      fromCurrency,
      fromAmount: numFromAmount,
      toCurrency,
      exchangeRate: numExchangeRate,
      marketRate: numMarketRate,
    });

    let branchId = reqBranchId;
    if (!branchId) {
      branchId = await ensureDefaultBranch(dealerId);
    }

    // Aktif açık kasa oturumu var mı kontrol et
    const activeSession = await prisma.cashRegisterSession.findFirst({
      where: { dealerId, status: 'OPEN', ...(branchId ? { branchId } : {}) },
      orderBy: { openedAt: 'desc' },
    });

    const existingCount = await prisma.fxExchange.count({ where: { dealerId } });
    const exchangeNumber = generateFxExchangeNumber(existingCount);

    const result = await prisma.$transaction(async (tx) => {
      // 1. Döviz Alım-Satım Kaydı
      const exchange = await tx.fxExchange.create({
        data: {
          dealerId,
          branchId,
          sessionId: activeSession ? activeSession.id : null,
          exchangeNumber,
          fromCurrency,
          fromAmount: numFromAmount,
          toCurrency,
          toAmount,
          exchangeRate: numExchangeRate,
          marketRate: numMarketRate || null,
          profitTL,
          customerName: customerName ? String(customerName).trim() : null,
          customerPhone: customerPhone ? String(customerPhone).trim() : null,
          notes: notes ? String(notes).trim() : null,
          createdBy: ctx.userName,
        },
        include: {
          branch: true,
          session: true,
        },
      });

      // 2. Açık Kasa Oturumuna Hareketleri Yansıt
      if (activeSession) {
        // Alınan Para (Kasaya Giriş)
        await tx.cashMovement.create({
          data: {
            sessionId: activeSession.id,
            dealerId,
            type: 'INFLOW',
            category: 'SALES',
            paymentMethod: 'CASH',
            currency: fromCurrency,
            amount: numFromAmount,
            description: `${exchangeNumber} Döviz Girişi (${numFromAmount} ${fromCurrency})`,
            referenceId: exchange.id,
            employeeName: ctx.userName,
          },
        });

        // Verilen Para (Kasadan Çıkış)
        await tx.cashMovement.create({
          data: {
            sessionId: activeSession.id,
            dealerId,
            type: 'OUTFLOW',
            category: 'DRAWING',
            paymentMethod: 'CASH',
            currency: toCurrency,
            amount: toAmount,
            description: `${exchangeNumber} Karşı Ödeme (${toAmount} ${toCurrency})`,
            referenceId: exchange.id,
            employeeName: ctx.userName,
          },
        });
      }

      // 3. Döviz / Sarrafiye Stoklarını Güncelle (USD veya EUR ise)
      if (fromCurrency === 'USD' || fromCurrency === 'EUR') {
        await tx.stock.upsert({
          where: { product_dealerId: { product: fromCurrency, dealerId } },
          update: { amount: { increment: numFromAmount } },
          create: {
            dealerId,
            branchId,
            product: fromCurrency,
            label: fromCurrency === 'USD' ? 'Amerikan Doları' : 'Euro',
            type: 'doviz',
            amount: numFromAmount,
            minThreshold: 100,
          },
        });
      }

      if (toCurrency === 'USD' || toCurrency === 'EUR') {
        await tx.stock.upsert({
          where: { product_dealerId: { product: toCurrency, dealerId } },
          update: { amount: { decrement: toAmount } },
          create: {
            dealerId,
            branchId,
            product: toCurrency,
            label: toCurrency === 'USD' ? 'Amerikan Doları' : 'Euro',
            type: 'doviz',
            amount: -toAmount,
            minThreshold: 100,
          },
        });
      }

      return exchange;
    });

    await logActivity({
      dealerId,
      userId: ctx.userId,
      action: 'FX_EXCHANGE',
      details: `${exchangeNumber} nolu döviz işlemi yapıldı: ${numFromAmount} ${fromCurrency} bozuldu -> ${toAmount} ${toCurrency} ödendi (Kur: ${numExchangeRate}, Kâr: ${profitTL} ₺).`,
    });

    return NextResponse.json({ success: true, exchange: result }, { status: 201 });
  } catch (error: any) {
    if (error.statusCode === 401 || error.statusCode === 403) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error('[API FX Exchange] POST Error:', error);
    return NextResponse.json(
      { error: error?.message || 'Döviz işlemi gerçekleştirilemedi.' },
      { status: 500 }
    );
  }
}
