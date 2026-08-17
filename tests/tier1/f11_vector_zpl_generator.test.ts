import { describe, it, test, expect, setTestContext } from '../helpers/test-utils';
import { generateKelebekZPL, LabelData } from '../helpers/domain-engines';

export function registerF11Tests() {
  setTestContext('Tier 1', 11, 'Canvas/SVG & ZPL II Generator', 'F11: ZPL II Thermal Printer Commands');

  describe('Feature 11 - ZPL-II Thermal Printer Command Stream Generation', () => {
    const item: LabelData = {
      barcode: '22BLZ0055',
      title: '22K Ajda Bilezik',
      carat: 22,
      weight: 15.20,
      priceTL: 48000,
    };

    test('11.1 Should generate valid ZPL transaction boundary markers (^XA and ^XZ)', () => {
      const zpl = generateKelebekZPL(item, 203);
      expect(zpl.startsWith('^XA')).toBe(true);
      expect(zpl.endsWith('^XZ')).toBe(true);
    });

    test('11.2 Should include Code 128 barcode command (^BC) for right wing', () => {
      const zpl = generateKelebekZPL(item, 203);
      expect(zpl).toContain('^BCN');
      expect(zpl).toContain(`^FD${item.barcode}^FS`);
    });

    test('11.3 Should format carat and weight on left wing', () => {
      const zpl = generateKelebekZPL(item, 203);
      expect(zpl).toContain('22K 15.20 gr');
      expect(zpl).toContain('22K Ajda Bilezik');
    });

    test('11.4 Should support 203 DPI and 300 DPI dot scaling', () => {
      const zpl203 = generateKelebekZPL(item, 203);
      const zpl300 = generateKelebekZPL(item, 300);

      // 74mm * 8 dpmm = ~592 dots for 203 DPI
      expect(zpl203).toContain('^PW592');
      // 74mm * 11.811 dpmm = ~874 dots for 300 DPI
      expect(zpl300).toContain('^PW874');
    });

    test('11.5 Should include field origin coordinates (^FO) separating left and right wings', () => {
      const zpl = generateKelebekZPL(item, 203);
      expect(zpl).toContain('^FO16'); // left wing x ~ 2mm * 8 = 16
      expect(zpl).toContain('^FO376'); // right wing x ~ (29 + 16 + 2)mm * 8 = 376
    });
  });
}
