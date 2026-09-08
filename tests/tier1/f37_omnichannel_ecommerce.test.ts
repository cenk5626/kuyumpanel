import { describe, it, test, expect, setTestContext } from '../helpers/test-utils';
import {
  CHANNEL_TYPE,
  EXTERNAL_ORDER_STATUS,
  OMNICHANNEL_DEFAULTS,
  OMNICHANNEL_ERRORS,
} from '@/constants/omnichannel';
import {
  calculateChannelSellingPrice,
  checkOversellRisk,
  parseExternalOrderPayload,
  formatOmnichannelOrderWhatsAppNotification,
} from '@/lib/omnichannel/omnichannel-engine';

export function registerF37OmnichannelEcommerceTests() {
  setTestContext(
    'Tier 1',
    37,
    'Omnichannel E-Commerce & Oversell Prevention',
    'F37: E-Ticaret ve Çoklu Kanal Satış Entegrasyonu'
  );

  describe('Feature 37 - E-Ticaret ve Pazaryeri Çoklu Kanal Entegrasyonu', () => {
    test('37.1 calculateChannelSellingPrice should add markup percent and round to nearest 10 TL', () => {
      // 1000 TL baz fiyat + %15 Trendyol komisyonu = 1150 TL
      const price1 = calculateChannelSellingPrice(1000, 15, 0);
      expect(price1).toBe(1150);

      // 1003 TL baz fiyat + %15 = 1153.45 TL => En yakın 10 TL yukarı yuvarla => 1160 TL
      const price2 = calculateChannelSellingPrice(1003, 15, 0);
      expect(price2).toBe(1160);
    });

    test('37.2 calculateChannelSellingPrice should apply live gold rate increase on base price before markup', () => {
      // 10.000 TL baz fiyat, altın kuru anlık %5 arttı, %10 pazar yeri marjı
      // 10.000 * 1.05 = 10.500 TL
      // 10.500 * 1.10 = 11.550 TL
      const price = calculateChannelSellingPrice(10000, 10, 5);
      expect(price).toBe(11550);
    });

    test('37.3 calculateChannelSellingPrice should return 0 for zero or negative base price', () => {
      expect(calculateChannelSellingPrice(0, 15)).toBe(0);
      expect(calculateChannelSellingPrice(-500, 15)).toBe(0);
    });

    test('37.4 checkOversellRisk should flag risk when available stock is 0 or less than pending quantity', () => {
      // Vitrinde 1 adet var, internetten 2 adet isteniyor => Oversell Riski!
      const risk1 = checkOversellRisk(1, 2);
      expect(risk1.isRisk).toBe(true);
      expect(risk1.message).toBe(OMNICHANNEL_ERRORS.OVERSELL_RISK);

      // Vitrinde 0 adet var, internetten 1 adet isteniyor => Oversell Riski!
      const risk2 = checkOversellRisk(0, 1);
      expect(risk2.isRisk).toBe(true);
    });

    test('37.5 checkOversellRisk should allow order when available stock is strictly sufficient', () => {
      // Vitrinde 5 adet var, internetten 2 adet isteniyor => Risk yok, 3 adet kalır
      const result = checkOversellRisk(5, 2);
      expect(result.isRisk).toBe(false);
      expect(result.availableQuantity).toBe(3);
    });

    test('37.6 parseExternalOrderPayload should normalize standard payload format', () => {
      const payload = {
        orderNumber: 'ORD-1001',
        customerName: 'Zeynep Kaya',
        customerPhone: '05551112233',
        totalAmount: 14500,
        items: [
          { barcode: '14KP01', title: '14 Ayar Baget Kolye', quantity: 1, price: 14500 },
        ],
      };

      const parsed = parseExternalOrderPayload('SHOPIFY', payload);
      expect(parsed.orderNumber).toBe('ORD-1001');
      expect(parsed.customerName).toBe('Zeynep Kaya');
      expect(parsed.items.length).toBe(1);
      expect(parsed.items[0].barcode).toBe('14KP01');
    });

    test('37.7 parseExternalOrderPayload should normalize Trendyol-specific webhook lines format', () => {
      const tyPayload = {
        orderNumber: 'TY-9928374',
        customerFirstName: 'Mehmet',
        customerLastName: 'Demir',
        lines: [
          { barcode: '22BLZ01', productName: '22 Ayar Ajda Bilezik', quantity: 2, price: 25000 },
        ],
        shipmentAddress: { phone: '05329998877' },
      };

      const parsed = parseExternalOrderPayload('TRENDYOL', tyPayload);
      expect(parsed.orderNumber).toBe('TY-9928374');
      expect(parsed.customerName).toBe('Mehmet Demir');
      expect(parsed.totalAmount).toBe(50000);
      expect(parsed.items[0].quantity).toBe(2);
    });

    test('37.8 parseExternalOrderPayload should throw error for null or invalid payload', () => {
      expect(() => parseExternalOrderPayload('CUSTOM_WEB', null)).toThrow();
      expect(() => parseExternalOrderPayload('CUSTOM_WEB', {})).toThrow();
    });

    test('37.9 formatOmnichannelOrderWhatsAppNotification should include channel name, order number and urgent physical segregation alert', () => {
      const msg = formatOmnichannelOrderWhatsAppNotification({
        orderNumber: 'TY-882194',
        channelName: 'Trendyol',
        customerName: 'Ayşe Hanım',
        totalAmount: 18500,
        itemCount: 2,
      });

      expect(msg).toContain('*Kanal:* Trendyol');
      expect(msg).toContain('#TY-882194');
      expect(msg).toContain('18.500 TL');
      expect(msg).toContain('çifte satışı önleyiniz');
    });

    test('37.10 calculateChannelSellingPrice with 0% markup should only round to nearest step', () => {
      const price = calculateChannelSellingPrice(1523, 0, 0);
      expect(price).toBe(1530); // 1523 -> 1530
    });
  });
}
