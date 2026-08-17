import { describe, it, test, expect, setTestContext } from '../helpers/test-utils';
import { generateKelebekZPL, generateKelebekLabelSVG, LabelData } from '../helpers/domain-engines';

export function registerF12Tests() {
  setTestContext('Tier 1', 12, 'Bulk / Batch Label Printing', 'F12: Multi-Item Batch Label Generation');

  describe('Feature 12 - Bulk / Batch Label Generation Engine', () => {
    const batchItems: LabelData[] = [
      { barcode: '14KP01', title: '14K Kolye', carat: 14, weight: 2.5, priceTL: 8000 },
      { barcode: '22BLZ01', title: '22K Bilezik', carat: 22, weight: 20.0, priceTL: 65000 },
      { barcode: '18YZK01', title: '18K Yüzük', carat: 18, weight: 4.2, priceTL: 18000 },
    ];

    test('12.1 Should generate batch ZPL stream containing multiple label blocks', () => {
      const zplStream = batchItems.map(item => generateKelebekZPL(item, 203)).join('\n');
      const startMatches = (zplStream.match(/\^XA/g) || []).length;
      const endMatches = (zplStream.match(/\^XZ/g) || []).length;

      expect(startMatches).toBe(3);
      expect(endMatches).toBe(3);
      expect(zplStream).toContain('14KP01');
      expect(zplStream).toContain('22BLZ01');
      expect(zplStream).toContain('18YZK01');
    });

    test('12.2 Should support quantity multiplier when printing multiple copies of an item', () => {
      const itemWithMultipleCopies = { barcode: '14KP02', title: '14K Zincir', carat: 14, weight: 3.0, priceTL: 9500 };
      const copies = 4;
      const zplCopies = Array.from({ length: copies }, () => generateKelebekZPL(itemWithMultipleCopies, 203)).join('\n');
      const count = (zplCopies.match(/\^XA/g) || []).length;

      expect(count).toBe(4);
    });

    test('12.3 Should generate batch SVG previews for modal viewer', () => {
      const svgList = batchItems.map(item => generateKelebekLabelSVG(item));
      expect(svgList.length).toBe(3);
      for (const svg of svgList) {
        expect(svg).toContain('<svg');
        expect(svg).toContain('class="kelebek-label-vector"');
      }
    });

    test('12.4 Should handle empty selection gracefully with empty output array', () => {
      const emptySelection: LabelData[] = [];
      const batchZpl = emptySelection.map(item => generateKelebekZPL(item)).join('\n');
      expect(batchZpl).toBe('');
    });

    test('12.5 Should maintain item sequence and unique barcode integrity across entire batch', () => {
      const zplStream = batchItems.map(item => generateKelebekZPL(item, 203)).join('\n');
      const pos1 = zplStream.indexOf('14KP01');
      const pos2 = zplStream.indexOf('22BLZ01');
      const pos3 = zplStream.indexOf('18YZK01');

      expect(pos1).toBeLessThan(pos2);
      expect(pos2).toBeLessThan(pos3);
    });
  });
}
