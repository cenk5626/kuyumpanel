import { prisma } from '@/lib/prisma';
import {
  PAYMENT_METHODS,
  SESSION_STATUS,
  CASH_MOVEMENT_TYPES,
  CASH_MOVEMENT_CATEGORIES,
  CASH_CURRENCIES,
  DISCREPANCY_STATUS,
  DiscrepancyStatus,
  SessionStatus,
  PaymentMethod,
} from '@/constants/kasa';

export interface DailyZReportMetrics {
  sessionId: string;
  sessionNumber: string;
  status: SessionStatus;
  openedAt: Date;
  closedAt: Date | null;
  openedBy: string;
  closedBy: string | null;
  notes: string | null;

  // Açılış Devirleri
  openingCashTL: number;
  openingCashUSD: number;
  openingCashEUR: number;
  openingHasGram: number;

  // Satış Hasılat Kırılımları
  cashSales: number;
  cardSales: number;
  bankSales: number;
  hasSalesTL: number;
  debtSalesTL: number;
  totalTurnover: number; // cash + card + bank + has
  totalSalesCount: number;
  totalProfitTL: number;
  profitMarginPercent: number;
  profitableTransactionsCount: number;

  // Cari ve Tedarikçi Hareketleri
  customerCashCollections: number;
  customerHasCollectionsGram: number;
  supplierCashPayments: number;
  supplierHasPaymentsGram: number;

  // Hurda / Geri Alış
  scrapCashPurchases: number;
  scrapGoldGramsIn: number;
  scrapBuysCount: number;

  // Manuel Kasa Giriş/Çıkış
  manualCashIn: number;
  manualCashOut: number;

  // Sistem ve Fiili Mutabakat
  systemCashTL: number;
  countedCashTL: number | null;
  discrepancyTL: number | null;
  discrepancyStatus: DiscrepancyStatus;

  // Diğer Para Birimleri Fiili ve Fark
  systemCashUSD: number;
  countedCashUSD: number | null;
  diffCashUSD: number | null;

  systemCashEUR: number;
  countedCashEUR: number | null;
  diffCashEUR: number | null;

  systemHasGram: number;
  countedHasGram: number | null;
  diffHasGram: number | null;
}

export interface CashMovementRecord {
  id: string;
  sessionId: string;
  type: string;
  category: string | null;
  paymentMethod: string;
  amount: number;
  currency: string;
  hasEquivalent: number | null;
  description: string;
  employeeName: string | null;
  createdAt: Date;
}

/**
 * Belirtilen tarih aralığı ve bayi için Z-Raporu verilerini konsolide eder.
 */
export async function getDailyZReportSummary(
  dealerId: string,
  targetDate?: Date | string
): Promise<{
  activeSession: DailyZReportMetrics | null;
  archiveSessions: DailyZReportMetrics[];
  recentMovements: CashMovementRecord[];
}> {
  const dateObj = targetDate ? new Date(targetDate) : new Date();
  const startOfDay = new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate(), 0, 0, 0);
  const endOfDay = new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate(), 23, 59, 59, 999);

  // 1. Bayinin aktif (AÇIK) oturumunu veya o güne ait oturumları çek
  const sessions = await prisma.cashRegisterSession.findMany({
    where: {
      dealerId,
      OR: [
        { status: SESSION_STATUS.OPEN },
        {
          openedAt: {
            gte: startOfDay,
            lte: endOfDay,
          },
        },
      ],
    },
    include: {
      movements: {
        orderBy: { createdAt: 'desc' },
      },
      transactions: {
        orderBy: { createdAt: 'desc' },
      },
    },
    orderBy: { openedAt: 'desc' },
  });

  // Geçmiş tüm oturumlar (Son 30)
  const pastSessions = await prisma.cashRegisterSession.findMany({
    where: { dealerId },
    include: {
      movements: true,
      transactions: true,
    },
    orderBy: { openedAt: 'desc' },
    take: 30,
  });

  const activeSessionRaw = sessions.find((s) => s.status === SESSION_STATUS.OPEN) || sessions[0] || null;

  let activeMetrics: DailyZReportMetrics | null = null;
  if (activeSessionRaw) {
    activeMetrics = await calculateSessionMetrics(activeSessionRaw, dealerId);
  }

  const archiveMetrics: DailyZReportMetrics[] = [];
  for (const s of pastSessions) {
    const m = await calculateSessionMetrics(s, dealerId);
    archiveMetrics.push(m);
  }

  // Son kasa hareketleri
  const recentMovementsRaw = await prisma.cashMovement.findMany({
    where: { dealerId },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });

  const recentMovements: CashMovementRecord[] = recentMovementsRaw.map((m) => ({
    id: m.id,
    sessionId: m.sessionId,
    type: m.type,
    category: m.category,
    paymentMethod: m.paymentMethod,
    amount: m.amount,
    currency: m.currency,
    hasEquivalent: m.hasEquivalent,
    description: m.description,
    employeeName: m.employeeName,
    createdAt: m.createdAt,
  }));

  return {
    activeSession: activeMetrics,
    archiveSessions: archiveMetrics,
    recentMovements,
  };
}

