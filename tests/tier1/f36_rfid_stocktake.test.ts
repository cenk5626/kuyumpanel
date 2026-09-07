import { describe, it, test, expect, setTestContext } from '../helpers/test-utils';
import {
  RFID_MATCH_STATUS,
  RFID_SESSION_STATUS,
  RFID_DEFAULTS,
} from '@/constants/rfid';
import {
  generateEpcFromBarcode,
  parseBarcodeFromEpc,
  reconcileRfidScan,
  simulateRfidScan,
  formatRfidAuditSummary,
  ExpectedRfidItem,
  ScannedTag,
} from '@/lib/rfid/rfid-engine';

export function registerF36RfidStocktakeTests() {
  setTestContext(
    'Tier 1',
    36,
    'RFID UHF Stocktaking & Tag Reconciliation',
    'F36: RFID Destekli Vitrin ve Hızlı Sayım'
  );

  describe('Feature 36 - RFID UHF Vitrin ve Hızlı Sayım', () => {
    test('36.1 generateEpcFromBarcode should create deterministic 24-character hex EPC', () => {
      const barcode = '14KP0001';
      const epc1 = generateEpcFromBarcode(barcode);
      const epc2 = generateEpcFromBarcode(barcode);

      expect(epc1).toBe(epc2);
      expect(epc1.length).toBe(RFID_DEFAULTS.DEFAULT_TAG_LENGTH_HEX);
      expect(epc1.startsWith('E280')).toBe(true);
    });

    test('36.2 parseBarcodeFromEpc should correctly decode original barcode from hex EPC', () => {
      const originalBarcode = '22BLZ99';
      const epc = generateEpcFromBarcode(originalBarcode);
      const decoded = parseBarcodeFromEpc(epc);

      expect(decoded).toBe(originalBarcode);
    });

    test('36.3 parseBarcodeFromEpc should return null for invalid length EPC', () => {
      expect(parseBarcodeFromEpc('E280123')).toBeNull();
      expect(parseBarcodeFromEpc('')).toBeNull();
    });

    test('36.4 reconcileRfidScan should accurately match all items when 100% present', () => {
      const items: ExpectedRfidItem[] = [
        { epc: generateEpcFromBarcode('B1'), barcode: 'B1', title: 'Bilezik 1', weight: 20 },
        { epc: generateEpcFromBarcode('B2'), barcode: 'B2', title: 'Bilezik 2', weight: 15 },
      ];

      const scanned: ScannedTag[] = [
        { epc: items[0].epc, rssi: -45 },
        { epc: items[1].epc, rssi: -50 },
      ];

      const res = reconcileRfidScan(items, scanned, 'VİTRİN_1');
      expect(res.totalExpected).toBe(2);
      expect(res.totalScanned).toBe(2);
      expect(res.matchedCount).toBe(2);
      expect(res.missingCount).toBe(0);
      expect(res.surplusCount).toBe(0);
      expect(res.accuracyRatePercent).toBe(100);
      expect(res.totalMissingWeightGr).toBe(0);
    });

    test('36.5 reconcileRfidScan should identify missing items and compute total missing grams', () => {
      const items: ExpectedRfidItem[] = [
        { epc: generateEpcFromBarcode('B1'), barcode: 'B1', title: 'Bilezik 1', weight: 25.5 },
        { epc: generateEpcFromBarcode('B2'), barcode: 'B2', title: 'Bilezik 2', weight: 14.5 },
        { epc: generateEpcFromBarcode('B3'), barcode: 'B3', title: 'Bilezik 3', weight: 10.0 },
      ];

      // Sadece B1 ve B3 okundu, B2 eksik
      const scanned: ScannedTag[] = [
        { epc: items[0].epc, rssi: -40 },
        { epc: items[2].epc, rssi: -42 },
      ];

      const res = reconcileRfidScan(items, scanned, 'TABLA_A');
      expect(res.matchedCount).toBe(2);
      expect(res.missingCount).toBe(1);
      expect(res.totalMissingWeightGr).toBe(14.5);
      expect(res.accuracyRatePercent).toBe(66.7); // 2/3 = 66.7%

      const missingItem = res.items.find((i) => i.matchStatus === RFID_MATCH_STATUS.MISSING);
      expect(missingItem?.barcode).toBe('B2');
    });

    test('36.6 reconcileRfidScan should detect surplus tags not present in expected inventory', () => {
      const items: ExpectedRfidItem[] = [
        { epc: generateEpcFromBarcode('B1'), barcode: 'B1', title: 'Bilezik 1' },
      ];

      const surplusEpc = generateEpcFromBarcode('EXTRA99');
      const scanned: ScannedTag[] = [
        { epc: items[0].epc, rssi: -45 },
        { epc: surplusEpc, rssi: -60 }, // Beklenmeyen etiket
      ];

      const res = reconcileRfidScan(items, scanned, 'VİTRİN_1');
      expect(res.matchedCount).toBe(1);
      expect(res.surplusCount).toBe(1);

      const surplusItem = res.items.find((i) => i.matchStatus === RFID_MATCH_STATUS.SURPLUS);
      expect(surplusItem?.epc).toBe(surplusEpc);
      expect(surplusItem?.barcode).toBe('EXTRA99');
    });

    test('36.7 reconcileRfidScan should accumulate read counts and record max RSSI', () => {
      const epc = generateEpcFromBarcode('TAG01');
      const items: ExpectedRfidItem[] = [{ epc, barcode: 'TAG01', title: 'Kolye' }];

      const scanned: ScannedTag[] = [
        { epc, rssi: -65 },
        { epc, rssi: -42 },
        { epc, rssi: -50 },
      ];

      const res = reconcileRfidScan(items, scanned);
      const matched = res.items[0];
      expect(matched.readCount).toBe(3);
      expect(matched.rssi).toBe(-42); // En yüksek sinyal gücü
    });

    test('36.8 simulateRfidScan should exclude items matching given missing indices', () => {
      const items = [
        { epc: generateEpcFromBarcode('S1') },
        { epc: generateEpcFromBarcode('S2') },
        { epc: generateEpcFromBarcode('S3') },
      ];

      // 1. indeksteki (S2) kasıtlı eksik
      const sim = simulateRfidScan(items, [1]);
      const scannedEpcs = new Set(sim.map((s) => s.epc));

      expect(scannedEpcs.has(items[0].epc)).toBe(true);
      expect(scannedEpcs.has(items[1].epc)).toBe(false);
      expect(scannedEpcs.has(items[2].epc)).toBe(true);
    });

    test('36.9 formatRfidAuditSummary should generate detailed WhatsApp report', () => {
      const summary = formatRfidAuditSummary('RFID-2026-0001', 'VİTRİN_1', {
        totalExpected: 50,
        totalScanned: 48,
        matchedCount: 47,
        missingCount: 3,
        surplusCount: 1,
        accuracyRatePercent: 94.0,
        totalMissingWeightGr: 42.5,
        items: [],
      });

      expect(summary).toContain('*Oturum No:* #RFID-2026-0001');
      expect(summary).toContain('*Doğruluk Oranı:* %94');
      expect(summary).toContain('42.5 gr');
      expect(summary).toContain('*Eşleşen (Mevcut):* 47 adet');
    });

    test('36.10 reconcileRfidScan should handle empty scan gracefully', () => {
      const items: ExpectedRfidItem[] = [
        { epc: generateEpcFromBarcode('K1'), barcode: 'K1', title: 'Küpe' },
      ];

      const res = reconcileRfidScan(items, []);
      expect(res.totalExpected).toBe(1);
      expect(res.totalScanned).toBe(0);
      expect(res.matchedCount).toBe(0);
      expect(res.missingCount).toBe(1);
      expect(res.accuracyRatePercent).toBe(0);
    });
  });
}
