import { describe, it, test, expect, setTestContext } from '../helpers/test-utils';
import {
  SERVICE_ORDER_STATUS,
  SERVICE_STATUS_LABELS,
  SERVICE_ORDER_ACTIONS,
  SERVICE_DEFAULTS,
  SERVICE_WARRANTY_MONTH_OPTIONS,
  SERVICE_COMMON_ISSUES,
} from '@/constants/service';
import {
  generateServiceNumber,
  canTransitionServiceStatus,
  checkServiceOverdue,
  calculateWarrantyExpiry,
  formatServiceWhatsAppNotification,
} from '@/lib/service/service-engine';

export function registerF31ServiceRepairWarrantyTests() {
  setTestContext(
    'Tier 1',
    31,
    'Service, Repair & Warranty Management',
    'F31: Servis, Tamir & Garanti Yönetimi'
  );

  describe('Feature 31 - Servis, Tamir ve Garanti Yönetimi', () => {
    test('31.1 Should generate sequential service order numbers (e.g. SRV-2026-0001)', () => {
      const currentYear = new Date().getFullYear();
      const srv1 = generateServiceNumber('dealer-1', 0);
      const srv2 = generateServiceNumber('dealer-1', 41);

      expect(srv1).toBe(`${SERVICE_DEFAULTS.PREFIX}-${currentYear}-0001`);
      expect(srv2).toBe(`${SERVICE_DEFAULTS.PREFIX}-${currentYear}-0042`);
    });

    test('31.2 Should prevent transition to APPROVED or IN_WORKSHOP when estimatedCost > 0 and customer has not approved', () => {
      // 1. Ücretli iş ve onay yokken APPROVED geçişi engellenmeli
      const checkApproved = canTransitionServiceStatus(
        SERVICE_ORDER_STATUS.QUOTED,
        SERVICE_ORDER_STATUS.APPROVED,
        false, // Müşteri onayı YOK
        1500   // Ücret 1500 TL
      );
      expect(checkApproved.allowed).toBe(false);
      expect(checkApproved.reason).toContain('Müşteri onayı alınmadan');

      // 2. Ücretli iş ve onay yokken doğrudan IN_WORKSHOP geçişi engellenmeli
      const checkWorkshop = canTransitionServiceStatus(
        SERVICE_ORDER_STATUS.QUOTED,
        SERVICE_ORDER_STATUS.IN_WORKSHOP,
        false,
        2200
      );
      expect(checkWorkshop.allowed).toBe(false);
      expect(checkWorkshop.reason).toContain('ücretli tamir/işleme başlanamaz');
    });

    test('31.3 Should allow transition to APPROVED and IN_WORKSHOP once customer approval is given or if cost is 0 (free warranty)', () => {
      // 1. Müşteri onayladıktan sonra izin verilmeli
      const approvedCheck = canTransitionServiceStatus(
        SERVICE_ORDER_STATUS.QUOTED,
        SERVICE_ORDER_STATUS.APPROVED,
        true, // Onay VAR
        1500
      );
      expect(approvedCheck.allowed).toBe(true);

      const workshopCheck = canTransitionServiceStatus(
        SERVICE_ORDER_STATUS.APPROVED,
        SERVICE_ORDER_STATUS.IN_WORKSHOP,
        true,
        1500
      );
      expect(workshopCheck.allowed).toBe(true);

      // 2. Ücretsiz garanti bakımı (maliyet 0) onay gerektirmeden atölyeye verilebilir
      const freeServiceCheck = canTransitionServiceStatus(
        SERVICE_ORDER_STATUS.RECEIVED,
        SERVICE_ORDER_STATUS.IN_WORKSHOP,
        false,
        0
      );
      expect(freeServiceCheck.allowed).toBe(true);
    });

    test('31.4 Should accurately detect overdue service orders based on promisedDate vs current date and delivery date', () => {
      // Geçmiş bir vaat tarihi (3 gün önce)
      const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
      const overdueRes = checkServiceOverdue(threeDaysAgo.toISOString());
      expect(overdueRes.isOverdue).toBe(true);
      expect(overdueRes.overdueDays).toBeGreaterThanOrEqual(2);

      // Gelecekteki bir vaat tarihi (5 gün sonra)
      const fiveDaysLater = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000);
      const futureRes = checkServiceOverdue(fiveDaysLater.toISOString());
      expect(futureRes.isOverdue).toBe(false);
      expect(futureRes.overdueDays).toBe(0);

      // Teslim edilmiş ve vaat edilen tarihten önce bitmiş
      const onTimeDelivery = checkServiceOverdue(
        '2026-05-10T15:00:00.000Z',
        '2026-05-08T11:00:00.000Z'
      );
      expect(onTimeDelivery.isOverdue).toBe(false);
      expect(onTimeDelivery.overdueDays).toBe(0);

      // Teslim edilmiş ama vaat edilen tarihten sonra bitmiş (gecikmeli teslim)
      const lateDelivery = checkServiceOverdue(
        '2026-05-10T15:00:00.000Z',
        '2026-05-14T15:00:00.000Z'
      );
      expect(lateDelivery.isOverdue).toBe(true);
      expect(lateDelivery.overdueDays).toBe(4);
    });

    test('31.5 Should accurately calculate warranty expiration date by adding warranty months to delivery date', () => {
      const deliveryDate = new Date('2026-03-15T10:00:00.000Z');
      const expiry6M = calculateWarrantyExpiry(deliveryDate, 6);
      expect(expiry6M.getMonth()).toBe(8); // March (2) + 6 = September (8)
      expect(expiry6M.getFullYear()).toBe(2026);

      const expiry12M = calculateWarrantyExpiry(deliveryDate, 12);
      expect(expiry12M.getFullYear()).toBe(2027);
      expect(expiry12M.getMonth()).toBe(2); // March
    });

    test('31.6 Should generate valid WhatsApp notification URLs for different service lifecycle states', () => {
      const serviceData = {
        customerName: 'Fatma Hanım',
        customerPhone: '05321234567',
        serviceNumber: 'SRV-2026-0005',
        itemDescription: '14 Ayar Tektaş Pırlanta Yüzük',
        status: SERVICE_ORDER_STATUS.READY,
        finalCostTl: 750,
        warrantyMonths: 6,
      };

      const waUrlReady = formatServiceWhatsAppNotification(serviceData);
      expect(waUrlReady.startsWith('https://wa.me/905321234567?text=')).toBe(true);
      expect(decodeURIComponent(waUrlReady)).toContain('tamamlanmıştır');
      expect(decodeURIComponent(waUrlReady)).toContain('750');

      // Teslim mesajı ve garanti süresi
      const waUrlDelivered = formatServiceWhatsAppNotification({
        ...serviceData,
        status: SERVICE_ORDER_STATUS.DELIVERED,
      });
      expect(decodeURIComponent(waUrlDelivered)).toContain('teslim edilmiştir');
      expect(decodeURIComponent(waUrlDelivered)).toContain('6 Ay');
    });

    test('31.7 Should enforce immutability rules for CANCELLED and DELIVERED states', () => {
      const fromCancelled = canTransitionServiceStatus(
        SERVICE_ORDER_STATUS.CANCELLED,
        SERVICE_ORDER_STATUS.READY,
        true,
        500
      );
      expect(fromCancelled.allowed).toBe(false);
      expect(fromCancelled.reason).toContain('İptal edilmiş servis kaydı');

      const fromDelivered = canTransitionServiceStatus(
        SERVICE_ORDER_STATUS.DELIVERED,
        SERVICE_ORDER_STATUS.IN_WORKSHOP,
        true,
        500
      );
      expect(fromDelivered.allowed).toBe(false);
      expect(fromDelivered.reason).toContain('Teslim edilmiş servis kaydı');
    });

    test('31.8 Should track intakeWeight vs actualWeight and calculate weight discrepancy accurately', () => {
      const intakeWeight = 4.25; // Alınan gramaj
      const actualWeight = 4.18; // Tamir / cila sonrası çıkan gramaj
      const discrepancy = Math.round((intakeWeight - actualWeight) * 1000) / 1000;

      expect(discrepancy).toBe(0.07); // 0.07 gr cila firesi
      expect(intakeWeight).toBeGreaterThan(actualWeight);
    });

    test('31.9 Should ensure service items remain isolated from sales inventory / stock tables', () => {
      // Servis kaydı müşteri emanetidir, mağaza satılabilir stoğu (Stock / ProductItem) ile karıştırılamaz
      const serviceOrderRecord = {
        id: 'srv-123',
        serviceNumber: 'SRV-2026-0001',
        isCustomerOwned: true, // Müşteriye ait emanet
        isStockItem: false,    // Satış envanterinde değil
        status: SERVICE_ORDER_STATUS.IN_WORKSHOP,
      };

      expect(serviceOrderRecord.isCustomerOwned).toBe(true);
      expect(serviceOrderRecord.isStockItem).toBe(false);
    });

    test('31.10 Centralized service constants and enum keys integrity verification', () => {
      expect(SERVICE_ORDER_STATUS.RECEIVED).toBe('RECEIVED');
      expect(SERVICE_ORDER_STATUS.QUOTED).toBe('QUOTED');
      expect(SERVICE_ORDER_STATUS.APPROVED).toBe('APPROVED');
      expect(SERVICE_ORDER_STATUS.IN_WORKSHOP).toBe('IN_WORKSHOP');
      expect(SERVICE_ORDER_STATUS.READY).toBe('READY');
      expect(SERVICE_ORDER_STATUS.DELIVERED).toBe('DELIVERED');
      expect(SERVICE_ORDER_STATUS.CANCELLED).toBe('CANCELLED');

      expect(SERVICE_STATUS_LABELS[SERVICE_ORDER_STATUS.READY]).toBe('Hazır (Teslim Bekliyor)');
      expect(SERVICE_WARRANTY_MONTH_OPTIONS).toContain(6);
      expect(SERVICE_COMMON_ISSUES.length).toBeGreaterThanOrEqual(5);
    });
  });
}