/**
 * Belirli bir kasa oturumunun tüm rakamlarını ve mutabakatını hesaplar.
 */
export async function calculateSessionMetrics(
  session: any,
  dealerId: string
): Promise<DailyZReportMetrics> {
  const sessionStartTime = session.openedAt;
  const sessionEndTime = session.closedAt || new Date();

  // Oturuma bağlı veya oturum zaman aralığındaki işlemleri topla
  const transactions = await prisma.transaction.findMany({
    where: {
      dealerId,
      OR: [
        { sessionId: session.id },
        {
          createdAt: {
            gte: sessionStartTime,
            lte: sessionEndTime,
          },
        },
      ],
    },
  });

  // Oturuma bağlı veya aralıktaki kasa hareketlerini topla
  const movements = await prisma.cashMovement.findMany({
    where: {
      dealerId,
      OR: [
        { sessionId: session.id },
        {
          createdAt: {
            gte: sessionStartTime,
            lte: sessionEndTime,
          },
        },
      ],
    },
  });

  // Müşteri Tahsilatları (CustomerTransaction)
  const customerTxs = await prisma.customerTransaction.findMany({
    where: {
      dealerId,
      createdAt: {
        gte: sessionStartTime,
        lte: sessionEndTime,
      },
    },
  });

  // Tedarikçi Ödemeleri (SupplierTransaction)
  const supplierTxs = await prisma.supplierTransaction.findMany({
    where: {
      dealerId,
      createdAt: {
        gte: sessionStartTime,
        lte: sessionEndTime,
      },
    },
  });

  let cashSales = 0;
  let cardSales = 0;
  let bankSales = 0;
  let hasSalesTL = 0;
  let debtSalesTL = 0;
  let totalSalesCount = 0;

  let scrapCashPurchases = 0;
  let scrapGoldGramsIn = 0;
  let scrapBuysCount = 0;

  let totalProfitTL = 0;
  let profitableTransactionsCount = 0;

  for (const tx of transactions) {
    if (tx.type === 'sell') {
      totalSalesCount++;
      const method = (tx.paymentMethod || PAYMENT_METHODS.CASH).toUpperCase();
      if (method === PAYMENT_METHODS.CASH) {
        cashSales += tx.total;
      } else if (method === PAYMENT_METHODS.CARD) {
        cardSales += tx.total;
      } else if (method === PAYMENT_METHODS.BANK) {
        bankSales += tx.total;
      } else if (method === PAYMENT_METHODS.HAS) {
        hasSalesTL += tx.total;
      } else if (method === PAYMENT_METHODS.DEBT) {
        debtSalesTL += tx.total;
      } else {
        cashSales += tx.total;
      }

      if (tx.profitAmount != null) {
        totalProfitTL += tx.profitAmount;
        if (tx.profitAmount >= 0) profitableTransactionsCount++;
      }
    } else if (tx.type === 'buy') {
      scrapBuysCount++;
      scrapCashPurchases += tx.total;
      if (tx.hasEquivalent && tx.hasEquivalent > 0) {
        scrapGoldGramsIn += tx.hasEquivalent;
      } else if (tx.productType === 'sarrafiye' || tx.productType === 'hurda') {
        scrapGoldGramsIn += tx.quantity;
      }
    }
  }

  // Müşteri Tahsilatları
  let customerCashCollections = 0;
  let customerHasCollectionsGram = 0;
  for (const ctx of customerTxs) {
    if (ctx.type === 'TAHSILAT') {
      if (ctx.assetType === 'TL') {
        customerCashCollections += ctx.amount;
      } else {
        customerHasCollectionsGram += ctx.hasEquivalent || 0;
      }
    }
  }

  // Tedarikçi Ödemeleri
  let supplierCashPayments = 0;
  let supplierHasPaymentsGram = 0;
  for (const stx of supplierTxs) {
    if (stx.type === 'TL_PAYMENT') {
      supplierCashPayments += stx.tlAmount;
    } else if (stx.type === 'HAS_PAYMENT') {
      supplierHasPaymentsGram += stx.hasAmount;
    }
  }

  // Manuel Hareketler
  let manualCashIn = 0;
  let manualCashOut = 0;
  for (const m of movements) {
    if (
      m.type === CASH_MOVEMENT_TYPES.MANUAL_IN ||
      (m.type === CASH_MOVEMENT_TYPES.INFLOW &&
        (m.category === CASH_MOVEMENT_CATEGORIES.CAPITAL || m.category === CASH_MOVEMENT_CATEGORIES.CORRECTION))
    ) {
      manualCashIn += m.amount;
    } else if (
      m.type === CASH_MOVEMENT_TYPES.MANUAL_OUT ||
      (m.type === CASH_MOVEMENT_TYPES.OUTFLOW &&
        (m.category === CASH_MOVEMENT_CATEGORIES.EXPENSE ||
          m.category === CASH_MOVEMENT_CATEGORIES.DRAWING ||
          m.category === CASH_MOVEMENT_CATEGORIES.CORRECTION))
    ) {
      manualCashOut += m.amount;
    }
  }

  const openingCashTL = session.openingCashTL || session.openingCash || 0;
  const openingCashUSD = session.openingCashUSD || 0;
  const openingCashEUR = session.openingCashEUR || 0;
  const openingHasGram = session.openingHasGram || 0;

  // Beklenen Sistem Kasa Nakdi
  const systemCashTL = Number(
    (
      openingCashTL +
      cashSales +
      customerCashCollections +
      manualCashIn -
      supplierCashPayments -
      scrapCashPurchases -
      manualCashOut
    ).toFixed(2)
  );

  const totalTurnover = Number((cashSales + cardSales + bankSales + hasSalesTL).toFixed(2));
  const profitMarginPercent = totalTurnover > 0 && totalTurnover > totalProfitTL
    ? Number(((totalProfitTL / (totalTurnover - totalProfitTL)) * 100).toFixed(2))
    : 0;

  // Fiili Sayım & Fark
  const countedCashTL = session.countedCashTL != null ? session.countedCashTL : session.countedCash;
  let discrepancyTL: number | null = null;
  let discrepancyStatus: DiscrepancyStatus = DISCREPANCY_STATUS.BALANCED;

  if (countedCashTL != null) {
    discrepancyTL = Number((countedCashTL - systemCashTL).toFixed(2));
    if (discrepancyTL < -0.015) {
      discrepancyStatus = DISCREPANCY_STATUS.SHORTAGE;
    } else if (discrepancyTL > 0.015) {
      discrepancyStatus = DISCREPANCY_STATUS.OVERAGE;
    } else {
      discrepancyStatus = DISCREPANCY_STATUS.BALANCED;
    }
  }

  return {
    sessionId: session.id,
    sessionNumber: session.sessionNumber || `Z-${session.id.substring(0, 8).toUpperCase()}`,
    status: (session.status as SessionStatus) || SESSION_STATUS.OPEN,
    openedAt: session.openedAt,
    closedAt: session.closedAt,
    openedBy: session.openedBy,
    closedBy: session.closedBy,
    notes: session.notes,

    openingCashTL: Number(openingCashTL.toFixed(2)),
    openingCashUSD: Number(openingCashUSD.toFixed(2)),
    openingCashEUR: Number(openingCashEUR.toFixed(2)),
    openingHasGram: Number(openingHasGram.toFixed(3)),

    cashSales: Number(cashSales.toFixed(2)),
    cardSales: Number(cardSales.toFixed(2)),
    bankSales: Number(bankSales.toFixed(2)),
    hasSalesTL: Number(hasSalesTL.toFixed(2)),
    debtSalesTL: Number(debtSalesTL.toFixed(2)),
    totalTurnover,
    totalSalesCount,
    totalProfitTL: Number(totalProfitTL.toFixed(2)),
    profitMarginPercent,
    profitableTransactionsCount,

    customerCashCollections: Number(customerCashCollections.toFixed(2)),
    customerHasCollectionsGram: Number(customerHasCollectionsGram.toFixed(3)),
    supplierCashPayments: Number(supplierCashPayments.toFixed(2)),
    supplierHasPaymentsGram: Number(supplierHasPaymentsGram.toFixed(3)),

    scrapCashPurchases: Number(scrapCashPurchases.toFixed(2)),
    scrapGoldGramsIn: Number(scrapGoldGramsIn.toFixed(3)),
    scrapBuysCount,

    manualCashIn: Number(manualCashIn.toFixed(2)),
    manualCashOut: Number(manualCashOut.toFixed(2)),

    systemCashTL,
    countedCashTL: countedCashTL != null ? Number(countedCashTL.toFixed(2)) : null,
    discrepancyTL,
    discrepancyStatus,

    systemCashUSD: Number(openingCashUSD.toFixed(2)),
    countedCashUSD: session.countedCashUSD != null ? Number(session.countedCashUSD.toFixed(2)) : null,
    diffCashUSD: session.diffCashUSD,

    systemCashEUR: Number(openingCashEUR.toFixed(2)),
    countedCashEUR: session.countedCashEUR != null ? Number(session.countedCashEUR.toFixed(2)) : null,
    diffCashEUR: session.diffCashEUR,

    systemHasGram: Number((openingHasGram + customerHasCollectionsGram - supplierHasPaymentsGram + scrapGoldGramsIn).toFixed(3)),
    countedHasGram: session.countedHasGram != null ? Number(session.countedHasGram.toFixed(3)) : null,
    diffHasGram: session.diffHasGram,
  };
}

