import { describe, it, test, expect, setTestContext } from '../helpers/test-utils';
import { consolidateCashSession, CashMovementInput } from '../helpers/domain-engines';
import { CASH_MOVEMENT_TYPES, SESSION_STATUS } from '../../src/constants/kasa';

export function registerF08Tests() {
  setTestContext('Tier 1', 8, 'Opening/Closing Reconciliation & Z-Report', 'F08: Physical Count Reconciliation');

  describe('Feature 8 - Drawer Count Reconciliation & Variance Classification', () => {
    test('8.1 Should detect balanced cash count with exactly zero discrepancy', () => {
      const opening = 20000;
      const movements: CashMovementInput[] = [
        { type: CASH_MOVEMENT_TYPES.POS_SALE, amount: 15000 },
      ];
      // Expected = 35000, Actual = 35000
      const report = consolidateCashSession('sess-r1', '2026-08-17', opening, movements, 35000);
      expect(report.discrepancy).toBe(0);
      expect(report.discrepancyStatus).toBe('BALANCED');
      expect(report.status).toBe(SESSION_STATUS.CLOSED);
    });

    test('8.2 Should detect cash shortage (Kasa Eksiği) when physical count is lower than expected', () => {
      const opening = 20000;
      const movements: CashMovementInput[] = [
        { type: CASH_MOVEMENT_TYPES.POS_SALE, amount: 10000 },
      ];
      // Expected = 30000, Actual = 29500 -> Discrepancy = -500
      const report = consolidateCashSession('sess-r2', '2026-08-17', opening, movements, 29500);
      expect(report.discrepancy).toBe(-500);
      expect(report.discrepancyStatus).toBe('SHORTAGE');
    });

    test('8.3 Should detect cash overage (Kasa Fazlası) when physical count exceeds expected', () => {
      const opening = 20000;
      const movements: CashMovementInput[] = [
        { type: CASH_MOVEMENT_TYPES.POS_SALE, amount: 10000 },
      ];
      // Expected = 30000, Actual = 30250 -> Discrepancy = +250
      const report = consolidateCashSession('sess-r3', '2026-08-17', opening, movements, 30250);
      expect(report.discrepancy).toBe(250);
      expect(report.discrepancyStatus).toBe('OVERAGE');
    });

    test('8.4 Should handle empty day session (zero movements) with exact opening balance', () => {
      const opening = 15000;
      const movements: CashMovementInput[] = [];
      const report = consolidateCashSession('sess-r4', '2026-08-17', opening, movements, 15000);
      expect(report.expectedClosingCash).toBe(15000);
      expect(report.actualClosingCash).toBe(15000);
      expect(report.discrepancy).toBe(0);
      expect(report.totalTurnover).toBe(0);
      expect(report.discrepancyStatus).toBe('BALANCED');
    });

    test('8.5 Should preserve session metadata and date stamp upon closing', () => {
      const report = consolidateCashSession('SESSION-20260817-001', '2026-08-17', 10000, [], 10000);
      expect(report.sessionId).toBe('SESSION-20260817-001');
      expect(report.date).toBe('2026-08-17');
      expect(report.status).toBe(SESSION_STATUS.CLOSED);
    });
  });
}
