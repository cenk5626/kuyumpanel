import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { computeCustomerStatement } from '@/lib/cari';

/**
 * GET /api/customers/[id]/statement
 * Müşteriye ait detaylı hesap ekstresi, yürüyen bakiye (running balance) ve canlı portföy değerlemesi
 */
export async function GET(
  req: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await props.params;
    if (!id) {
      return NextResponse.json({ error: 'Müşteri ID gereklidir.' }, { status: 400 });
    }

    const currentUserRole = (session.user as any).role;
    const currentUserDealerId = (session.user as any).dealerId || 'merkez';

    const customer = await prisma.customer.findUnique({
      where: { id },
      include: {
        transactions: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!customer) {
      return NextResponse.json({ error: 'Müşteri bulunamadı.' }, { status: 404 });
    }

    if (currentUserRole !== 'SUPER_ADMIN' && customer.dealerId !== currentUserDealerId) {
      return NextResponse.json({ error: 'Bu müşterinin ekstresini görüntüleme yetkiniz yok.' }, { status: 403 });
    }

    // URL parametreleri (Tarih filtreleri ve Spot Kuru)
    const { searchParams } = new URL(req.url);
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');
    const spotRateParam = searchParams.get('spotRate');

    // Canlı Has Altın fiyatını bul (varsayılan: 3000)
    let currentSpotRate = 3000;
    if (spotRateParam && !isNaN(parseFloat(spotRateParam)) && parseFloat(spotRateParam) > 0) {
      currentSpotRate = parseFloat(spotRateParam);
    } else {
      const livePrice = await prisma.livePrice.findUnique({ where: { id: 'GAUTRY' } });
      if (livePrice && livePrice.ask > 0) {
        currentSpotRate = livePrice.ask;
      }
    }

    // Döviz kurlarını çek
    const liveUsd = await prisma.livePrice.findUnique({ where: { id: 'USDTRY' } });
    const liveEur = await prisma.livePrice.findUnique({ where: { id: 'EURTRY' } });
    const usdRate = liveUsd?.ask || 35;
    const eurRate = liveEur?.ask || 38;

    // Tüm hareketlerin kronolojik yürüyen bakiye hesaplaması
    const { rows: allRows, summary } = computeCustomerStatement(
      customer.transactions.map((tx) => ({
        id: tx.id,
        customerId: tx.customerId,
        type: tx.type,
        assetType: tx.assetType,
        amount: tx.amount,
        hasEquivalent: tx.hasEquivalent,
        unitPrice: tx.unitPrice,
        description: tx.description,
        employeeName: tx.employeeName,
        createdAt: tx.createdAt
          ? (tx.createdAt instanceof Date ? tx.createdAt.toISOString() : new Date(tx.createdAt).toISOString())
          : new Date().toISOString(),
      })),
      currentSpotRate,
      usdRate,
      eurRate
    );

    // Tarih aralığı filtresi varsa uygula
    let filteredRows = allRows;
    let openingBalanceTL = 0;
    let openingBalanceHas = 0;
    let openingBalanceUSD = 0;
    let openingBalanceEUR = 0;

    if (startDateParam || endDateParam) {
      const startTime = startDateParam ? new Date(startDateParam).getTime() : 0;
      const endTime = endDateParam ? new Date(`${endDateParam}T23:59:59.999Z`).getTime() : Infinity;

      // Başlangıç tarihinden önceki hareketlerden açılış bakiyesi türet
      const priorRows = allRows.filter((r) => {
        const t = r.createdAt ? new Date(r.createdAt).getTime() : 0;
        return t < startTime;
      });

      if (priorRows.length > 0) {
        const lastPrior = priorRows[priorRows.length - 1];
        openingBalanceTL = lastPrior.runningBalanceTL;
        openingBalanceHas = lastPrior.runningBalanceHas;
        openingBalanceUSD = lastPrior.runningBalanceUSD;
        openingBalanceEUR = lastPrior.runningBalanceEUR;
      }

      filteredRows = allRows.filter((r) => {
        const t = r.createdAt ? new Date(r.createdAt).getTime() : 0;
        return t >= startTime && t <= endTime;
      });
    }

    return NextResponse.json({
      customer: {
        id: customer.id,
        name: customer.name,
        phone: customer.phone,
        email: customer.email,
        tcNo: customer.tcNo,
        address: customer.address,
        note: customer.note,
        dealerId: customer.dealerId,
        createdAt: customer.createdAt
          ? (customer.createdAt instanceof Date ? customer.createdAt.toISOString() : new Date(customer.createdAt).toISOString())
          : new Date().toISOString(),
      },
      summary: {
        ...summary,
        usdRate,
        eurRate,
      },
      openingBalance: {
        tl: openingBalanceTL,
        has: openingBalanceHas,
        usd: openingBalanceUSD,
        eur: openingBalanceEUR,
      },
      rows: filteredRows,
      spotRate: currentSpotRate,
    });
  } catch (error) {
    console.error('[API Customer Statement] GET Error:', error);
    return NextResponse.json({ error: 'Müşteri ekstresi oluşturulamadı.' }, { status: 500 });
  }
}