/**
 * 80mm ve 58mm Termal Fiş Metin Formatlayıcı
 */
export function formatThermalReceiptText(metrics: DailyZReportMetrics, is58mm: boolean = false): string {
  const width = is58mm ? 32 : 48;
  const sep = '='.repeat(width);
  const dash = '-'.repeat(width);

  const center = (text: string) => {
    const pad = Math.max(0, Math.floor((width - text.length) / 2));
    return ' '.repeat(pad) + text;
  };

  const row = (label: string, value: string) => {
    let l = label;
    if (is58mm && l.length + value.length >= width) {
      const maxLabelLen = Math.max(8, width - value.length - 1);
      l = l.substring(0, maxLabelLen);
    }
    const space = width - l.length - value.length;
    return l + ' '.repeat(Math.max(1, space)) + value;
  };

  const formattedDate = new Date(metrics.openedAt).toLocaleString('tr-TR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const diffStr =
    metrics.discrepancyTL != null
      ? `${metrics.discrepancyTL >= 0 ? '+' : ''}${metrics.discrepancyTL.toFixed(2)} TL (${metrics.discrepancyStatus})`
      : 'Henüz Sayılmadı';

  const lines = [
    center('*** GÜN SONU Z-RAPORU ***'),
    center(is58mm ? 'Kuyumcu Panel' : 'Kuyumcu Panel Mücevherat'),
    sep,
    row('Tarih / Saat:', formattedDate),
    row('Z-Rapor No:', metrics.sessionNumber),
    row('Kasa Durumu:', metrics.status === SESSION_STATUS.OPEN ? 'AÇIK' : 'KAPALI'),
    row('Kasiyer:', metrics.closedBy || metrics.openedBy || 'Genel'),
    dash,
    center('--- NAKİT KASA AKIŞI ---'),
    row('Devir Açılış Kasası:', `${metrics.openingCashTL.toFixed(2)} TL`),
    row('(+) Nakit Satışlar:', `${metrics.cashSales.toFixed(2)} TL`),
    row('(+) Cari Tahsilatlar:', `${metrics.customerCashCollections.toFixed(2)} TL`),
    row('(+) Manuel Girişler:', `${metrics.manualCashIn.toFixed(2)} TL`),
    row('(-) Toptancı Ödemeleri:', `${metrics.supplierCashPayments.toFixed(2)} TL`),
    row('(-) Hurda Alış Ödemeleri:', `${metrics.scrapCashPurchases.toFixed(2)} TL`),
    row('(-) Manuel Çıkış / Masraf:', `${metrics.manualCashOut.toFixed(2)} TL`),
    dash,
    row('Beklenen Kasa Nakdi:', `${metrics.systemCashTL.toFixed(2)} TL`),
    row('Sayılan Fiili Nakit:', `${(metrics.countedCashTL ?? metrics.systemCashTL).toFixed(2)} TL`),
    row(is58mm ? 'Kasa Farkı:' : 'KASA FARKI (Mutabakat):', diffStr),
    dash,
    center(is58mm ? '--- DİĞER HAREKETLER ---' : '--- DİĞER HASILAT & ALTIN HAREKETİ ---'),
    row('POS / Kredi Kartı Toplamı:', `${metrics.cardSales.toFixed(2)} TL`),
    row('Banka Havale Toplamı:', `${metrics.bankSales.toFixed(2)} TL`),
    row('Giren Hurda Altın:', `${metrics.scrapGoldGramsIn.toFixed(3)} gr`),
    row('Çıkan Has Altın:', `${metrics.supplierHasPaymentsGram.toFixed(3)} gr`),
    sep,
    row('GÜNLÜK TOPLAM CİRO:', `${metrics.totalTurnover.toFixed(2)} TL`),
    sep,
    '',
    row('Kasiyer İmza:', 'Yetkili İmza:'),
    row('................', '................'),
    '',
    center(is58mm ? 'Mali Değeri Yoktur' : 'Mali Değeri Yoktur - Bilgi Fişidir'),
  ];

  return lines.join('\n');
}
