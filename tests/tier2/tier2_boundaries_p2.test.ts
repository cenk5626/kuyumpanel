import { describe, it, test, expect, setTestContext } from '../helpers/test-utils';
import {
  validateAndProcessPosSale,
  consolidateCashSession,
  formatThermalZReportSlip,
  generateKelebekLabelSVG,
  PosTransactionPayload,
  CashMovementInput,
  LabelData,
} from '../helpers/domain-engines';
import { PAYMENT_METHODS, CASH_MOVEMENT_TYPES, SESSION_STATUS } from '../../src/constants/kasa';

export function registerTier2Part2Tests() {
  // Feature 6 Boundary Cases
  setTestContext('Tier 2', 6, 'Multi-Payment POS Transaction', 'F06 Edge Cases: Payment Splits & Zero Values');
  describe('Tier 2 - Feature 6 Edge Cases (POS Multi-Payment)', () => {
    test('T2-F6.1 Should reject negative payment amounts within payment split array', () => {
      const payload: PosTransactionPayload = {
        saleTotalTL: 10000,
        payments: [
          { method: PAYMENT_METHODS.CASH, amount: 15000 },
          { method: PAYMENT_METHODS.CARD, amount: -5000 },
        ],
        items: [{ barcode: '14KP1', title: 'Test', quantity: 1, unitPriceTL: 10000 }],
      };
      const res = validateAndProcessPosSale(payload);
      expect(res.isValid).toBe(false);
      expect(res.errors.some(e => e.includes('Geçersiz'))).toBe(true);
    });

    test('T2-F6.2 Should reject empty payment method array', () => {
      const payload: PosTransactionPayload = {
        saleTotalTL: 5000,
        payments: [],
        items: [{ barcode: '14KP2', title: 'Test', quantity: 1, unitPriceTL: 5000 }],
      };
      const res = validateAndProcessPosSale(payload);
      expect(res.isValid).toBe(false);
    });

    test('T2-F6.3 Should reject zero or negative total sale amount', () => {
      const payload: PosTransactionPayload = {
        saleTotalTL: 0,
        payments: [{ method: PAYMENT_METHODS.CASH, amount: 0 }],
        items: [],
      };
      const res = validateAndProcessPosSale(payload);
      expect(res.isValid).toBe(false);
    });

    test('T2-F6.4 Should handle decimal cent split with floating point precision without false rejects', () => {
      // 33.33 + 33.33 + 33.34 = 100.00 TL
      const payload: PosTransactionPayload = {
        saleTotalTL: 100.00,
        payments: [
          { method: PAYMENT_METHODS.CASH, amount: 33.33 },
          { method: PAYMENT_METHODS.CARD, amount: 33.33 },
          { method: PAYMENT_METHODS.BANK, amount: 33.34 },
        ],
        items: [{ barcode: 'ITEM_CENT', title: 'Cent Item', quantity: 1, unitPriceTL: 100 }],
      };
      const res = validateAndProcessPosSale(payload);
      expect(res.isValid).toBe(true);
      expect(res.balanceDifference).toBe(0);
    });

    test('T2-F6.5 Should reject unknown payment method string', () => {
      const payload: PosTransactionPayload = {
        saleTotalTL: 5000,
        payments: [{ method: 'CRYPTO_BITCOIN', amount: 5000 }],
        items: [{ barcode: 'ITEM_CRYPTO', title: 'Test', quantity: 1, unitPriceTL: 5000 }],
      };
      const res = validateAndProcessPosSale(payload);
      expect(res.isValid).toBe(false);
      expect(res.errors.some(e => e.includes('Tanımsız'))).toBe(true);
    });
  });

  // Feature 7 Boundary Cases
  setTestContext('Tier 2', 7, 'Cash Register Session & Daily Consolidation', 'F07 Edge Cases: Session Inflow & Outflow Extremes');
  describe('Tier 2 - Feature 7 Edge Cases (Session Consolidation)', () => {
    test('T2-F7.1 Should handle zero opening drawer cash without error', () => {
      const report = consolidateCashSession('sess-zero-open', '2026-08-17', 0, [
        { type: CASH_MOVEMENT_TYPES.POS_SALE, amount: 1000 },
      ], 1000);
      expect(report.openingCash).toBe(0);
      expect(report.expectedClosingCash).toBe(1000);
      expect(report.discrepancy).toBe(0);
    });

    test('T2-F7.2 Should correctly compute when all sales are 100% cashless (Card + Bank only)', () => {
      const report = consolidateCashSession('sess-cashless', '2026-08-17', 5000, [
        { type: CASH_MOVEMENT_TYPES.POS_SALE, amount: 50000, currency: 'CARD' },
        { type: CASH_MOVEMENT_TYPES.POS_SALE, amount: 25000, currency: 'BANK' },
      ], 5000);
      expect(report.cashSales).toBe(0);
      expect(report.cardSales).toBe(50000);
      expect(report.bankSales).toBe(25000);
      expect(report.totalTurnover).toBe(75000);
      expect(report.expectedClosingCash).toBe(5000); // Only opening cash remains
    });

    test('T2-F7.3 Should allow cash outflows exceeding cash inflows (resulting in negative expected cash if allowed)', () => {
      const report = consolidateCashSession('sess-outflow-heavy', '2026-08-17', 1000, [
        { type: CASH_MOVEMENT_TYPES.SUPPLIER_PAYMENT, amount: 5000 },
      ], -4000);
      expect(report.expectedClosingCash).toBe(-4000);
      expect(report.discrepancy).toBe(0);
    });

    test('T2-F7.4 Should handle multiple fractional gram scrap purchases', () => {
      const movements: CashMovementInput[] = [
        { type: CASH_MOVEMENT_TYPES.SCRAP_BUY, amount: 3000, hasWeight: 0.916 },
        { type: CASH_MOVEMENT_TYPES.SCRAP_BUY, amount: 1800, hasWeight: 0.585 },
      ];
      const report = consolidateCashSession('sess-scrap-multi', '2026-08-17', 10000, movements, 5200);
      expect(report.scrapGoldGramsIn).toBeCloseTo(1.501, 3);
      expect(report.scrapCashPurchases).toBe(4800);
    });

    test('T2-F7.5 Should handle high volume transactions (500 micro-movements) with zero rounding loss', () => {
      const movements: CashMovementInput[] = [];
      for (let i = 0; i < 500; i++) {
        movements.push({ type: CASH_MOVEMENT_TYPES.POS_SALE, amount: 10.50, currency: 'TL' });
      }
      // 500 * 10.50 = 5250 TL
      const report = consolidateCashSession('sess-high-vol', '2026-08-17', 0, movements, 5250);
      expect(report.cashSales).toBe(5250);
      expect(report.expectedClosingCash).toBe(5250);
    });
  });

  // Feature 8 Boundary Cases
  setTestContext('Tier 2', 8, 'Opening/Closing Reconciliation & Z-Report', 'F08 Edge Cases: Discrepancy Boundaries');
  describe('Tier 2 - Feature 8 Edge Cases (Reconciliation & Variance)', () => {
    test('T2-F8.1 Should handle zero actual count when expected is zero', () => {
      const report = consolidateCashSession('sess-0', '2026-08-17', 0, [], 0);
      expect(report.discrepancy).toBe(0);
      expect(report.discrepancyStatus).toBe('BALANCED');
    });

    test('T2-F8.2 Should handle large cash discrepancy (e.g. 50,000 TL shortage)', () => {
      const report = consolidateCashSession('sess-big-short', '2026-08-17', 100000, [], 50000);
      expect(report.discrepancy).toBe(-50000);
      expect(report.discrepancyStatus).toBe('SHORTAGE');
    });

    test('T2-F8.3 Should handle small 1 kuruş (0.01 TL) variance within acceptable rounding tolerance', () => {
      const report = consolidateCashSession('sess-cent-diff', '2026-08-17', 1000, [], 1000.01);
      expect(report.discrepancy).toBe(0.01);
      expect(report.discrepancyStatus).toBe('BALANCED'); // <= 0.01 is balanced
    });

    test('T2-F8.4 Should handle negative actual cash count input by flagging severe shortage', () => {
      const report = consolidateCashSession('sess-neg-count', '2026-08-17', 5000, [], -500);
      expect(report.discrepancy).toBe(-5500);
      expect(report.discrepancyStatus).toBe('SHORTAGE');
    });

    test('T2-F8.5 Should ensure session status always marks CLOSED after consolidation', () => {
      const report = consolidateCashSession('sess-closed', '2026-08-17', 1000, [], 1000);
      expect(report.status).toBe(SESSION_STATUS.CLOSED);
    });
  });

  // Feature 9 Boundary Cases
  setTestContext('Tier 2', 9, 'Thermal Z-Report Slip Print', 'F09 Edge Cases: UTF-8 & Thermal Extremes');
  describe('Tier 2 - Feature 9 Edge Cases (Thermal Receipt Layout)', () => {
    test('T2-F9.1 Should render Turkish characters (ç, ğ, ı, ö, ş, ü, İ, Ğ) properly in slip output', () => {
      const rep = consolidateCashSession('sess-tr', '2026-08-17', 1000, [
        { type: CASH_MOVEMENT_TYPES.POS_SALE, amount: 2000 },
      ], 3000);
      const slip = formatThermalZReportSlip(rep, false);
      expect(slip).toContain('GÜN SONU');
      expect(slip).toContain('Nakit Satışlar:');
      expect(slip).toContain('Mali Değeri Yoktur');
    });

    test('T2-F9.2 Should handle zero turnover day slip formatting without errors', () => {
      const rep = consolidateCashSession('sess-empty-day', '2026-08-17', 5000, [], 5000);
      const slip = formatThermalZReportSlip(rep, false);
      expect(slip).toContain('0.00 TL');
      expect(slip).toContain('GÜNLÜK TOPLAM CİRO:');
    });

    test('T2-F9.3 Should format both 80mm and 58mm without throwing errors', () => {
      const rep = consolidateCashSession('sess-fmt', '2026-08-17', 10000, [], 10000);
      const slip80 = formatThermalZReportSlip(rep, false);
      const slip58 = formatThermalZReportSlip(rep, true);
      expect(slip80.length).toBeGreaterThan(100);
      expect(slip58.length).toBeGreaterThan(100);
    });

    test('T2-F9.4 Should format multi-million TL amounts without line overflow', () => {
      const rep = consolidateCashSession('sess-mil', '2026-08-17', 2500000, [], 2500000);
      const slip = formatThermalZReportSlip(rep, false);
      expect(slip).toContain('2500000.00 TL');
    });

    test('T2-F9.5 Should display explicit negative sign for shortage in thermal slip', () => {
      const rep = consolidateCashSession('sess-neg-slip', '2026-08-17', 10000, [], 9000);
      const slip = formatThermalZReportSlip(rep, false);
      expect(slip).toContain('-1000.00 TL (SHORTAGE)');
    });
  });

  // Feature 10 Boundary Cases
  setTestContext('Tier 2', 10, 'Dual-Wing Kelebek Label Layout', 'F10 Edge Cases: SVG Extremes & Special Strings');
  describe('Tier 2 - Feature 10 Edge Cases (Kelebek Label SVG)', () => {
    test('T2-F10.1 Should handle label without priceTL by omitting price text safely', () => {
      const item: LabelData = { barcode: 'NOPRICE01', title: 'Ham Bilezik', carat: 22, weight: 18.5 };
      const svg = generateKelebekLabelSVG(item);
      expect(svg).toContain('NOPRICE01');
      expect(svg).not.toContain('undefined');
    });

    test('T2-F10.2 Should truncate long product titles to prevent wing overflow', () => {
      const item: LabelData = {
        barcode: 'LONG01',
        title: 'Özel Tasarım Pırlantalı ve Yakutlu Trabzon Hasırı Kolye',
        carat: 14,
        weight: 12.0,
      };
      const svg = generateKelebekLabelSVG(item);
      expect(svg).toContain('Özel Tasarım Pırla'); // Truncated to 18 chars
    });

    test('T2-F10.3 Should handle 24K pure gold label notation', () => {
      const item: LabelData = { barcode: '24KHAS01', title: 'Külçe Altın', carat: 24, weight: 1.0 };
      const svg = generateKelebekLabelSVG(item);
      expect(svg).toContain('24K | 1.00 gr');
    });

    test('T2-F10.4 Should handle string carat (e.g. "916M" or "22 Ayar") gracefully', () => {
      const item: LabelData = { barcode: 'STRCARAT', title: 'Bilezik', carat: '22 Ayar', weight: 10.0 };
      const svg = generateKelebekLabelSVG(item);
      expect(svg).toContain('22 Ayar | 10.00 gr');
    });

    test('T2-F10.5 Should generate valid XML/SVG syntax containing closing tags', () => {
      const item: LabelData = { barcode: 'XMLTEST', title: 'Yüzük', carat: 14, weight: 2.1 };
      const svg = generateKelebekLabelSVG(item);
      expect(svg.startsWith('<svg')).toBe(true);
      expect(svg.endsWith('</svg>')).toBe(true);
    });
  });
}
