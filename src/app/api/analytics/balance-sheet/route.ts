import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { calculateCustomerBalancesFromTransactions } from '@/lib/cari';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const currentUserRole = (session.user as any)?.role;
    const currentUserDealerId = (session.user as any)?.dealerId || 'merkez';

    let whereDealer: any = {};
    if (currentUserRole !== 'SUPER_ADMIN') {
      whereDealer.dealerId = currentUserDealerId;
    }

    // 1. Canlı Fiyatları Getir
    const [hasPrice, livePrices] = await Promise.all([
      prisma.hasPrice.findUnique({ where: { id: 'singleton' } }),
      prisma.livePrice.findMany(),
    ]);

    const spotHasBid = hasPrice?.bid || 3000;
    const spotHasAsk = hasPrice?.ask || 3050;

    const priceMap: Record<string, number> = {
      HAS: spotHasBid,
      GAUTRY: spotHasBid,
    };
    livePrices.forEach((p) => {
      priceMap[p.id] = p.bid;
    });

    const usdRate = priceMap['USDTRY'] || 34.0;
    const eurRate = priceMap['EURTRY'] || 37.5;

    // 2. Vitrindeki Barkodlu Takı Stokları
    const productItems = await prisma.productItem.findMany({
      where: { ...whereDealer, status: 'IN_STOCK' },
    });

    let totalJewelryWeight = 0;
    let totalJewelryCost = 0;
    let totalDiamondCount = 0;
    let totalDiamondCarat = 0;

    productItems.forEach((p) => {
      totalJewelryWeight += p.weight || 0;
      totalJewelryCost += (p.costPrice || 0) * (p.quantity || 1);
      if (p.isDiamond) {
        totalDiamondCount += p.diamondStoneCount || 1;
        totalDiamondCarat += p.diamondCarat || 0;
      }
    });

    // 3. Sarrafiye & Döviz Stokları
    const stocks = await prisma.stock.findMany({
      where: whereDealer,
    });

    let sarrafiyeHasEquivalent = 0;
    let dovizTotalTL = 0;

    stocks.forEach((s) => {
      if (s.type === 'döviz') {
        if (s.product.includes('USD')) dovizTotalTL += s.amount * usdRate;
        else if (s.product.includes('EUR')) dovizTotalTL += s.amount * eurRate;
        else dovizTotalTL += s.amount * 30; // fallback
      } else if (s.type === 'sarrafiye') {
        // Çeyrek = ~1.60 gr Has, Yarım = ~3.21 gr Has, Tam = ~6.42 gr Has
        if (s.product.includes('CEYREK')) sarrafiyeHasEquivalent += s.amount * 1.605;
        else if (s.product.includes('YARIM')) sarrafiyeHasEquivalent += s.amount * 3.21;
        else if (s.product.includes('TAM')) sarrafiyeHasEquivalent += s.amount * 6.42;
        else if (s.product.includes('ATA')) sarrafiyeHasEquivalent += s.amount * 6.60;
        else if (s.product.includes('GREMSE')) sarrafiyeHasEquivalent += s.amount * 16.05;
        else sarrafiyeHasEquivalent += s.amount * 1.5;
      }
    });

    // 4. Kasa Durumu (Aktif Oturum veya Kasa Toplamları)
    const activeSession = await prisma.cashRegisterSession.findFirst({
      where: { ...whereDealer, status: 'OPEN' },
      orderBy: { openedAt: 'desc' },
    });

    const cashTL = activeSession?.systemCash ?? activeSession?.openingCash ?? 0;

    // 5. Müşteri Alacakları (Cari)
    const customers = await prisma.customer.findMany({
      where: whereDealer,
      include: { transactions: true },
    });

    let totalCustomerHasReceivable = 0;
    let totalCustomerTlReceivable = 0;

    customers.forEach((c) => {
      const b = calculateCustomerBalancesFromTransactions(c.transactions || []);
      if (b.hasBalance > 0) totalCustomerHasReceivable += b.hasBalance;
      if (b.tlBalance > 0) totalCustomerTlReceivable += b.tlBalance;
    });

    // 6. Toptancı Borçları
    const suppliers = await prisma.supplier.findMany({
      where: whereDealer,
    });

    let totalSupplierHasDebt = 0;
    let totalSupplierTlDebt = 0;

    suppliers.forEach((s) => {
      if (s.hasBalance > 0) totalSupplierHasDebt += s.hasBalance;
      if (s.tlBalance > 0) totalSupplierTlDebt += s.tlBalance;
    });

    // 7. Net Bilanço & Özkaynak Hesaplaması
    const totalPhysicalGoldHas = (totalJewelryWeight * 0.916) + sarrafiyeHasEquivalent;
    const totalLiquidAssetsTL = cashTL + dovizTotalTL + totalCustomerTlReceivable;
    const totalLiquidAssetsHas = spotHasBid > 0 ? totalLiquidAssetsTL / spotHasBid : 0;

    const totalAssetsHas = totalPhysicalGoldHas + totalCustomerHasReceivable + totalLiquidAssetsHas;
    const totalAssetsTL = totalAssetsHas * spotHasBid;

    const totalLiabilitiesHas = totalSupplierHasDebt + (spotHasBid > 0 ? totalSupplierTlDebt / spotHasBid : 0);
    const totalLiabilitiesTL = totalLiabilitiesHas * spotHasBid;

    const netWealthHas = totalAssetsHas - totalLiabilitiesHas;
    const netWealthTL = netWealthHas * spotHasBid;

    // 8. Bugünün Kâr / Zarar Özeti
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayTransactions = await prisma.transaction.findMany({
      where: {
        ...whereDealer,
        type: 'sell',
        isDeleted: false,
        createdAt: { gte: today },
      },
    });

    let todaySalesTotal = 0;
    let todayProfitTotal = 0;

    todayTransactions.forEach((tx) => {
      todaySalesTotal += tx.total || 0;
      todayProfitTotal += tx.profitAmount || 0;
    });

    return NextResponse.json({
      spotPrices: {
        hasBid: spotHasBid,
        hasAsk: spotHasAsk,
        usdRate,
        eurRate,
      },
      netWealth: {
        netWealthHas: Number(netWealthHas.toFixed(3)),
        netWealthTL: Math.round(netWealthTL),
        totalAssetsHas: Number(totalAssetsHas.toFixed(3)),
        totalAssetsTL: Math.round(totalAssetsTL),
        totalLiabilitiesHas: Number(totalLiabilitiesHas.toFixed(3)),
        totalLiabilitiesTL: Math.round(totalLiabilitiesTL),
      },
      assetsBreakdown: {
        jewelry: {
          itemCount: productItems.length,
          totalWeight: Number(totalJewelryWeight.toFixed(2)),
          totalCost: Math.round(totalJewelryCost),
          estimatedHas: Number((totalJewelryWeight * 0.916).toFixed(3)),
          diamondCount: totalDiamondCount,
          diamondCarat: Number(totalDiamondCarat.toFixed(2)),
        },
        sarrafiye: {
          hasEquivalent: Number(sarrafiyeHasEquivalent.toFixed(3)),
          tlValue: Math.round(sarrafiyeHasEquivalent * spotHasBid),
        },
        doviz: {
          tlValue: Math.round(dovizTotalTL),
        },
        cashDrawer: {
          cashTL: Math.round(cashTL),
        },
        customerReceivables: {
          hasBalance: Number(totalCustomerHasReceivable.toFixed(3)),
          tlBalance: Math.round(totalCustomerTlReceivable),
        },
      },
      liabilitiesBreakdown: {
        supplierDebt: {
          hasBalance: Number(totalSupplierHasDebt.toFixed(3)),
          tlBalance: Math.round(totalSupplierTlDebt),
        },
      },
      todayPerformance: {
        salesVolume: Math.round(todaySalesTotal),
        netProfit: Math.round(todayProfitTotal),
        transactionCount: todayTransactions.length,
      },
    });
  } catch (error) {
    console.error('[API Balance Sheet] Error:', error);
    return NextResponse.json({ error: 'Bilanço hesaplanırken hata oluştu.' }, { status: 500 });
  }
}
