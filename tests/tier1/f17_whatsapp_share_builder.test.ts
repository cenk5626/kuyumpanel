import { describe, it, test, expect, setTestContext } from '../helpers/test-utils';
import {
  buildWhatsAppSaleReceiptUrl,
  normalizePhoneNumber,
  WHATSAPP_CONFIG,
} from '../helpers/domain-engines';

export function registerF17Tests() {
  setTestContext('Tier 1', 17, '1-Click WhatsApp Sharing', 'F17: WhatsApp Link & Receipt Builder');

  describe('Feature 17 - 1-Click WhatsApp Receipt & Statement Builder Engine', () => {
    test('17.1 Should normalize local Turkish phone number starting with 05xx to international 905xx format', () => {
      const normalized = normalizePhoneNumber('0532 123 45 67');
      expect(normalized).toBe('905321234567');
    });

    test('17.2 Should preserve already internationalized numbers without prepending duplicate 90', () => {
      const normalized = normalizePhoneNumber('905321234567');
      expect(normalized).toBe('905321234567');
    });

    test('17.3 Should clean non-digit characters like parentheses and dashes', () => {
      const normalized = normalizePhoneNumber('+90 (555) 987-6543');
      expect(normalized).toBe('905559876543');
    });

    test('17.4 Should build valid WhatsApp click-to-chat URL with encoded receipt message', () => {
      const items = [
        { title: '14K Baget Kolye', carat: 14, weight: 3.5, priceTL: 12000 },
        { title: '22K Ajda Bilezik', carat: 22, weight: 15.0, priceTL: 48000 },
      ];
      const url = buildWhatsAppSaleReceiptUrl('0532 000 00 00', 'Ahmet Yılmaz', items, 60000, '17.08.2026');

      expect(url.startsWith('https://wa.me/905320000000?text=')).toBe(true);
      const decoded = decodeURIComponent(url);
      expect(decoded).toContain('Kuyumcu Panel');
      expect(decoded).toContain('SATIŞ BİLGİ FİŞİ');
      expect(decoded).toContain('Ahmet Yılmaz');
      expect(decoded).toContain('14K Baget Kolye');
      expect(decoded).toContain('60.000 TL');
    });

    test('17.5 Should handle single item receipts properly', () => {
      const items = [{ title: '24K Has Külçe', carat: 24, weight: 1.0, priceTL: 3100 }];
      const url = buildWhatsAppSaleReceiptUrl('05441112233', 'Ayşe Hanım', items, 3100);
      expect(url).toContain('https://wa.me/905441112233');
    });
  });
}
