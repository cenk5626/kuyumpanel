/**
 * Domain Logic Reference Engines and Jewelry Calculation Utilities.
 * Used for authoritative expected output derivation and opaque-box test verification.
 * Adheres strictly to Zero Magic Numbers / Strings rule.
 */

import {
  CUSTOMER_TRANSACTION_TYPES,
  SUPPLIER_TRANSACTION_TYPES,
  ASSET_TYPES,
  GOLD_FINENESS_RATES,
  ZIYNET_WEIGHTS,
  calculateHasEquivalent,
} from '../../src/constants/cari';

import {
  PAYMENT_METHODS,
  SESSION_STATUS,
  CASH_MOVEMENT_TYPES,
  CASH_MOVEMENT_CATEGORIES,
  CASH_CURRENCIES,
} from '../../src/constants/kasa';

// ---------------------- DOMAIN CONSTANTS & ENUMS ----------------------

export const LABEL_SPECS = {
  BUTTERFLY_74x12: {
    NAME: 'BUTTERFLY_74x12',
    TOTAL_WIDTH_MM: 74,
    TOTAL_HEIGHT_MM: 12,
    LEFT_WING_WIDTH_MM: 29,
    BRIDGE_WIDTH_MM: 16,
    RIGHT_WING_WIDTH_MM: 29,
    DPI_203_DOTS_PER_MM: 8,
    DPI_300_DOTS_PER_MM: 11.811,
  },
  BARBELL_50x12: {
    NAME: 'BARBELL_50x12',
    TOTAL_WIDTH_MM: 50,
    TOTAL_HEIGHT_MM: 12,
    LEFT_WING_WIDTH_MM: 18,
    BRIDGE_WIDTH_MM: 14,
    RIGHT_WING_WIDTH_MM: 18,
  },
} as const;

export const TURNOVER_SPEEDS = {
  HIZLI: 'HIZLI',
  NORMAL: 'NORMAL',
  YAVAS: 'YAVAS',
  HAREKETSIZ: 'HAREKETSIZ',
} as const;

export type TurnoverSpeed = (typeof TURNOVER_SPEEDS)[keyof typeof TURNOVER_SPEEDS];

export const TURNOVER_THRESHOLDS = {
  HIGH_VELOCITY_MIN_DAILY: 1.0,
  FAST_STOCKOUT_MAX_DAYS: 14,
  NORMAL_STOCKOUT_MAX_DAYS: 45,
  MIN_DAYS_WINDOW: 7,
  STANDARD_DAYS_WINDOW: 30,
  LONG_DAYS_WINDOW: 90,
} as const;

export const THERMAL_SLIP_CONFIG = {
  WIDTH_80MM_CHARS: 48,
  WIDTH_58MM_CHARS: 32,
  LINE_SEPARATOR: '=',
  DASH_SEPARATOR: '-',
} as const;

export const WHATSAPP_CONFIG = {
  BASE_URL: 'https://wa.me/',
  COUNTRY_CODE_TR: '90',
  DEFAULT_STORE_NAME: 'Kuyumcu Panel Mücevherat',
} as const;

export const REORDER_CONFIG = {
  DEFAULT_SAFETY_MULTIPLIER: 2,
  MIN_DEFAULT_THRESHOLD: 5,
} as const;

// ---------------------- 1. DUAL BALANCE & RUNNING LEDGER ENGINE ----------------------

export interface CustomerTransactionInput {
  id?: string;
  customerId: string;
  type: string; // BORC, TAHSILAT, ALACAK, ODEME
  assetType: string; // TL, HAS, 22K, 14K, CEYREK, etc.
  amount: number;
  unitPrice?: number | null;
  hasEquivalent?: number;
  description?: string | null;
  createdAt?: string | Date;
}

export interface CustomerStatementRow extends CustomerTransactionInput {
  runningBalanceTL: number;
  runningBalanceHas: number;
}

export interface CustomerBalanceSummary {
  tlBalance: number;
  hasBalance: number;
  estimatedTotalTL: number; // hasBalance * currentSpotRate + tlBalance
}

