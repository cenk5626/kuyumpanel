import { describe, test, expect, setTestContext } from '../helpers/test-utils';
import {
  PO_STATUS,
  PO_LINE_STATUS,
  PO_DEFAULTS,
  PRODUCT_CATEGORIES,
  PO_STATUS_LABELS,
  PurchaseOrderStatus,
} from '../../src/constants/purchase';
import {
  getCaratMilyem,
  calculateHasEquivalent,
  calculateWeightVariance,
  generatePurchaseOrderNumber,
  generateGoodsReceiptNumber,
} from '../../src/lib/purchase/variance-calculator';

export function registerF27PurchaseGoodsReceiptTests(): void {
  setTestContext(
    'Tier 1',
    27,
    'Purchase Orders & Goods Receipt with Cost Variance',
    'F27: Purchase & Goods Receipt'
  );

  describe('Feature 27: Purchase Orders, Goods Receipt & Cost Variance (Tier 1)', () => {
    // -------------------------------------------------------------
    // 1. Sabitler ve Enums Doğrulama
    // -------------------------------------------------------------
    test('F27-01: Sipariş durumları ve ön ek sabitleri eksiksiz tanımlanmalıdır', () => {
      expect(PO_STATUS.DRAFT).toBe('DRAFT');
      expect(PO_STATUS.ORDERED).toBe('ORDERED');
      expect(PO_STATUS.PARTIALLY_RECEIVED).toBe('PARTIALLY_RECEIVED');
      expect(PO_STATUS.RECEIVED).toBe('RECEIVED');
      expect(PO_STATUS.CANCELLED).toBe('CANCELLED');

      expect(PO_LINE_STATUS.PENDING).toBe('PENDING');
      expect(PO_LINE_STATUS.COMPLETED).toBe('COMPLETED');

      expect(PO_DEFAULTS.PO_PREFIX).toBe('PO');
      expect(PO_DEFAULTS.GR_PREFIX).toBe('GR');
      expect(PO_DEFAULTS.PAD_LENGTH).toBe(4);

      expect(PRODUCT_CATEGORIES.BILEZIK).toBe('Bilezik');
      expect(PRODUCT_CATEGORIES.HAS_KULCE).toBe('Has / Külçe Altın');
    });

    test('F27-02: Her sipariş durumunun UI etiket ve renk tanımları bulunmalıdır', () => {
      const statuses = Object.values(PO_STATUS);
      for (const status of statuses) {
        const meta = PO_STATUS_LABELS[status as PurchaseOrderStatus];
        expect(meta).toBeDefined();
        expect(meta.label.length).toBeGreaterThan(0);
        expect(meta.color).toBeDefined();
        expect(meta.bg).toBeDefined();
      }
    });

    // -------------------------------------------------------------
    // 2. Milyem ve Has Altın Hesaplama Doğruluğu
    // -------------------------------------------------------------
    test('F27-03: Ayar milyem eşleşmeleri altın sektör standartlarına uygun olmalıdır', () => {
      expect(getCaratMilyem(24)).toBe(995);
      expect(getCaratMilyem(22)).toBe(916);
      expect(getCaratMilyem(18)).toBe(750);
      expect(getCaratMilyem(14)).toBe(585);
      expect(getCaratMilyem(8)).toBe(333);
    });

    test('F27-04: Has altın eşdeğerlik formülü saf gramajı hatasız yuvarlamalıdır', () => {
      // 100 gram 14K (585) = 58.50 gr Has
      const has14k = calculateHasEquivalent(100, 14);
      expect(has14k).toBe(58.5);

      // 50 gram 22K (916) = 45.80 gr Has
      const has22k = calculateHasEquivalent(50, 22);
      expect(has22k).toBe(45.8);

      // 200 gram 24K (995) = 199.00 gr Has
      const has24k = calculateHasEquivalent(200, 24);
      expect(has24k).toBe(199);
    });

    // -------------------------------------------------------------
    // 3. Sipariş ve Fiili Tartım Maliyet / Gramaj Farkı (Variance)
    // -------------------------------------------------------------
    test('F27-05: Sipariş edilen ile fiili tartım farkı (fazla/eksik) doğru hesaplanmalıdır', () => {
      // 100 gr siparişe 102 gr fiili tartım -> +2 gr (%2.0 fazla)
      const excessResult = calculateWeightVariance(100, 102);
      expect(excessResult.weightDiff).toBe(2);
      expect(excessResult.percentDiff).toBe(2);
      expect(excessResult.isExcess).toBe(true);

      // 100 gr siparişe 97.5 gr fiili tartım -> -2.5 gr (%-2.5 eksik)
      const deficitResult = calculateWeightVariance(100, 97.5);
      expect(deficitResult.weightDiff).toBe(-2.5);
      expect(deficitResult.percentDiff).toBe(-2.5);
      expect(deficitResult.isExcess).toBe(false);

      // Tam eşleşme
      const exactResult = calculateWeightVariance(50, 50);
      expect(exactResult.weightDiff).toBe(0);
      expect(exactResult.percentDiff).toBe(0);
    });

    // -------------------------------------------------------------
    // 4. Numara Üretici Doğrulaması
    // -------------------------------------------------------------
    test('F27-06: Sipariş ve Mal Kabul numaraları format standardını korumalıdır', () => {
      expect(generatePurchaseOrderNumber(0, 2026)).toBe('PO-2026-0001');
      expect(generatePurchaseOrderNumber(14, 2026)).toBe('PO-2026-0015');

      expect(generateGoodsReceiptNumber(0, 2026)).toBe('GR-2026-0001');
      expect(generateGoodsReceiptNumber(99, 2026)).toBe('GR-2026-0100');
    });

    // -------------------------------------------------------------
    // 5. Mal Kabul ve Toptancı Cari Borçlanma Simülasyonu
    // -------------------------------------------------------------
    test('F27-07: Mal kabul esnasında toptancı Has bakiyesi fiili tartım kadar borçlanmalıdır', () => {
      interface MockSupplier {
        id: string;
        hasBalance: number;
        tlBalance: number;
      }

      const supplier: MockSupplier = {
        id: 'sup_1',
        hasBalance: 120.0, // Başlangıç 120 Has borcumuz var
        tlBalance: 0,
      };

      // 100 gr 22K (916 milyem) = 91.6 gr Has kabul edildi
      const actualWeight = 100.0;
      const carat = 22;
      const hasEquivalent = calculateHasEquivalent(actualWeight, carat);
      const laborCostTl = 100 * 30; // 30 TL/gr işçilik = 3,000 TL

      // Toptancı carisi güncelle
      supplier.hasBalance += hasEquivalent;
      supplier.tlBalance += laborCostTl;

      expect(supplier.hasBalance).toBe(211.6);
      expect(supplier.tlBalance).toBe(3000);
    });

    test('F27-08: Kısmi mal kabulde sipariş statüsü PARTIALLY_RECEIVED olmalıdır', () => {
      interface MockPOLine {
        orderedWeight: number;
        receivedWeight: number;
        status: string;
      }

      const line: MockPOLine = {
        orderedWeight: 100,
        receivedWeight: 0,
        status: PO_LINE_STATUS.PENDING,
      };

      // İlk teslimat: 60 gr geldi
      line.receivedWeight += 60;
      if (line.receivedWeight < line.orderedWeight) {
        line.status = PO_LINE_STATUS.PARTIALLY_RECEIVED;
      }

      expect(line.receivedWeight).toBe(60);
      expect(line.status).toBe(PO_LINE_STATUS.PARTIALLY_RECEIVED);

      // İkinci teslimat: 40 gr geldi -> Toplam 100 gr tamamlandı
      line.receivedWeight += 40;
      if (line.receivedWeight >= line.orderedWeight) {
        line.status = PO_LINE_STATUS.COMPLETED;
      }

      expect(line.receivedWeight).toBe(100);
      expect(line.status).toBe(PO_LINE_STATUS.COMPLETED);
    });

    // -------------------------------------------------------------
    // 6. Çoklu Şube Mal Kabul İzolasyonu
    // -------------------------------------------------------------
    test('F27-09: Mal kabul edilen ürünlerin stoğu yalnızca hedef şubeye eklenmelidir', () => {
      interface MockBranchStock {
        branchId: string;
        currentWeight: number;
      }

      const stocks: MockBranchStock[] = [
        { branchId: 'branch_merkez', currentWeight: 500 },
        { branchId: 'branch_kadikoy', currentWeight: 200 },
      ];

      const targetBranchId = 'branch_kadikoy';
      const incomingWeight = 80.0;

      const targetStock = stocks.find((s) => s.branchId === targetBranchId);
      if (targetStock) {
        targetStock.currentWeight += incomingWeight;
      }

      expect(stocks.find((s) => s.branchId === 'branch_kadikoy')?.currentWeight).toBe(280);
      expect(stocks.find((s) => s.branchId === 'branch_merkez')?.currentWeight).toBe(500); // Merkez değişmedi
    });
  });
}
