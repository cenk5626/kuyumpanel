import {
  QUOTE_DEFAULTS,
  QUOTE_STATUS,
  DISCOUNT_LIMITS_BY_ROLE,
  QuoteStatus,
} from '@/constants/pricing';
import { roundMoney, roundGrams } from '@/lib/security/validation';

export interface QuoteLineInput {
  barcode?: string | null;
  title: string;
  carat: number;
  weight: number;
  laborCost?: number;
  unitPrice: number;
}

export interface CalculatedQuoteLine {
  barcode?: string | null;
  title: string;
  carat: number;
  milyem: number;
  weight: number;
  laborCost: number;
  unitPrice: number;
  totalPrice: number;
  hasEquivalent: number;
}

export function getMilyemByCarat(carat: number): number {
  switch (carat) {
    case 24:
      return 995;
    case 22:
      return 916;
    case 18:
      return 750;
    case 14:
      return 585;
    case 8:
      return 333;
    default:
      return Math.round((carat / 24) * 1000);
  }
}

/**
 * Sıradaki teklif takip numarasını üretir (Örn: TKL-2026-0001).
 */
export function generateQuoteNumber(dealerId: string, currentCount: number): string {
  const currentYear = new Date().getFullYear();
  const sequenceNumber = (currentCount + 1).toString().padStart(4, '0');
  return `${QUOTE_DEFAULTS.PREFIX}-${currentYear}-${sequenceNumber}`;
}

/**
 * Teklif kalemlerini, has karşılıklarını, ara toplamı, iskonto ve nihai tutarı hesaplar.
 */
export function calculateQuoteTotals(
  lines: QuoteLineInput[],
  discountPercent: number = 0,
  discountTl: number = 0
): {
  lines: CalculatedQuoteLine[];
  subtotalTl: number;
  discountAmountTl: number;
  appliedDiscountPercent: number;
  totalTl: number;
  totalHas: number;
} {
  let subtotalTl = 0;
  let totalHas = 0;

  const calculatedLines: CalculatedQuoteLine[] = lines.map((line) => {
    const milyem = getMilyemByCarat(line.carat);
    const hasEq = roundGrams(line.weight * (milyem / 1000));
    const labor = line.laborCost || 0;
    const lineTotal = roundMoney(line.weight * line.unitPrice + labor);

    subtotalTl = roundMoney(subtotalTl + lineTotal);
    totalHas = roundGrams(totalHas + hasEq);

    return {
      barcode: line.barcode || null,
      title: line.title,
      carat: line.carat,
      milyem,
      weight: line.weight,
      laborCost: labor,
      unitPrice: line.unitPrice,
      totalPrice: lineTotal,
      hasEquivalent: hasEq,
    };
  });

  let discountAmount = 0;
  let appliedPercent = 0;

  if (discountPercent > 0) {
    appliedPercent = discountPercent;
    discountAmount = roundMoney(subtotalTl * (discountPercent / 100));
  } else if (discountTl > 0) {
    discountAmount = Math.min(subtotalTl, roundMoney(discountTl));
    appliedPercent = subtotalTl > 0 ? Math.round((discountAmount / subtotalTl) * 1000) / 10 : 0;
  }

  const totalTl = Math.max(0, roundMoney(subtotalTl - discountAmount));

  return {
    lines: calculatedLines,
    subtotalTl,
    discountAmountTl: discountAmount,
    appliedDiscountPercent: appliedPercent,
    totalTl,
    totalHas,
  };
}

/**
 * Kullanıcı rolünün istenen iskontoyu vermeye yetkili olup olmadığını denetler.
 */
