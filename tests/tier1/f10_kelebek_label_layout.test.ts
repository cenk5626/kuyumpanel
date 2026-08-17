import { describe, it, test, expect, setTestContext } from '../helpers/test-utils';
import { generateKelebekLabelSVG, LABEL_SPECS, LabelData } from '../helpers/domain-engines';

export function registerF10Tests() {
  setTestContext('Tier 1', 10, 'Dual-Wing Kelebek Label Layout', 'F10: 74x12mm Kelebek Vector Layout');

  describe('Feature 10 - Dual-Wing Butterfly Label (74x12mm) SVG Vector Renderer', () => {
    const sampleItem: LabelData = {
      barcode: '14KP00042',
      title: '14K Baget Küpe',
      carat: 14,
      weight: 3.45,
      priceTL: 12500,
      sellingMilyem: 0.585,
    };

    test('10.1 Should generate valid SVG container with exact 74x12mm dimensions', () => {
      const svg = generateKelebekLabelSVG(sampleItem);
      expect(svg).toContain('<svg');
      expect(svg).toContain('viewBox="0 0 74 12"');
      expect(svg).toContain('width="74mm"');
      expect(svg).toContain('height="12mm"');
    });

    test('10.2 Should render Left Wing containing Carat, Weight, and Product Title', () => {
      const svg = generateKelebekLabelSVG(sampleItem);
      expect(svg).toContain('id="left-wing"');
      expect(svg).toContain('14K | 3.45 gr');
      expect(svg).toContain('14K Baget Küpe');
      expect(svg).toContain('M:0.585');
    });

    test('10.3 Should render Right Wing containing Barcode text, Barcode rect, and Price', () => {
      const svg = generateKelebekLabelSVG(sampleItem);
      expect(svg).toContain('id="right-wing"');
      expect(svg).toContain('14KP00042');
      expect(svg).toContain('12.500 TL');
    });

    test('10.4 Should position wings preserving the middle bridge string area', () => {
      const spec = LABEL_SPECS.BUTTERFLY_74x12;
      expect(spec.LEFT_WING_WIDTH_MM).toBe(29);
      expect(spec.BRIDGE_WIDTH_MM).toBe(16);
      expect(spec.RIGHT_WING_WIDTH_MM).toBe(29);
      expect(spec.LEFT_WING_WIDTH_MM + spec.BRIDGE_WIDTH_MM + spec.RIGHT_WING_WIDTH_MM).toBe(74);
    });

    test('10.5 Should render standalone local vector output without external web fonts or CDN links', () => {
      const svg = generateKelebekLabelSVG(sampleItem);
      expect(svg).not.toContain('http://fonts.googleapis.com');
      expect(svg).not.toContain('https://cdn');
      expect(svg).toContain('font-family: Arial');
    });
  });
}
