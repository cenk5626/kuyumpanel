import { describe, it, test, expect, setTestContext } from '../helpers/test-utils';
import { consolidateCashSession, CashMovementInput } from '../helpers/domain-engines';
import { CASH_MOVEMENT_TYPES, CASH_CURRENCIES } from '../../src/constants/kasa';

export function registerF07Tests() {
  setTestContext('Tier 1', 7, 'Cash Register Session & Daily Consolidation', 'F07: Cash Session Consolidation');

  describe('Feature 7 - Cash Register Daily Consolidation Engine', () => {
    test('7.1 Should calculate expected drawer cash correctly with opening cash and retail sales', () => {
      const opening = 10000;
      const movements: CashMovementInput[] = [
        { type: CASH_MOVEMENT_TYPES.POS_SALE, amount: 25000, currency: CASH_CURRENCIES.TL },
        { type: CASH_MOVEMENT_TYPES.POS_SALE, amount: 15000, currency: CASH_CURRENCIES.TL },
      ];

      const report = consolidateCashSession('sess-1', '2026-08-17', opening, movements, 50000);
      expect(report.openingCash).toBe(10000);
      expect(report.cashSales).toBe(40000);
      expect(report.expectedClosingCash).toBe(50000);
      expect(report.totalTurnover).toBe(40000);
    });

    test('7.2 Should add customer cash collections to expected drawer cash', () => {
      const opening = 5000;
      const movements: CashMovementInput[] = [
        { type: CASH_MOVEMENT_TYPES.CUSTOMER_COLLECTION, amount: 12000, currency: CASH_CURRENCIES.TL },
      ];

      const report = consolidateCashSession('sess-2', '2026-08-17', opening, movements, 17000);
      expect(report.customerCashCollections).toBe(12000);
      expect(report.expectedClosingCash).toBe(17000);
    });

    test('7.3 Should deduct supplier payments and scrap gold purchases from expected drawer cash', () => {
      const opening = 50000;
      const movements: CashMovementInput[] = [
        { type: CASH_MOVEMENT_TYPES.SUPPLIER_PAYMENT, amount: 20000, currency: CASH_CURRENCIES.TL },
        { type: CASH_MOVEMENT_TYPES.SCRAP_BUY, amount: 15000, currency: CASH_CURRENCIES.TL, hasWeight: 5.0 },
      ];

      const report = consolidateCashSession('sess-3', '2026-08-17', opening, movements, 15000);
      expect(report.supplierCashPayments).toBe(20000);
      expect(report.scrapCashPurchases).toBe(15000);
      expect(report.scrapGoldGramsIn).toBe(5.0);
      expect(report.expectedClosingCash).toBe(15000);
    });

    test('7.4 Should segregate card and bank totals without inflating drawer cash', () => {
      const opening = 10000;
      const movements: CashMovementInput[] = [
        { type: CASH_MOVEMENT_TYPES.POS_SALE, amount: 10000, currency: CASH_CURRENCIES.TL },
        { type: CASH_MOVEMENT_TYPES.POS_SALE, amount: 30000, currency: 'CARD' },
        { type: CASH_MOVEMENT_TYPES.POS_SALE, amount: 20000, currency: 'BANK' },
      ];

      const report = consolidateCashSession('sess-4', '2026-08-17', opening, movements, 20000);
      expect(report.cashSales).toBe(10000);
      expect(report.cardSales).toBe(30000);
      expect(report.bankSales).toBe(20000);
      expect(report.expectedClosingCash).toBe(20000); // Only opening (10k) + cash sales (10k)
      expect(report.totalTurnover).toBe(60000); // 10k + 30k + 20k
    });

    test('7.5 Should handle manual in/out movements (store expenses and capital top-ups)', () => {
      const opening = 10000;
      const movements: CashMovementInput[] = [
        { type: CASH_MOVEMENT_TYPES.MANUAL_IN, amount: 5000, description: 'Sermaye İlavesi' },
        { type: CASH_MOVEMENT_TYPES.MANUAL_OUT, amount: 1500, description: 'Öğle Yemeği & Kargo' },
      ];

      const report = consolidateCashSession('sess-5', '2026-08-17', opening, movements, 13500);
      expect(report.manualCashIn).toBe(5000);
      expect(report.manualCashOut).toBe(1500);
      expect(report.expectedClosingCash).toBe(13500);
    });
  });
}