export function checkDiscountAuthorization(
  role: string,
  requestedDiscountPercent: number
): {
  authorized: boolean;
  maxAllowedPercent: number;
  requiresApproval: boolean;
  reason?: string;
} {
  const maxAllowed = DISCOUNT_LIMITS_BY_ROLE[role] ?? 0;

  if (requestedDiscountPercent <= maxAllowed) {
    return {
      authorized: true,
      maxAllowedPercent: maxAllowed,
      requiresApproval: false,
    };
  }

  return {
    authorized: false,
    maxAllowedPercent: maxAllowed,
    requiresApproval: true,
    reason: `İstenen iskonto oranı (%${requestedDiscountPercent}), rolünüz için tanımlı tavanı (%${maxAllowed}) aşıyor. Yönetici onayı gereklidir.`,
  };
}

/**
 * Teklifin süresinin dolup dolmadığını veya canlı altın kurundaki artışın toleransı aşıp aşmadığını denetler.
 */
export function isQuoteExpiredOrInvalidated(
  quote: {
    validUntil: Date | string;
    baseGoldPrice: number;
    maxGoldTolerancePercent?: number;
    status: string;
  },
  currentLiveGoldPrice?: number
): {
  isInvalid: boolean;
  reason?: 'EXPIRED' | 'PRICE_SURGE';
  message?: string;
} {
  // 1. Süre kontrolü
  const expiryTime = new Date(quote.validUntil).getTime();
  if (Date.now() > expiryTime) {
    return {
      isInvalid: true,
      reason: 'EXPIRED',
      message: 'Teklifin geçerlilik süresi dolmuştur.',
    };
  }

  // 2. Canlı kur tolerans kontrolü
  if (currentLiveGoldPrice && currentLiveGoldPrice > 0 && quote.baseGoldPrice > 0) {
    const tolerance = quote.maxGoldTolerancePercent ?? QUOTE_DEFAULTS.DEFAULT_TOLERANCE_PERCENT;
    const maxAllowedGoldPrice = quote.baseGoldPrice * (1 + tolerance / 100);

    if (currentLiveGoldPrice > maxAllowedGoldPrice) {
      const surgePercent = Math.round(((currentLiveGoldPrice - quote.baseGoldPrice) / quote.baseGoldPrice) * 1000) / 10;
      return {
        isInvalid: true,
        reason: 'PRICE_SURGE',
        message: `Canlı altın kuru (₺${currentLiveGoldPrice.toLocaleString('tr-TR')}), teklif taban kurunun (₺${quote.baseGoldPrice.toLocaleString('tr-TR')}) tolerans tavanını (%${tolerance}) aşarak %${surgePercent} artmıştır. Teklif revize edilmelidir.`,
      };
    }
  }

  return { isInvalid: false };
}

/**
 * Teklif için WhatsApp formatlı bilgilendirme mesajı üretir.
 */
export function formatQuoteWhatsAppNotification(quote: {
  quoteNumber: string;
  customerName: string;
  customerPhone?: string | null;
  totalTl: number;
  totalHas: number;
  validUntil: Date | string;
  storeName: string;
  linesCount: number;
}): string {
  const phone = (quote.customerPhone || '').replace(/\D/g, '');
  const targetPhone = phone.startsWith('90')
    ? phone
    : phone.startsWith('0')
    ? `9${phone}`
    : `90${phone}`;

  const validUntilStr = new Date(quote.validUntil).toLocaleTimeString('tr-TR', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
  });

  const message = `Sayın *${quote.customerName}*,\n\n*${quote.storeName}* tarafından hazırlanan *${quote.quoteNumber}* numaralı fiyat teklifiniz:\n\n• Toplam Kalem: *${quote.linesCount} adet*\n• Has Karşılığı: *${quote.totalHas} gr Has*\n• Teklif Tutarı: *₺${quote.totalTl.toLocaleString('tr-TR')}*\n\n⏱ *Geçerlilik:* Canlı altın kuru dalgalanmaları nedeniyle teklifimiz *${validUntilStr}* tarihine kadar geçerlidir.\n\nBilgilerinize sunar, iyi günler dileriz.`;

  return `https://wa.me/${targetPhone}?text=${encodeURIComponent(message)}`;
}
