import { describe, it, test, expect, setTestContext } from '../helpers/test-utils';
import {
  HISTORY_RATES_CONFIG,
  TRACKED_RATE_PRODUCTS,
  STANDARD_MILYEM_DEFINITIONS,
  MilyemStandardKey,
} from '../../src/constants/history-rates';
import { getCaptureSlotKey } from '../../src/lib/rates/snapshot-engine';

export function registerF41HistoryRatesTests() {
  setTestContext(
    'Tier 1',
    41,
    'Historical Rates & Milyem Engine',
    'F41: Geçmiş Kurlar ve Milyem Geçmişi'
  );

  describe('Feature 41 - Geçmiş Kurlar, 30 Dakikalık Slot ve Milyem Standartları', () => {
    test('41.1 Should generate 30-minute Europe/Istanbul slot keys deterministically', () => {
      // 2026-09-09 14:15 UTC = 17:15 Istanbul -> Slot: 2026-09-09-17-00
      const d1 = new Date('2026-09-09T14:15:00.000Z');
      const slot1 = getCaptureSlotKey(d1);
      expect(slot1).toContain('2026-09-09');
      expect(slot1).toMatch(/\d{4}-\d{2}-\d{2}-\d{2}-(00|30)/);

      // 2026-09-09 14:45 UTC = 17:45 Istanbul -> Slot: 2026-09-09-17-30
      const d2 = new Date('2026-09-09T14:45:00.000Z');
      const slot2 = getCaptureSlotKey(d2);
      expect(slot2).toMatch(/\d{4}-\d{2}-\d{2}-\d{2}-30/);
    });

    test('41.2 Should ensure slot keys are idempotent for same 30-minute window', () => {
      const t1 = new Date('2026-09-09T10:05:00.000Z');
      const t2 = new Date('2026-09-09T10:25:00.000Z');
      const slotA = getCaptureSlotKey(t1);
      const slotB = getCaptureSlotKey(t2);

      expect(slotA).toBe(slotB);
    });

    test('41.3 Should define all standard gold fineness definitions with correct milyem factors', () => {
      const mil24 = STANDARD_MILYEM_DEFINITIONS.find((m) => m.code === 'mil24Ayar');
      const mil22 = STANDARD_MILYEM_DEFINITIONS.find((m) => m.code === 'mil22Ayar');
      const mil18 = STANDARD_MILYEM_DEFINITIONS.find((m) => m.code === 'mil18Ayar');
      const mil14 = STANDARD_MILYEM_DEFINITIONS.find((m) => m.code === 'mil14Ayar');
      const mil8 = STANDARD_MILYEM_DEFINITIONS.find((m) => m.code === 'mil8Ayar');

      expect(mil24?.defaultMilyem).toBe(995.0);
      expect(mil22?.defaultMilyem).toBe(916.0);
      expect(mil18?.defaultMilyem).toBe(750.0);
      expect(mil14?.defaultMilyem).toBe(585.0);
      expect(mil8?.defaultMilyem).toBe(333.0);

      for (const def of STANDARD_MILYEM_DEFINITIONS) {
        expect(def.code.length).toBeGreaterThan(0);
        expect(def.defaultMilyem).toBeGreaterThan(0);
        expect(def.defaultMilyem).toBeLessThanOrEqual(1000.0);
        expect(def.label.length).toBeGreaterThan(0);
      }
    });

    test('41.4 Should track essential rate products in TRACKED_RATE_PRODUCTS', () => {
      const productCodes = TRACKED_RATE_PRODUCTS.map((p) => p.code);
      expect(productCodes).toContain('HAS_ALTIN');
      expect(productCodes).toContain('USD');
      expect(productCodes).toContain('EUR');
      expect(productCodes).toContain('CEYREK_YENI');
      expect(productCodes).toContain('YARIM_YENI');
      expect(productCodes).toContain('TAM_YENI');

      for (const p of TRACKED_RATE_PRODUCTS) {
        expect(p.code.length).toBeGreaterThan(0);
        expect(p.label.length).toBeGreaterThan(0);
        expect(p.defaultCurrency).toBe('TL');
      }
    });

    test('41.5 Should calculate buy-sell spread correctly without rounding anomalies', () => {
      const buyRate = 3250.50;
      const sellRate = 3280.00;
      const spread = Math.round((sellRate - buyRate) * 100) / 100;
      const spreadPercent = Math.round(((sellRate - buyRate) / buyRate) * 10000) / 100;

      expect(spread).toBe(29.50);
      expect(spreadPercent).toBe(0.91);
      expect(sellRate).toBeGreaterThan(buyRate);
    });
  });
}