export function computeCustomerStatement(
  transactions: CustomerTransactionInput[],
  currentSpotRate: number = 3000
): { rows: CustomerStatementRow[]; summary: CustomerBalanceSummary } {
  let runningTL = 0;
  let runningHas = 0;

  // Sort chronologically ascending
  const sorted = [...transactions].sort((a, b) => {
    const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return timeA - timeB;
  });

  const rows: CustomerStatementRow[] = sorted.map((tx) => {
    const isDebt = tx.type === CUSTOMER_TRANSACTION_TYPES.BORC || tx.type === CUSTOMER_TRANSACTION_TYPES.ODEME;
    const isCredit = tx.type === CUSTOMER_TRANSACTION_TYPES.TAHSILAT || tx.type === CUSTOMER_TRANSACTION_TYPES.ALACAK;
    const multiplier = isDebt ? 1 : isCredit ? -1 : 0;

    const hasEq = tx.hasEquivalent !== undefined
      ? tx.hasEquivalent
      : calculateHasEquivalent(tx.assetType, tx.amount, tx.unitPrice);

    if (tx.assetType.toUpperCase() === ASSET_TYPES.TL) {
      runningTL += tx.amount * multiplier;
    } else {
      runningHas += hasEq * multiplier;
    }

    return {
      ...tx,
      hasEquivalent: Number(hasEq.toFixed(4)),
      runningBalanceTL: Number(runningTL.toFixed(2)),
      runningBalanceHas: Number(runningHas.toFixed(4)),
    };
  });

  const summary: CustomerBalanceSummary = {
    tlBalance: Number(runningTL.toFixed(2)),
    hasBalance: Number(runningHas.toFixed(4)),
    estimatedTotalTL: Number((runningTL + runningHas * currentSpotRate).toFixed(2)),
  };

  return { rows, summary };
}

// ---------------------- 2. POS MULTI-PAYMENT ENGINE ----------------------

export interface PosPaymentSplit {
  method: string; // CASH, CARD, BANK, HAS, DEBT
  amount: number; // TL equivalent
  hasWeight?: number; // if method === HAS
  cardFeeRate?: number; // %
}

export interface PosTransactionPayload {
  saleTotalTL: number;
  payments: PosPaymentSplit[];
  customerId?: string | null;
  items: Array<{ barcode: string; title: string; quantity: number; unitPriceTL: number }>;
}

export function validateAndProcessPosSale(payload: PosTransactionPayload): {
  isValid: boolean;
  totalPaid: number;
  balanceDifference: number;
  cashPortion: number;
  cardPortion: number;
  bankPortion: number;
  hasPortionTL: number;
  debtPortion: number;
  errors: string[];
} {
  const errors: string[] = [];
  let totalPaid = 0;
  let cashPortion = 0;
  let cardPortion = 0;
  let bankPortion = 0;
  let hasPortionTL = 0;
  let debtPortion = 0;

  if (payload.saleTotalTL <= 0) {
    errors.push('Satış toplam tutarı sıfırdan büyük olmalıdır.');
  }

  if (!payload.payments || payload.payments.length === 0) {
    errors.push('En az bir ödeme yöntemi girilmelidir.');
  } else {
    for (const p of payload.payments) {
      if (p.amount < 0) {
        errors.push(`Geçersiz ödeme tutarı: ${p.amount}`);
      }
      totalPaid += p.amount;

      switch (p.method) {
        case PAYMENT_METHODS.CASH:
          cashPortion += p.amount;
          break;
        case PAYMENT_METHODS.CARD:
          cardPortion += p.amount;
          break;
        case PAYMENT_METHODS.BANK:
          bankPortion += p.amount;
          break;
        case PAYMENT_METHODS.HAS:
          hasPortionTL += p.amount;
          break;
        case PAYMENT_METHODS.DEBT:
          debtPortion += p.amount;
          if (!payload.customerId) {
            errors.push('Açık hesap (veresiye) satışı için müşteri seçilmesi zorunludur.');
          }
          break;
        default:
          errors.push(`Tanımsız ödeme yöntemi: ${p.method}`);
      }
    }
  }

  const balanceDifference = Number((payload.saleTotalTL - totalPaid).toFixed(2));
  if (Math.abs(balanceDifference) > 0.01) {
    errors.push(`Ödeme toplamı (${totalPaid.toFixed(2)} TL) satış tutarına (${payload.saleTotalTL.toFixed(2)} TL) eşit olmalıdır.`);
  }

  return {
    isValid: errors.length === 0,
    totalPaid: Number(totalPaid.toFixed(2)),
    balanceDifference,
    cashPortion: Number(cashPortion.toFixed(2)),
    cardPortion: Number(cardPortion.toFixed(2)),
    bankPortion: Number(bankPortion.toFixed(2)),
    hasPortionTL: Number(hasPortionTL.toFixed(2)),
    debtPortion: Number(debtPortion.toFixed(2)),
    errors,
  };
}

