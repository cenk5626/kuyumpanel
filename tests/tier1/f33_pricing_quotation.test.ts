import { describe, it, test, expect, setTestContext } from '../helpers/test-utils';
import {
  QUOTE_STATUS,
  QUOTE_STATUS_LABELS,
  DISCOUNT_LIMITS_BY_ROLE,
  QUOTE_VALIDITY_DURATIONS,
  QUOTE_DEFAULTS,
} from '@/constants/pricing';
import {
  generateQuoteNumber,
  calculateQuoteTotals,
  checkDiscountAuthorization,
  isQuoteExpiredOrInvalidated,
  formatQuoteWhatsAppNotification,
  getMilyemByCarat,
} from '@/lib/pricing/quote-engine';

export function registerF33PricingQuotationTests() {
  setTestContext(
    'Tier 1',
    33,
    'Advanced Pricing, Discount Limits & Quotation',
    'F33: Gelişmiş Fiyatlandırma, Özel İskonto Limitleri & Teklif Yönetimi'
  );

  describe('Feature 33 - Fiyatlandırma, Teklif ve İskonto Yönetimi', () => {
    test('33.1 Should generate sequential quote numbers (e.g. TKL-2026-0001)', () => {
      const currentYear = new Date().getFullYear();
      const q1 = generateQuoteNumber('dealer-1', 0);
      const q2 = generateQuoteNumber('dealer-1', 19);

      expect(q1).toBe(`${QUOTE_DEFAULTS.PREFIX}-${currentYear}-0001`);
      expect(q2).toBe(`${QUOTE_DEFAULTS.PREFIX}-${currentYear}-0020`);
    });

    test('33.2 Should calculate quote lines with carat milyem, hasEquivalent and subtotal accurately', () => {
      const lines = [
        { title: '22 Ayar Bilezik', carat: 22, weight: 10.0, unitPrice: 3200, laborCost: 500 },
        { title: '14 Ayar Kolye', carat: 14, weight: 5.0, unitPrice: 2000, laborCost: 250 },
      ];

      const res = calculateQuoteTotals(lines);

      expect(res.lines.length).toBe(2);
      expect(res.lines[0].milyem).toBe(916);
      expect(res.lines[0].totalPrice).toBe(32500); // 10 * 3200 + 500
      expect(res.lines[0].hasEquivalent).toBe(9.16); // 10 * 0.916

      expect(res.lines[1].milyem).toBe(585);
      expect(res.lines[1].totalPrice).toBe(10250); // 5 * 2000 + 250
      expect(res.lines[1].hasEquivalent).toBe(2.925); // 5 * 0.585

      expect(res.subtotalTl).toBe(42750);
      expect(res.totalHas).toBe(12.085);
      expect(res.totalTl).toBe(42750);
    });

    test('33.3 Should apply percentage discount and subtract from subtotal correctly', () => {
      const lines = [
        { title: '24 Ayar Külçe', carat: 24, weight: 10.0, unitPrice: 3000 },
      ];

      // %5 İskonto
      const res = calculateQuoteTotals(lines, 5);

      expect(res.subtotalTl).toBe(30000);
      expect(res.discountAmountTl).toBe(1500); // 30000 * 0.05
      expect(res.totalTl).toBe(28500);
      expect(res.appliedDiscountPercent).toBe(5);
    });

    test('33.4 Should authorize discount within role limit and reject exceeding limits', () => {
      // Standart kullanıcı: Tavan %3
      const userAllowed = checkDiscountAuthorization('USER', 2.5);
      expect(userAllowed.authorized).toBe(true);
      expect(userAllowed.requiresApproval).toBe(false);

      const userExceeded = checkDiscountAuthorization('USER', 5.0);
      expect(userExceeded.authorized).toBe(false);
      expect(userExceeded.requiresApproval).toBe(true);
      expect(userExceeded.maxAllowedPercent).toBe(3);

      // Yönetici (ADMIN): Tavan %10
      const adminAllowed = checkDiscountAuthorization('ADMIN', 7.5);
      expect(adminAllowed.authorized).toBe(true);
      expect(adminAllowed.requiresApproval).toBe(false);

      // Patron (SUPER_ADMIN): Tavan %100
      const superAdmin = checkDiscountAuthorization('SUPER_ADMIN', 25.0);
      expect(superAdmin.authorized).toBe(true);
      expect(superAdmin.requiresApproval).toBe(false);
    });

    test('33.5 Should detect expired quote when validUntil is in the past', () => {
      const pastDate = new Date(Date.now() - 1000 * 60 * 30); // 30 dk önce
      const expiredQuote = {
        validUntil: pastDate.toISOString(),
        baseGoldPrice: 3100,
        status: QUOTE_STATUS.APPROVED,
      };

      const evalResult = isQuoteExpiredOrInvalidated(expiredQuote, 3105);
      expect(evalResult.isInvalid).toBe(true);
      expect(evalResult.reason).toBe('EXPIRED');
    });

    test('33.6 Should invalidate quote when live gold price exceeds base price by more than tolerance percent (Gold Surge Invalidation)', () => {
      const futureDate = new Date(Date.now() + 1000 * 60 * 60); // 1 saat sonra
      const activeQuote = {
        validUntil: futureDate.toISOString(),
        baseGoldPrice: 3000,
        maxGoldTolerancePercent: 1.5, // Max %1.5 artış kabul edilir (3045 TL)
        status: QUOTE_STATUS.APPROVED,
      };

      // Canlı kur 3060 TL'ye fırladı (%2 artış)
      const surgeResult = isQuoteExpiredOrInvalidated(activeQuote, 3060);
      expect(surgeResult.isInvalid).toBe(true);
      expect(surgeResult.reason).toBe('PRICE_SURGE');
      expect(surgeResult.message).toContain('tolerans tavanını');
    });

    test('33.7 Should keep quote valid when live gold price is within tolerance percent', () => {
      const futureDate = new Date(Date.now() + 1000 * 60 * 60);
      const activeQuote = {
        validUntil: futureDate.toISOString(),
        baseGoldPrice: 3000,
        maxGoldTolerancePercent: 1.5,
        status: QUOTE_STATUS.APPROVED,
      };

      // Canlı kur 3020 TL (yalnızca %0.66 artış, tolerans altı)
      const validResult = isQuoteExpiredOrInvalidated(activeQuote, 3020);
      expect(validResult.isInvalid).toBe(false);
    });

    test('33.8 Should generate well-formatted WhatsApp notification URLs with encoded quote summary', () => {
      const quoteInfo = {
        quoteNumber: 'TKL-2026-0008',
        customerName: 'Kemal Bey',
        customerPhone: '05421234567',
        totalTl: 85000,
        totalHas: 27.5,
        validUntil: new Date(Date.now() + 3600000).toISOString(),
        storeName: 'Kuyumcu Ali',
        linesCount: 3,
      };

      const waUrl = formatQuoteWhatsAppNotification(quoteInfo);
      expect(waUrl.startsWith('https://wa.me/905421234567?text=')).toBe(true);
      expect(decodeURIComponent(waUrl)).toContain('TKL-2026-0008');
      expect(decodeURIComponent(waUrl)).toContain('85.000');
      expect(decodeURIComponent(waUrl)).toContain('27.5 gr Has');
    });

    test('33.9 Should accurately map milyem values by carat', () => {
      expect(getMilyemByCarat(24)).toBe(995);
      expect(getMilyemByCarat(22)).toBe(916);
      expect(getMilyemByCarat(18)).toBe(750);
      expect(getMilyemByCarat(14)).toBe(585);
      expect(getMilyemByCarat(8)).toBe(333);
    });

    test('33.10 Centralized pricing and quote constants integrity verification', () => {
      expect(QUOTE_STATUS.DRAFT).toBe('DRAFT');
      expect(QUOTE_STATUS.PENDING_APPROVAL).toBe('PENDING_APPROVAL');
      expect(QUOTE_STATUS.APPROVED).toBe('APPROVED');
      expect(QUOTE_STATUS.CONVERTED).toBe('CONVERTED');
      expect(QUOTE_STATUS.EXPIRED).toBe('EXPIRED');
      expect(QUOTE_STATUS.REJECTED).toBe('REJECTED');

      expect(DISCOUNT_LIMITS_BY_ROLE['USER']).toBe(3);
      expect(DISCOUNT_LIMITS_BY_ROLE['ADMIN']).toBe(10);
      expect(DISCOUNT_LIMITS_BY_ROLE['SUPER_ADMIN']).toBe(100);
      expect(QUOTE_DEFAULTS.PREFIX).toBe('TKL');
    });
  });
}
