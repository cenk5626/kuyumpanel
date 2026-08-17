import { describe, it, test, expect, setTestContext } from '../helpers/test-utils';
import { generateReorderDraft, REORDER_CONFIG } from '../helpers/domain-engines';

export function registerF19Tests() {
  setTestContext('Tier 1', 19, 'Critical Stock Alerts & Reorder Draft', 'F19: Low Stock Thresholds & Replenishment');

  describe('Feature 19 - Critical Stock Alert Triggers & Reorder Draft Generator', () => {
    const mockInventory = [
      { product: 'ECEYREKTL', label: 'Eski Çeyrek Altın', amount: 3, minThreshold: 10, supplierName: 'Kapalıçarşı Darphane' },
      { product: 'EYARIMTL', label: 'Eski Yarım Altın', amount: 8, minThreshold: 5, supplierName: 'Kapalıçarşı Darphane' },
      { product: '22BLZ', label: '22K Adana Burma', amount: 2, minThreshold: 6, supplierName: 'Ahlatçı Altın' },
      { product: '14KP', label: '14K Baget Küpe', amount: 12, minThreshold: 5, supplierName: 'Model Kuyumculuk' },
    ];

    test('19.1 Should include items whose amount is less than or equal to minThreshold', () => {
      const draft = generateReorderDraft(mockInventory);
      const productCodes = draft.map(d => d.productCode);

      expect(productCodes).toContain('ECEYREKTL');
      expect(productCodes).toContain('22BLZ');
      expect(productCodes).not.toContain('EYARIMTL'); // 8 > 5
      expect(productCodes).not.toContain('14KP'); // 12 > 5
    });

    test('19.2 Should calculate suggested replenishment quantity using safety buffer formula', () => {
      const draft = generateReorderDraft(mockInventory);
      const ceyrekOrder = draft.find(d => d.productCode === 'ECEYREKTL');

      // Target = 10 * 2 = 20 -> Suggested = 20 - 3 = 17
      expect(ceyrekOrder).toBeDefined();
      expect(ceyrekOrder!.suggestedQuantity).toBe(17);
    });

    test('19.3 Should include preferred supplier metadata for wholesale PO generation', () => {
      const draft = generateReorderDraft(mockInventory);
      const burmaOrder = draft.find(d => d.productCode === '22BLZ');

      expect(burmaOrder).toBeDefined();
      expect(burmaOrder!.supplierName).toBe('Ahlatçı Altın');
    });

    test('19.4 Should use default threshold when minThreshold is not explicitly specified', () => {
      const itemWithoutThreshold = [{ product: 'USD', label: 'Amerikan Doları', amount: 2 }];
      const draft = generateReorderDraft(itemWithoutThreshold);

      // Default threshold is 5 -> 2 <= 5 -> Included! Target = 5 * 2 = 10 -> Suggested = 10 - 2 = 8
      expect(draft.length).toBe(1);
      expect(draft[0].minThreshold).toBe(REORDER_CONFIG.MIN_DEFAULT_THRESHOLD);
      expect(draft[0].suggestedQuantity).toBe(8);
    });

    test('19.5 Should return empty draft when all inventory amounts exceed thresholds', () => {
      const wellStockedInventory = [
        { product: 'A', label: 'Altın A', amount: 50, minThreshold: 10 },
        { product: 'B', label: 'Altın B', amount: 30, minThreshold: 5 },
      ];
      const draft = generateReorderDraft(wellStockedInventory);
      expect(draft.length).toBe(0);
    });
  });
}