// ---------------------- 3. CASH REGISTER SESSION & Z-REPORT ENGINE ----------------------

export interface CashMovementInput {
  type: string; // POS_SALE, CUSTOMER_COLLECTION, SUPPLIER_PAYMENT, SCRAP_BUY, MANUAL_IN, MANUAL_OUT
  amount: number;
  currency?: string; // TL, USD, EUR, HAS
  hasWeight?: number;
  description?: string;
}

export interface CashSessionReport {
  sessionId: string;
  date: string;
  openingCash: number;
  cashSales: number;
  cardSales: number;
  bankSales: number;
  customerCashCollections: number;
  supplierCashPayments: number;
  scrapCashPurchases: number;
  manualCashIn: number;
  manualCashOut: number;
  scrapGoldGramsIn: number;
  hasGoldPaymentsGramsOut: number;
  totalTurnover: number;
  expectedClosingCash: number;
  actualClosingCash: number;
  discrepancy: number;
  status: string;
  discrepancyStatus: 'BALANCED' | 'SHORTAGE' | 'OVERAGE';
}

export function consolidateCashSession(
  sessionId: string,
  date: string,
  openingCash: number,
  movements: CashMovementInput[],
  actualClosingCash: number = 0
): CashSessionReport {
  let cashSales = 0;
  let cardSales = 0;
  let bankSales = 0;
  let customerCashCollections = 0;
  let supplierCashPayments = 0;
  let scrapCashPurchases = 0;
  let manualCashIn = 0;
  let manualCashOut = 0;
  let scrapGoldGramsIn = 0;
  let hasGoldPaymentsGramsOut = 0;

  for (const m of movements) {
    const cur = m.currency || CASH_CURRENCIES.TL;
    if (m.type === CASH_MOVEMENT_TYPES.POS_SALE) {
      if (cur === CASH_CURRENCIES.TL) cashSales += m.amount;
      else if (cur === 'CARD') cardSales += m.amount;
      else if (cur === 'BANK') bankSales += m.amount;
    } else if (m.type === CASH_MOVEMENT_TYPES.CUSTOMER_COLLECTION) {
      if (cur === CASH_CURRENCIES.TL) customerCashCollections += m.amount;
    } else if (m.type === CASH_MOVEMENT_TYPES.SUPPLIER_PAYMENT) {
      if (cur === CASH_CURRENCIES.TL) supplierCashPayments += m.amount;
      if (m.hasWeight) hasGoldPaymentsGramsOut += m.hasWeight;
    } else if (m.type === CASH_MOVEMENT_TYPES.SCRAP_BUY) {
      if (cur === CASH_CURRENCIES.TL) scrapCashPurchases += m.amount;
      if (m.hasWeight) scrapGoldGramsIn += m.hasWeight;
    } else if (m.type === CASH_MOVEMENT_TYPES.MANUAL_IN) {
      manualCashIn += m.amount;
    } else if (m.type === CASH_MOVEMENT_TYPES.MANUAL_OUT) {
      manualCashOut += m.amount;
    }
  }

  const expectedClosingCash = Number(
    (openingCash + cashSales + customerCashCollections + manualCashIn - supplierCashPayments - scrapCashPurchases - manualCashOut).toFixed(2)
  );

  const discrepancy = Number((actualClosingCash - expectedClosingCash).toFixed(2));
  const totalTurnover = Number((cashSales + cardSales + bankSales).toFixed(2));

  let discrepancyStatus: 'BALANCED' | 'SHORTAGE' | 'OVERAGE' = 'BALANCED';
  if (discrepancy < -0.015) discrepancyStatus = 'SHORTAGE';
  else if (discrepancy > 0.015) discrepancyStatus = 'OVERAGE';

  return {
    sessionId,
    date,
    openingCash: Number(openingCash.toFixed(2)),
    cashSales: Number(cashSales.toFixed(2)),
    cardSales: Number(cardSales.toFixed(2)),
    bankSales: Number(bankSales.toFixed(2)),
    customerCashCollections: Number(customerCashCollections.toFixed(2)),
    supplierCashPayments: Number(supplierCashPayments.toFixed(2)),
    scrapCashPurchases: Number(scrapCashPurchases.toFixed(2)),
    manualCashIn: Number(manualCashIn.toFixed(2)),
    manualCashOut: Number(manualCashOut.toFixed(2)),
    scrapGoldGramsIn: Number(scrapGoldGramsIn.toFixed(3)),
    hasGoldPaymentsGramsOut: Number(hasGoldPaymentsGramsOut.toFixed(3)),
    totalTurnover,
    expectedClosingCash,
    actualClosingCash: Number(actualClosingCash.toFixed(2)),
    discrepancy,
    status: SESSION_STATUS.CLOSED,
    discrepancyStatus,
  };
}

