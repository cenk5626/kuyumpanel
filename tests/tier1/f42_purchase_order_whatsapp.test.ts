import { describe, it, test, expect, setTestContext } from '../helpers/test-utils';
import {
  PURCHASE_ORDER_STATUS,
  PURCHASE_ORDER_STATUS_LABELS,
  PO_MESSAGE_PROVIDER,
  PO_MESSAGE_STATUS,
} from '../../src/constants/purchase-order';
import {
  normalizePhoneNumber,
  formatPurchaseOrderWhatsAppMessage,
  buildWhatsAppIntentUrl,
} from '../../src/lib/purchase-order/whatsapp-order';

export function registerF42PurchaseOrderWhatsAppTests() {
  setTestContext(
    'Tier 1',
    42,
    'Wholesale Purchase Order & WhatsApp',
    'F42: Toptancı Sipariş Takibi & WhatsApp Fiş İletimi'
  );

  describe('Feature 42 - Toptancı Sipariş Takibi ve WhatsApp Fiş İletimi', () => {
    test('42.1 Should normalize Turkish phone numbers for international WhatsApp standard (90...)', () => {
      // 0532 123 45 67 -> 905321234567
      expect(normalizePhoneNumber('0532 123 45 67')).toBe('905321234567');
      // 5321234567 -> 905321234567
      expect(normalizePhoneNumber('5321234567')).toBe('905321234567');
      // +90 532 123 45 67 -> 905321234567
      expect(normalizePhoneNumber('+90 532 123 45 67')).toBe('905321234567');
      // 905321234567 -> 905321234567
      expect(normalizePhoneNumber('905321234567')).toBe('905321234567');
    });

    test('42.2 Should format purchase order WhatsApp message with lines, weights and amounts', () => {
      const orderData = {
        orderNumber: 'PO-2026-0042',
        orderDate: new Date('2026-09-09T10:00:00.000Z'),
        expectedDeliveryDate: new Date('2026-09-12T10:00:00.000Z'),
        supplierName: 'Ahlatcı Altın Toptan',
        dealerName: 'Kuyumcu Cenk',
        totalEstimatedWeight: 150.75,
        totalEstimatedHas: 138.69,
        lines: [
          { productCategory: 'BILEZIK', description: '22K Ajda Bilezik', orderedQuantity: 5, orderedWeight: 100.25, carat: 22 },
          { productCategory: 'YUZUK', description: '14K Baget Yüzük', orderedQuantity: 10, orderedWeight: 50.50, carat: 14 },
        ],
        notes: 'Öğleden önce teslim edilmesi rica olunur.',
      };

      const message = formatPurchaseOrderWhatsAppMessage(orderData);

      expect(message).toContain('PO-2026-0042');
      expect(message).toContain('Ahlatcı Altın Toptan');
      expect(message).toContain('22K Ajda Bilezik');
      expect(message).toContain('150.75');
      expect(message).toContain('138.69 gr Has');
      expect(message).toContain('Öğleden önce teslim');
    });

    test('42.3 Should build valid WhatsApp intent URL with url-encoded message payload', () => {
      const phone = '0532 999 88 77';
      const text = 'Sipariş No: PO-2026-0001\nToplam: 100 gr';

      const url = buildWhatsAppIntentUrl(phone, text);

      expect(url).toContain('https://wa.me/905329998877');
      expect(url).toContain('text=');
      expect(url).toContain(encodeURIComponent('Sipariş No: PO-2026-0001'));
    });

    test('42.4 Should define all enterprise purchase order statuses and labels', () => {
      expect(PURCHASE_ORDER_STATUS.DRAFT).toBe('DRAFT');
      expect(PURCHASE_ORDER_STATUS.SENT_TO_SUPPLIER).toBe('SENT_TO_SUPPLIER');
      expect(PURCHASE_ORDER_STATUS.PARTIALLY_RECEIVED).toBe('PARTIALLY_RECEIVED');
      expect(PURCHASE_ORDER_STATUS.RECEIVED).toBe('RECEIVED');
      expect(PURCHASE_ORDER_STATUS.CANCELLED).toBe('CANCELLED');

      expect(PURCHASE_ORDER_STATUS_LABELS[PURCHASE_ORDER_STATUS.SENT_TO_SUPPLIER]).toBe('Toptancıya İletildi');
      expect(PURCHASE_ORDER_STATUS_LABELS[PURCHASE_ORDER_STATUS.RECEIVED]).toContain('Teslim Alındı');
    });

    test('42.5 Should support wholesale message providers (WEB_INTENT, CLOUD_API, GATEWAY)', () => {
      expect(PO_MESSAGE_PROVIDER.WEB_INTENT).toBe('WEB_INTENT');
      expect(PO_MESSAGE_PROVIDER.CLOUD_API).toBe('CLOUD_API');
      expect(PO_MESSAGE_PROVIDER.GATEWAY).toBe('GATEWAY');

      expect(PO_MESSAGE_STATUS.SENT).toBe('SENT');
      expect(PO_MESSAGE_STATUS.FAILED).toBe('FAILED');
    });
  });
}
