import { describe, it, test, expect, setTestContext } from '../helpers/test-utils';
import { formatThermalZReportSlip, consolidateCashSession, CashMovementInput } from '../helpers/domain-engines';
import { CASH_MOVEMENT_TYPES } from '../../src/constants/kasa';

export function registerF09Tests() {
  setTestContext('Tier 1', 9, 'Thermal Z-Report Slip Print', 'F09: 80mm & 58mm Receipt Formatter');

  describe('Feature 9 - Thermal Z-Report Receipt Slip Formatter (80mm & 58mm)', () => {
    const movements: CashMovementInput[] = [
      { type: CASH_MOVEMENT_TYPES.POS_SALE, amount: 20000 },
      { type: CASH_MOVEMENT_TYPES.CUSTOMER_COLLECTION, amount: 5000 },
      { type: CASH_MOVEMENT_TYPES.SCRAP_BUY, amount: 8000, hasWeight: 2.5 },
    ];
    const report = consolidateCashSession('Z-2026-08-17', '2026-08-17 19:30', 10000, movements, 27000);

    test('9.1 Should format 80mm thermal slip with store title and Z-Report header', () => {
      const slip = formatThermalZReportSlip(report, false);
      expect(slip).toContain('GÜN SONU Z-RAPORU');
      expect(slip).toContain('Kuyumcu Panel');
      expect(slip).toContain('Z-2026-08-17');
    });

    test('9.2 Should include all cash inflows, outflows, and turnover metrics', () => {
      const slip = formatThermalZReportSlip(report, false);
      expect(slip).toContain('Devir Açılış Kasası:');
      expect(slip).toContain('Nakit Satışlar:');
      expect(slip).toContain('Hurda Alış Ödemeleri:');
      expect(slip).toContain('GÜNLÜK TOPLAM CİRO:');
    });

    test('9.3 Should include physical count and discrepancy status in slip', () => {
      const slip = formatThermalZReportSlip(report, false);
      expect(slip).toContain('Beklenen Kasa Nakdi:');
      expect(slip).toContain('Sayılan Fiili Nakit:');
      expect(slip).toContain('KASA FARKI');
      expect(slip).toContain('BALANCED');
    });

    test('9.4 Should format narrow 58mm thermal slip adhering to character width limit', () => {
      const slip58 = formatThermalZReportSlip(report, true);
      const lines = slip58.split('\n');
      for (const l of lines) {
        expect(l.length).toBeLessThanOrEqual(36); // Tolerance for multi-byte or spacing
      }
    });

    test('9.5 Should include non-fiscal informative footer notice', () => {
      const slip = formatThermalZReportSlip(report, false);
      expect(slip).toContain('Mali Değeri Yoktur');
    });
  });
}
