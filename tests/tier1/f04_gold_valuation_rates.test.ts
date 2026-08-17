import { describe, it, test, expect, setTestContext } from '../helpers/test-utils';
import { calculateHasEquivalent, GOLD_FINENESS_RATES, ZIYNET_WEIGHTS } from '../../src/constants/cari';

export function registerF04Tests() {
  setTestContext('Tier 1', 4, 'Gold Valuation & Rate Recording', 'F04: Valuation & Spot Conversions');

  describe('Feature 4 - Accurate Gold Valuation & Spot Conversion Engine', () => {
    test('4.1 Should convert 22K jewelry weight to Has equivalent using 0.916 milyem factor', () => {
      const weight = 20.0; // 20 grams 22K
      const hasEq = calculateHasEquivalent('22K', weight);
      // 20 * 0.916 = 18.320 gr Has
      expect(hasEq).toBe(18.32);
    });

    test('4.2 Should convert 14K jewelry weight to Has equivalent using 0.585 milyem factor', () => {
      const weight = 10.0; // 10 grams 14K
      const hasEq = calculateHasEquivalent('14K', weight);
      // 10 * 0.585 = 5.850 gr Has
      expect(hasEq).toBe(5.85);
    });

    test('4.3 Should convert 18K jewelry weight to Has equivalent using 0.750 factor', () => {
      const weight = 12.0; // 12 grams 18K
      const hasEq = calculateHasEquivalent('18K', weight);
      // 12 * 0.750 = 9.000 gr Has
      expect(hasEq).toBe(9.0);
    });

    test('4.4 Should convert TL monetary debt to Gram Has equivalent using spot unit price', () => {
      const debtTL = 30000;
      const spotRate = 3000; // 3000 TL per gram Has
      const hasEq = calculateHasEquivalent('TL', debtTL, spotRate);
      // 30,000 / 3000 = 10.0000 gr Has
      expect(hasEq).toBe(10.0);
    });

    test('4.5 Should convert Ata and Gremse ziynet quantities to Has equivalents accurately', () => {
      const ataCount = 3;
      const gremseCount = 2;

      const ataHas = calculateHasEquivalent('ATA', ataCount);
      const gremseHas = calculateHasEquivalent('GREMSE', gremseCount);

      // 3 * 6.608 = 19.824 gr Has
      expect(ataHas).toBe(19.824);
      // 2 * 16.050 = 32.100 gr Has
      expect(gremseHas).toBe(32.1);
    });
  });
}
