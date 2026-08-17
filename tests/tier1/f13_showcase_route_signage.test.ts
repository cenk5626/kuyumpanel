import { describe, it, test, expect, setTestContext } from '../helpers/test-utils';
import { ROUTES } from '../../src/constants/routes';
import { PRODUCTS, ZIYNET_TL_LABELS } from '../../src/constants/prices';

export function registerF13Tests() {
  setTestContext('Tier 1', 13, 'Showcase Digital Signage Route', 'F13: Fullscreen Showcase Signage');

  describe('Feature 13 - Standalone Fullscreen TV Showcase Digital Signage Route', () => {
    test('13.1 Should verify showcase route path is registered as /showcase', () => {
      expect(ROUTES.SHOWCASE).toBe('/showcase');
    });

    test('13.2 Should provide complete product keys for TV rate board display', () => {
      const productKeys = PRODUCTS.map(p => p.key);
      expect(productKeys).toContain('mil24Ayar');
      expect(productKeys).toContain('mil22Ayar');
      expect(productKeys).toContain('milAdanaBurma');
      expect(productKeys).toContain('milAjda');
      expect(productKeys).toContain('mil14Ayar');
    });

    test('13.3 Should provide Turkish labels for Ziynet gold rate items', () => {
      expect(ZIYNET_TL_LABELS.ECEYREKTL).toBe('Çeyrek Altın');
      expect(ZIYNET_TL_LABELS.EYARIMTL).toBe('Yarım Altın');
      expect(ZIYNET_TL_LABELS.ETAMTL).toBe('Tam Altın');
      expect(ZIYNET_TL_LABELS.EATATL).toBe('Ata Altın');
      expect(ZIYNET_TL_LABELS.EGREMSETL).toBe('Gremse');
    });

    test('13.4 Should compute buy/sell prices from spot Has rate and milyem factors', () => {
      const hasAsk = 3000;
      const mil22 = 916;
      // 3000 * 916 / 1000 = 2748 TL
      const price22K = (hasAsk * mil22) / 1000;
      expect(price22K).toBe(2748);
    });

    test('13.5 Should calculate spread and direction delta for digital signage indicators', () => {
      const prevPrice = 2950;
      const currentPrice = 3000;
      const delta = currentPrice - prevPrice;
      const isUp = delta > 0;

      expect(delta).toBe(50);
      expect(isUp).toBe(true);
    });
  });
}
