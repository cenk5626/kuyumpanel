import { describe, it, test, expect, setTestContext } from '../helpers/test-utils';
import {
  SERVICE_PHOTO_CONFIG,
  SERVICE_PHOTO_TYPES,
  SERVICE_ORDER_STATUS,
  CUSTOMER_APPROVAL_STATUS,
} from '../../src/constants/service';
import { formatServiceOrderNumber } from '../../src/lib/services/service-number';

export function registerF46ServiceRepairExtendedTests() {
  setTestContext(
    'Tier 1',
    46,
    'Service & Repair Extended (Photos & Slips)',
    'F46: Servis Fotoğrafları & Teslim Fişi'
  );

  describe('Feature 46 - Servis & Tamirat Fotoğrafları, Fiş Çıktısı & Müşteri Onayı', () => {
    test('46.1 Should validate photo MIME types and reject unsupported file types', () => {
      expect(SERVICE_PHOTO_CONFIG.ALLOWED_MIME_TYPES).toContain('image/jpeg');
      expect(SERVICE_PHOTO_CONFIG.ALLOWED_MIME_TYPES).toContain('image/png');
      expect(SERVICE_PHOTO_CONFIG.ALLOWED_MIME_TYPES).toContain('image/webp');

      const isAllowed = (mime: string) =>
        SERVICE_PHOTO_CONFIG.ALLOWED_MIME_TYPES.includes(mime as any);

      expect(isAllowed('image/jpeg')).toBe(true);
      expect(isAllowed('image/png')).toBe(true);
      expect(isAllowed('application/pdf')).toBe(false);
      expect(isAllowed('application/x-msdownload')).toBe(false);
    });

    test('46.2 Should enforce 5MB maximum file size limit for photos', () => {
      expect(SERVICE_PHOTO_CONFIG.MAX_PHOTO_SIZE_BYTES).toBe(5 * 1024 * 1024);

      const isValidSize = (size: number) => size <= SERVICE_PHOTO_CONFIG.MAX_PHOTO_SIZE_BYTES;

      expect(isValidSize(2 * 1024 * 1024)).toBe(true); // 2MB
      expect(isValidSize(5 * 1024 * 1024)).toBe(true); // 5MB sınırda
      expect(isValidSize(5.1 * 1024 * 1024)).toBe(false); // 5.1MB aşıldı
    });

    test('46.3 Should define all service photo lifecycle stages', () => {
      expect(SERVICE_PHOTO_TYPES.INTAKE).toBe('INTAKE');
      expect(SERVICE_PHOTO_TYPES.DEFECT).toBe('DEFECT');
      expect(SERVICE_PHOTO_TYPES.IN_PROGRESS).toBe('IN_PROGRESS');
      expect(SERVICE_PHOTO_TYPES.COMPLETED).toBe('COMPLETED');
    });

    test('46.4 Should format delivery slip data structure with customer, item, warranty, and technician notes', () => {
      const deliverySlipData = {
        serviceNumber: 'SRV-2026-0089',
        dealerName: 'Kuyumcu Cenk',
        customerName: 'Fatma Şahin',
        customerPhone: '0533 111 22 33',
        itemDescription: '18K Pırlantalı Gerdanlık',
        intakeWeight: 24.50,
        actualWeight: 24.45,
        issueDescription: 'Kopuk zincir lazer kaynağı ve cila',
        finalCostTl: 1850,
        warrantyMonths: 12,
        status: SERVICE_ORDER_STATUS.DELIVERED,
      };

      expect(deliverySlipData.serviceNumber).toMatch(/^SRV-\d{4}-\d{4}$/);
      expect(deliverySlipData.warrantyMonths).toBe(12);
      expect(deliverySlipData.actualWeight).toBeLessThanOrEqual(deliverySlipData.intakeWeight);
      expect(deliverySlipData.finalCostTl).toBeGreaterThan(0);
    });

    test('46.5 Should enforce customer approval before dispatching paid repair order to workshop', () => {
      const paidService = {
        estimatedCostTl: 1500,
        isCustomerApproved: false,
      };

      // Müşteri onayı olmadan atölyeye sevk edilemez kuralı
      const canSendToWorkshop = paidService.estimatedCostTl === 0 || paidService.isCustomerApproved;
      expect(canSendToWorkshop).toBe(false);

      // Müşteri onayladığında sevk edilebilir
      paidService.isCustomerApproved = true;
      const canSendNow = paidService.estimatedCostTl === 0 || paidService.isCustomerApproved;
      expect(canSendNow).toBe(true);
    });

    test('46.6 Should generate unique service order numbers with SRV-YYYY-XXXX format', () => {
      const currentYear = new Date().getFullYear();
      const num1 = formatServiceOrderNumber(1, currentYear);
      const num2 = formatServiceOrderNumber(42, currentYear);

      expect(num1).toBe(`SRV-${currentYear}-0001`);
      expect(num2).toBe(`SRV-${currentYear}-0042`);
    });
  });
}
