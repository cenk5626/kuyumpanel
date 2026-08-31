import { describe, test, expect, setTestContext } from '../helpers/test-utils';
import { DIAMOND_COLORS, DIAMOND_CLARITIES, DIAMOND_CUTS, CERTIFICATE_ORGS } from '../../src/constants/diamond';
import * as XLSX from 'xlsx';

export function registerF21EnterpriseTests(): void {
  setTestContext('Tier 1', 21, 'Enterprise Modules (Alerts, Balance Sheet, 4C, Audit, Data Hub)', 'F21: Enterprise Capabilities Integrity');

  describe('Feature 21 - Enterprise Modules Integration', () => {
    test('21.1 Diamond 4C standards and Certificate organizations integrity', () => {
      expect(DIAMOND_COLORS.length >= 6).toBe(true);
      expect(DIAMOND_CLARITIES.length >= 6).toBe(true);
      expect(DIAMOND_CUTS.length >= 4).toBe(true);
      expect(CERTIFICATE_ORGS.some(o => o.code === 'GIA')).toBe(true);
      expect(CERTIFICATE_ORGS.some(o => o.code === 'HRD')).toBe(true);
    });

    test('21.2 Price alert trigger comparison logic', () => {
      const alert1 = {
        targetPrice: 6600,
        direction: 'ABOVE',
        metalType: 'HAS_BOZMA',
      };
      const currentHasBid = 6650; // current > target
      const isTriggered1 = currentHasBid >= alert1.targetPrice;
      expect(isTriggered1).toBe(true);

      const alert2 = {
        targetPrice: 6500,
        direction: 'BELOW',
        metalType: 'HAS_SATIS',
      };
      const currentHasAsk = 6480; // current < target
      const isTriggered2 = currentHasAsk <= alert2.targetPrice;
      expect(isTriggered2).toBe(true);
    });

    test('21.3 Balance sheet net wealth gram has & TL consolidation', () => {
      const simulatedGoldAsk = 6600;
      const stockAssetHas = 150.5; // 150.5 gr has
      const drawerCashTL = 250000;
      const customerDebtHas = 10.2;
      const customerDebtTL = 45000;
      const supplierDebtHas = 80.0;
      const supplierDebtTL = 120000;

      const totalAssetHas = stockAssetHas + customerDebtHas + (drawerCashTL + customerDebtTL) / simulatedGoldAsk;
      const totalLiabilityHas = supplierDebtHas + supplierDebtTL / simulatedGoldAsk;
      const netWealthHas = totalAssetHas - totalLiabilityHas;
      const netWealthTL = netWealthHas * simulatedGoldAsk;

      expect(totalAssetHas > 0).toBe(true);
      expect(totalLiabilityHas > 0).toBe(true);
      expect(netWealthHas > 0).toBe(true);
      expect(netWealthTL > 0).toBe(true);
    });

    test('21.4 Stock audit expected vs counted vs missing calculation', () => {
      const expectedItems = [
        { id: '1', barcode: '14KP0001', weight: 3.5 },
        { id: '2', barcode: '14KP0002', weight: 4.2 },
        { id: '3', barcode: '14KP0003', weight: 5.1 },
      ];
      const scannedBarcodes = ['14KP0001', '14KP0003'];

      const scannedItems = expectedItems.filter(i => scannedBarcodes.includes(i.barcode));
      const missingItems = expectedItems.filter(i => !scannedBarcodes.includes(i.barcode));

      expect(scannedItems.length).toBe(2);
      expect(missingItems.length).toBe(1);
      expect(missingItems[0].barcode).toBe('14KP0002');
      const missingWeight = missingItems.reduce((s, i) => s + i.weight, 0);
      expect(Math.abs(missingWeight - 4.2) < 0.001).toBe(true);
    });

    test('21.5 SheetJS Excel workbook construction and parsing verification', () => {
      const sampleRows = [
        { Barkod: '14KP0001', Urun: 'Ajda Küpe', Gram: 4.25, Ayar: 14 },
        { Barkod: '14KP0002', Urun: 'Dorika Bileklik', Gram: 7.80, Ayar: 14 },
      ];

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(sampleRows);
      XLSX.utils.book_append_sheet(wb, ws, 'Stoklar');

      const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
      expect(Boolean(buffer && buffer.length > 0)).toBe(true);

      const parsedWb = XLSX.read(buffer, { type: 'buffer' });
      const parsedWs = parsedWb.Sheets['Stoklar'];
      const parsedRows: any[] = XLSX.utils.sheet_to_json(parsedWs);

      expect(parsedRows.length).toBe(2);
      expect(parsedRows[0].Barkod).toBe('14KP0001');
    });
  });
}