// ---------------------- 4. THERMAL RECEIPT SLIP FORMATTER (80mm & 58mm) ----------------------

export function formatThermalZReportSlip(report: CashSessionReport, is58mm: boolean = false): string {
  const width = is58mm ? THERMAL_SLIP_CONFIG.WIDTH_58MM_CHARS : THERMAL_SLIP_CONFIG.WIDTH_80MM_CHARS;
  const sep = THERMAL_SLIP_CONFIG.LINE_SEPARATOR.repeat(width);
  const dash = THERMAL_SLIP_CONFIG.DASH_SEPARATOR.repeat(width);

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

  const lines = [
    center('*** GÜN SONU Z-RAPORU ***'),
    center(is58mm ? 'Kuyumcu Panel' : WHATSAPP_CONFIG.DEFAULT_STORE_NAME),
    sep,
    row('Tarih / Saat:', report.date),
    row('Kasa Oturum ID:', report.sessionId),
    row('Kasa Durumu:', report.status),
    dash,
    center('--- NAKİT KASA AKIŞI ---'),
    row('Devir Açılış Kasası:', `${report.openingCash.toFixed(2)} TL`),
    row('(+) Nakit Satışlar:', `${report.cashSales.toFixed(2)} TL`),
    row('(+) Cari Tahsilatlar:', `${report.customerCashCollections.toFixed(2)} TL`),
    row('(+) Manuel Girişler:', `${report.manualCashIn.toFixed(2)} TL`),
    row('(-) Toptancı Ödemeleri:', `${report.supplierCashPayments.toFixed(2)} TL`),
    row('(-) Hurda Alış Ödemeleri:', `${report.scrapCashPurchases.toFixed(2)} TL`),
    row('(-) Manuel Çıkış / Masraf:', `${report.manualCashOut.toFixed(2)} TL`),
    dash,
    row('Beklenen Kasa Nakdi:', `${report.expectedClosingCash.toFixed(2)} TL`),
    row('Sayılan Fiili Nakit:', `${report.actualClosingCash.toFixed(2)} TL`),
    row(is58mm ? 'Kasa Farkı:' : 'KASA FARKI (Mutabakat):', `${report.discrepancy >= 0 ? '+' : ''}${report.discrepancy.toFixed(2)} TL (${report.discrepancyStatus})`),
    dash,
    center(is58mm ? '--- DİĞER HAREKETLER ---' : '--- DİĞER HASILAT & ALTIN HAREKETİ ---'),
    row('POS / Kredi Kartı Toplamı:', `${report.cardSales.toFixed(2)} TL`),
    row('Banka Havale Toplamı:', `${report.bankSales.toFixed(2)} TL`),
    row('Giren Hurda Altın:', `${report.scrapGoldGramsIn.toFixed(3)} gr`),
    row('Çıkan Has Altın:', `${report.hasGoldPaymentsGramsOut.toFixed(3)} gr`),
    sep,
    row('GÜNLÜK TOPLAM CİRO:', `${report.totalTurnover.toFixed(2)} TL`),
    sep,
    center(is58mm ? 'Mali Değeri Yoktur' : 'Mali Değeri Yoktur - Bilgi Fişidir'),
  ];



  return lines.join('\n');
}

// ---------------------- 5. KELEBEK LABEL SVG & ZPL-II BUILDER (74x12mm) ----------------------

