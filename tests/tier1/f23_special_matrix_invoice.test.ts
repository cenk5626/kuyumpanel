import { describe, test, expect, setTestContext } from '../helpers/test-utils';
import {
  calculateSpecialMatrixItem,
  calculateSpecialMatrixInvoice,
  generateInvoiceNumber,
} from '../../src/lib/invoice/special-matrix';
import {
  INVOICE_TYPES,
  INVOICE_DOCUMENT_TYPES,
  INVOICE_KDV_RATES,
  INVOICE_DEFAULTS,
} from '../../src/constants/invoice';
import { parseScaleData } from '../../src/lib/hardware/scale';

export function registerF23SpecialMatrixInvoiceTests(): void {
  setTestContext(
    'Tier 1',
    23,
    'Kuyumcu Özel Matrahlı Fatura & e-Arşiv (KDV 23/e) ve Terazi Entegrasyonu',
    'F23: Special Matrix & Scale Integration'
  );

  describe('Feature 23 - KDV Kanunu Madde 23/e Özel Matrah & Terazi Entegrasyonu', () => {
    test('23.1 KDV Kanunu 23/e gereğince külçe altın bedeli KDV istisnası ve %20 işçilik KDV hesabı', () => {
      // 10 gr 22 Ayar bilezik (0.916 milyem), Has Altın gramı 3,000 TL, İşçilik 1,000 TL
      const item = calculateSpecialMatrixItem({
        name: '22 Ayar Burma Bilezik',
        weight: 10.0,
        carat: 22,
        hasGoldPrice: 3000,
        laborCost: 1000,
      });

      // 10 * 0.916 = 9.160 gr Has Altın
      expect(item.pureGoldWeight).toBe(9.16);
      // Külçe Altın Bedeli (KDV İstisnası): 9.160 * 3000 = 27,480 TL
      expect(item.goldCost).toBe(27480);
      // KDV Matrahı (Yalnızca İşçilik): 1,000 TL
      expect(item.laborAmount).toBe(1000);
      // %20 KDV: 1,000 * 0.20 = 200 TL
      expect(item.kdvAmount).toBe(200);
      // Toplam: 27,480 + 1,000 + 200 = 28,680 TL
      expect(item.total).toBe(28680);
      expect(item.kdvPercent).toBe(INVOICE_KDV_RATES.LABOR_PERCENT);
    });

    test('23.2 14 Ayar takıda gram başına işçilik yöntemiyle özel matrah hesabı', () => {
      // 5 gr 14 Ayar (0.585 milyem), Has Altın gramı 3,200 TL, Gram başına işçilik 200 TL/gr
      const item = calculateSpecialMatrixItem({
        name: '14 Ayar Baget Kolye',
        weight: 5.0,
        carat: 14,
        hasGoldPrice: 3200,
        laborPerGram: 200,
      });

      // 5 * 0.585 = 2.925 gr Has
      expect(item.pureGoldWeight).toBe(2.925);
      // Külçe Bedeli: 2.925 * 3200 = 9,360 TL
      expect(item.goldCost).toBe(9360);
      // İşçilik Matrahı: 5 * 200 = 1,000 TL
      expect(item.laborAmount).toBe(1000);
      // KDV: 1,000 * 0.20 = 200 TL
      expect(item.kdvAmount).toBe(200);
      // Toplam: 9,360 + 1,000 + 200 = 10,560 TL
      expect(item.total).toBe(10560);
    });

    test('23.3 Çoklu kalemli KDV 23/e faturası ve yasal meşruat şerhi bütünlüğü', () => {
      const invoice = calculateSpecialMatrixInvoice([
        {
          name: '22 Ayar Bilezik',
          weight: 20.0,
          carat: 22,
          hasGoldPrice: 3000,
          laborCost: 2000,
        },
        {
          name: '14 Ayar Küpe',
          weight: 4.0,
          carat: 14,
          hasGoldPrice: 3000,
          laborCost: 800,
        },
      ]);

      expect(invoice.items.length).toBe(2);
      expect(invoice.totalPureGoldWeight).toBe(20.66); // (20 * 0.916 = 18.32) + (4 * 0.585 = 2.34) = 20.66
      expect(invoice.totalLaborAmount).toBe(2800); // 2000 + 800
      expect(invoice.totalKdvAmount).toBe(560); // 2800 * 0.20 = 560
      expect(invoice.legalNotice).toContain('3065');
      expect(invoice.legalNotice).toContain('23/e');
      expect(invoice.type).toBe(INVOICE_TYPES.OZEL_MATRAH);
    });

    test('23.4 Standart e-Fatura / e-Arşiv seri ve sıra numarası üretimi', () => {
      const currentYear = new Date().getFullYear();
      const num1 = generateInvoiceNumber('KYM', 1);
      expect(num1).toBe(`KYM${currentYear}000000001`);

      const num42 = generateInvoiceNumber('EAF', 42);
      expect(num42).toBe(`EAF${currentYear}000000042`);
    });

    test('23.5 Seri port terazi protokolleri (STX/ETX, Mettler Toledo, CAS, Radwag) ayrıştırması', () => {
      // Mettler Toledo kararlı veri satırı
      const mettler = parseScaleData('S S     14.250 g\r\n');
      expect(mettler).not.toBeNull();
      expect(mettler?.weight).toBe(14.25);
      expect(mettler?.isStable).toBe(true);
      expect(mettler?.unit).toBe('g');

      // CAS terazisi kararlı veri satırı
      const cas = parseScaleData('ST,GS,+  24.500 g\r\n');
      expect(cas).not.toBeNull();
      expect(cas?.weight).toBe(24.5);
      expect(cas?.isStable).toBe(true);

      // Radwag terazisi kararlı veri satırı
      const radwag = parseScaleData('SI      18.420 g\r\n');
      expect(radwag).not.toBeNull();
      expect(radwag?.weight).toBe(18.42);

      // Dinamik / Kararsız terazi tespiti
      const unstable = parseScaleData('US,GS,+  12.345 g\r\n');
      expect(unstable).not.toBeNull();
      expect(unstable?.isStable).toBe(false);

      // Boş / Hatalı veri
      expect(parseScaleData('')).toBeNull();
      expect(parseScaleData('ERROR\r\n')).toBeNull();
    });

    test('23.6 Doğrudan satış fiyatı üzerinden KDV 23/e özel matrah tersine mühendislik hesabı', () => {
      // 10 gr 22K (9.16 gr has), Has Altın 3,000 TL -> Külçe bedeli: 27,480 TL
      // Müşteriye verilen toplam satış fiyatı: 31,080 TL
      // Fark (İşçilik + KDV) = 31,080 - 27,480 = 3,600 TL
      // İşçilik matrahı = 3,600 / 1.20 = 3,000 TL
      // %20 KDV = 600 TL
      const item = calculateSpecialMatrixItem({
        name: '22K Set',
        weight: 10.0,
        carat: 22,
        hasGoldPrice: 3000,
        sellingPrice: 31080,
      });

      expect(item.goldCost).toBe(27480);
      expect(item.laborAmount).toBe(3000);
      expect(item.kdvAmount).toBe(600);
      expect(item.total).toBe(31080);
    });

    test('23.7 Seri port verisinde terazi dara ve sıfır ("+ 0.000 g") okumalarının doğru ayrıştırılması', () => {
      const tareZero = parseScaleData('ST,GS,+  0.000 g\r\n');
      expect(tareZero).not.toBeNull();
      expect(tareZero?.weight).toBe(0);
      expect(tareZero?.isStable).toBe(true);

      const netWeight = parseScaleData('ST,NT,+  15.550 g\r\n');
      expect(netWeight).not.toBeNull();
      expect(netWeight?.weight).toBe(15.55);
    });

    test('23.8 Terazide standart ("1,250.750 g") ve Avrupa ("1.250,750 g") binlik basamak ayrımı doğrulaması', () => {
      // Standart binlik ayracı (virgül binlik, nokta ondalık)
      const standardKilo = parseScaleData('ST,GS,+ 1,250.750 g\r\n');
      expect(standardKilo).not.toBeNull();
      expect(standardKilo?.weight).toBe(1250.75);

      // Avrupa binlik ayracı (nokta binlik, virgül ondalık)
      const euroKilo = parseScaleData('ST,GS,+ 1.250,750 g\r\n');
      expect(euroKilo).not.toBeNull();
      expect(euroKilo?.weight).toBe(1250.75);

      // 10 Kiloluk külçe takozu
      const heavyIngot = parseScaleData('ST,GS,+ 10,000.000 g\r\n');
      expect(heavyIngot).not.toBeNull();
      expect(heavyIngot?.weight).toBe(10000);
    });

    test('23.9 Özel matrah faturasında nadir ayarların (10K, 9K) matematiksel oranla kusursuz hesabı', () => {
      // 10 gr 10 Ayar takı (10/24 = 0.417 milyem), Has fiyatı 3,000 TL
      const item10K = calculateSpecialMatrixItem({
        name: '10K Tasarım Küpe',
        weight: 10.0,
        carat: 10,
        hasGoldPrice: 3000,
        laborCost: 1500,
      });

      // 10 * 0.417 = 4.17 gr Has
      expect(item10K.pureGoldWeight).toBe(4.17);
      expect(item10K.goldCost).toBe(12510);
      expect(item10K.laborAmount).toBe(1500);
      expect(item10K.kdvAmount).toBe(300);
      expect(item10K.total).toBe(14310);
    });

    test('23.10 Doğrudan satış fiyatında kuruş farkı olmaksızın tam denkleşme garantisi (Zero kuruş drift)', () => {
      // Satış fiyatı: 15,000 TL, Külçe bedeli: 7,956.16 TL -> diff: 7,043.84 TL
      const item = calculateSpecialMatrixItem({
        name: '14K Kolye',
        weight: 4.25,
        carat: 14,
        hasGoldPrice: 3200,
        sellingPrice: 15000,
      });

      // goldCost + laborAmount + kdvAmount tam olarak sellingPrice (15000 TL) etmeli
      expect(Number((item.goldCost + item.laborAmount + item.kdvAmount).toFixed(2))).toBe(15000);
      expect(item.total).toBe(15000);
    });
  });
}