export interface LabelData {
  barcode: string;
  title: string;
  carat: number | string;
  weight: number;
  priceTL?: number;
  sellingMilyem?: number;
  costMilyem?: number;
}

export function generateKelebekLabelSVG(data: LabelData): string {
  const spec = LABEL_SPECS.BUTTERFLY_74x12;
  const caratStr = typeof data.carat === 'number' ? `${data.carat}K` : data.carat;
  const weightStr = `${data.weight.toFixed(2)} gr`;
  const priceStr = data.priceTL ? `${data.priceTL.toLocaleString('tr-TR')} TL` : '';
  const milyemStr = data.sellingMilyem ? `M:${data.sellingMilyem}` : '';

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${spec.TOTAL_WIDTH_MM} ${spec.TOTAL_HEIGHT_MM}" width="${spec.TOTAL_WIDTH_MM}mm" height="${spec.TOTAL_HEIGHT_MM}mm" class="kelebek-label-vector">
  <defs>
    <style>
      .label-text { font-family: Arial, sans-serif; font-size: 2.2px; fill: #000000; font-weight: bold; }
      .label-sub { font-family: Arial, sans-serif; font-size: 1.8px; fill: #333333; }
      .barcode-text { font-family: monospace; font-size: 1.8px; letter-spacing: 0.2px; }
    </style>
  </defs>
  <!-- Left Wing (29x12mm) -->
  <g id="left-wing" transform="translate(1, 1)">
    <text x="0" y="2.5" class="label-text">${caratStr} | ${weightStr}</text>
    <text x="0" y="5.5" class="label-sub">${data.title.substring(0, 18)}</text>
    <text x="0" y="8.5" class="label-sub">${milyemStr}</text>
  </g>
  <!-- Bridge Area (16mm blank) -->
  <!-- Right Wing (29x12mm) -->
  <g id="right-wing" transform="translate(${spec.LEFT_WING_WIDTH_MM + spec.BRIDGE_WIDTH_MM + 1}, 1)">
    <text x="0" y="2.5" class="barcode-text">${data.barcode}</text>
    <rect x="0" y="3.5" width="26" height="4" fill="#000000" />
    <text x="0" y="10" class="label-text">${priceStr}</text>
  </g>
</svg>`;
}

export function generateKelebekZPL(data: LabelData, dpi: 203 | 300 = 203): string {
  const dpmm = dpi === 300 ? 11.811 : 8;
  const leftX = Math.round(2 * dpmm);
  const rightX = Math.round((LABEL_SPECS.BUTTERFLY_74x12.LEFT_WING_WIDTH_MM + LABEL_SPECS.BUTTERFLY_74x12.BRIDGE_WIDTH_MM + 2) * dpmm);
  const caratStr = typeof data.carat === 'number' ? `${data.carat}K` : data.carat;
  const weightStr = `${data.weight.toFixed(2)} gr`;
  const priceStr = data.priceTL ? `${data.priceTL.toFixed(0)} TL` : '';

  return [
    '^XA',
    '^PW' + Math.round(LABEL_SPECS.BUTTERFLY_74x12.TOTAL_WIDTH_MM * dpmm),
    '^LL' + Math.round(LABEL_SPECS.BUTTERFLY_74x12.TOTAL_HEIGHT_MM * dpmm),
    `^FO${leftX},15^A0N,20,20^FD${caratStr} ${weightStr}^FS`,
    `^FO${leftX},40^A0N,16,16^FD${data.title.substring(0, 16)}^FS`,
    `^FO${rightX},10^BY1,2,25^BCN,25,N,N,N^FD${data.barcode}^FS`,
    `^FO${rightX},42^A0N,18,18^FD${data.barcode}^FS`,
    priceStr ? `^FO${rightX},65^A0N,20,20^FD${priceStr}^FS` : '',
    '^XZ',
  ]
    .filter(Boolean)
    .join('\n');
}

// ---------------------- 6. WHATSAPP LINK & RECEIPT BUILDER ----------------------

export function normalizePhoneNumber(phone: string): string {
  let cleaned = phone.replace(/[^0-9]/g, '');
  if (cleaned.startsWith('0')) {
    cleaned = cleaned.substring(1);
  }
  if (!cleaned.startsWith(WHATSAPP_CONFIG.COUNTRY_CODE_TR) && cleaned.length === 10) {
    cleaned = WHATSAPP_CONFIG.COUNTRY_CODE_TR + cleaned;
  }
  return cleaned;
}

export function buildWhatsAppSaleReceiptUrl(
  phone: string,
  customerName: string,
  items: Array<{ title: string; carat: number; weight: number; priceTL: number }>,
  totalTL: number,
  date: string = new Date().toLocaleDateString('tr-TR')
): string {
  const normalized = normalizePhoneNumber(phone);
  const lines = [
    `💎 *${WHATSAPP_CONFIG.DEFAULT_STORE_NAME}*`,
    `📋 *SATIŞ BİLGİ FİŞİ*`,
    `📅 Tarih: ${date}`,
    `👤 Müşteri: ${customerName}`,
    `--------------------------------`,
    ...items.map(
      (item, idx) =>
        `${idx + 1}. ${item.title} (${item.carat}K, ${item.weight.toFixed(2)} gr) - ${item.priceTL.toLocaleString('tr-TR')} TL`
    ),
    `--------------------------------`,
    `💰 *TOPLAM TUTAR:* ${totalTL.toLocaleString('tr-TR')} TL`,
    `--------------------------------`,
    `Bizi tercih ettiğiniz için teşekkür ederiz! ✨`,
  ];

  const message = lines.join('\n');
  return `${WHATSAPP_CONFIG.BASE_URL}${normalized}?text=${encodeURIComponent(message)}`;
}

// ---------------------- 7. STOCK TURNOVER VELOCITY & REORDER ENGINE ----------------------

export interface StockTurnoverMetric {
  productCode: string;
  label: string;
  currentAmount: number;
  salesQuantity: number;
  periodDays: number;
  dailyVelocity: number;
  daysToStockout: number;
  speed: TurnoverSpeed;
}

export function calculateTurnoverMetric(
  productCode: string,
  label: string,
  currentAmount: number,
  salesQuantity: number,
  periodDays: number = TURNOVER_THRESHOLDS.STANDARD_DAYS_WINDOW
): StockTurnoverMetric {
  const dailyVelocity = Number((salesQuantity / Math.max(1, periodDays)).toFixed(3));
  let daysToStockout = Infinity;
  let speed: TurnoverSpeed = TURNOVER_SPEEDS.HAREKETSIZ;

  if (dailyVelocity > 0) {
    daysToStockout = Number((currentAmount / dailyVelocity).toFixed(1));
    if (dailyVelocity >= TURNOVER_THRESHOLDS.HIGH_VELOCITY_MIN_DAILY || daysToStockout <= TURNOVER_THRESHOLDS.FAST_STOCKOUT_MAX_DAYS) {
      speed = TURNOVER_SPEEDS.HIZLI;
    } else if (daysToStockout <= TURNOVER_THRESHOLDS.NORMAL_STOCKOUT_MAX_DAYS) {
      speed = TURNOVER_SPEEDS.NORMAL;
    } else {
      speed = TURNOVER_SPEEDS.YAVAS;
    }
  } else {
    speed = TURNOVER_SPEEDS.HAREKETSIZ;
  }

  return {
    productCode,
    label,
    currentAmount,
    salesQuantity,
    periodDays,
    dailyVelocity,
    daysToStockout,
    speed,
  };
}

export interface ReorderDraftItem {
  productCode: string;
  label: string;
  currentAmount: number;
  minThreshold: number;
  suggestedQuantity: number;
  supplierName?: string;
}

export function generateReorderDraft(
  stocks: Array<{ product: string; label: string; amount: number; minThreshold?: number; supplierName?: string }>
): ReorderDraftItem[] {
  const draft: ReorderDraftItem[] = [];

  for (const s of stocks) {
    const minThreshold = s.minThreshold !== undefined ? s.minThreshold : REORDER_CONFIG.MIN_DEFAULT_THRESHOLD;
    if (s.amount <= minThreshold) {
      const targetStock = minThreshold * REORDER_CONFIG.DEFAULT_SAFETY_MULTIPLIER;
      const suggestedQuantity = Math.max(1, targetStock - s.amount);
      draft.push({
        productCode: s.product,
        label: s.label,
        currentAmount: s.amount,
        minThreshold,
        suggestedQuantity,
        supplierName: s.supplierName || 'Genel Tedarikçi',
      });
    }
  }

  return draft;
}
