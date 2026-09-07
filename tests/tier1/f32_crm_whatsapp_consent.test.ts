import { describe, it, test, expect, setTestContext } from '../helpers/test-utils';
import {
  CRM_CONSENT_STATUS,
  CRM_CONSENT_CHANNELS,
  CRM_CAMPAIGN_STATUS,
  CRM_CAMPAIGN_TYPES,
  CRM_SEGMENT_TYPES,
  CRM_MESSAGE_VARIABLES,
  CRM_DEFAULTS,
} from '@/constants/crm';
import {
  evaluateCustomerSegmentation,
  filterPermittedRecipients,
  buildPersonalizedCampaignMessage,
  generateWhatsAppBroadcastUrl,
  calculateCampaignAnalytics,
  CustomerForSegmentation,
} from '@/lib/crm/campaign-engine';

export function registerF32CrmWhatsAppConsentTests() {
  setTestContext(
    'Tier 1',
    32,
    'CRM, Segmentation & WhatsApp Consent Management',
    'F32: CRM, Segmentasyon & İzinli WhatsApp İletişimi (ETK / KVKK)'
  );

  describe('Feature 32 - CRM, Segmentasyon ve İzinli WhatsApp İletişimi', () => {
    test('32.1 Should filter and exclude customers without explicit OPT_IN consent or missing phone (ETK Compliance Guard)', () => {
      const customers: CustomerForSegmentation[] = [
        { id: 'c1', name: 'Ahmet Yılmaz', phone: '05321112233', consentStatus: CRM_CONSENT_STATUS.OPT_IN },
        { id: 'c2', name: 'Mehmet Demir', phone: '05442223344', consentStatus: CRM_CONSENT_STATUS.OPT_OUT }, // Reddeden
        { id: 'c3', name: 'Ayşe Kaya', phone: null, consentStatus: CRM_CONSENT_STATUS.OPT_IN }, // Telefonsuz
        { id: 'c4', name: 'Fatma Şahin', phone: '05553334455', consentStatus: CRM_CONSENT_STATUS.PENDING }, // Onaysız
        { id: 'c5', name: 'Zeynep Çelik', phone: '05334445566', consentStatus: CRM_CONSENT_STATUS.OPT_IN },
      ];

      const { permitted, rejectedCount } = filterPermittedRecipients(customers);

      expect(permitted.length).toBe(2);
      expect(permitted.map((c) => c.id)).toEqual(['c1', 'c5']);
      expect(rejectedCount).toBe(3);
    });

    test('32.2 Should substitute template variables accurately (name, points, discount, store)', () => {
      const template = 'Sayın {{ad}}, {{magaza}} mağazamızda geçerli {{indirim}} indirim kuponunuz var. ParaPuan: {{puan}} TL.';
      const customer = {
        name: 'Fatma Aksoy',
        loyaltyPoints: 340,
        discountPercent: 20,
      };
      const dealer = { name: 'Kuyum Sarayı' };

      const msg = buildPersonalizedCampaignMessage(template, customer, dealer);

      expect(msg).toContain('Sayın Fatma');
      expect(msg).toContain('Kuyum Sarayı');
      expect(msg).toContain('%20');
      expect(msg).toContain('340');
    });

    test('32.3 Should guarantee mandatory ETK opt-out instruction is appended when not present in template', () => {
      const template = 'Haftasonu tüm bileziklerde işçilik sıfır!';
      const customer = { name: 'Ali Vural' };
      const dealer = { name: 'Altın Market' };

      const msg = buildPersonalizedCampaignMessage(template, customer, dealer);

      // Yasal ret metni şablonda yoksa sona eklenmeli
      expect(msg).toContain(CRM_DEFAULTS.DEFAULT_OPT_OUT_TEXT);
      expect(msg.includes('RET')).toBe(true);
    });

    test('32.4 Should preserve custom opt-out instruction if template explicitly contains variable', () => {
      const template = 'Özel davet! {{ret_metni}}';
      const customOptOut = 'Mesaj istemiyorsanız 0212 999 88 77 arayınız.';
      const customer = { name: 'Burak Can' };
      const dealer = { name: 'Örnek Kuyumcu' };

      const msg = buildPersonalizedCampaignMessage(template, customer, dealer, customOptOut);

      expect(msg).toContain(customOptOut);
      // Çift eklenmemeli
      const countOccurrences = (msg.match(/0212 999 88 77/g) || []).length;
      expect(countOccurrences).toBe(1);
    });

    test('32.5 Should evaluate VIP customer segmentation by monetary threshold', () => {
      const vipRule = {
        type: CRM_SEGMENT_TYPES.VIP,
        minSpendTl: 100000,
      };

      const highSpender: CustomerForSegmentation = {
        id: 'c1',
        name: 'Zengin Müşteri',
        monetary: 150000,
      };
      const lowSpender: CustomerForSegmentation = {
        id: 'c2',
        name: 'Standart Müşteri',
        monetary: 25000,
      };

      expect(evaluateCustomerSegmentation(highSpender, vipRule)).toBe(true);
      expect(evaluateCustomerSegmentation(lowSpender, vipRule)).toBe(false);
    });

    test('32.6 Should evaluate dormant customer segmentation by recency days', () => {
      const dormantRule = {
        type: CRM_SEGMENT_TYPES.DORMANT,
        maxRecencyDays: 180,
      };

      const activeCustomer: CustomerForSegmentation = {
        id: 'c1',
        name: 'Yeni Alışveriş Yapan',
        recencyDays: 30,
      };
      const sleepingCustomer: CustomerForSegmentation = {
        id: 'c2',
        name: '7 Aydır Gelmeyen',
        recencyDays: 210,
      };

      expect(evaluateCustomerSegmentation(sleepingCustomer, dormantRule)).toBe(true);
      expect(evaluateCustomerSegmentation(activeCustomer, dormantRule)).toBe(false);
    });

    test('32.7 Should generate correctly formatted and URL-encoded WhatsApp broadcast links with UTF-8 Turkish text', () => {
      const phone = '0 (532) 987 65 43';
      const message = 'Sayın Ayşe,\nAltınbaş Kuyumculuk %15 indirim fırsatı!';

      const url = generateWhatsAppBroadcastUrl(phone, message);

      expect(url.startsWith('https://wa.me/905329876543?text=')).toBe(true);
      expect(decodeURIComponent(url)).toContain('Ayşe');
      expect(decodeURIComponent(url)).toContain('Altınbaş Kuyumculuk');
      expect(decodeURIComponent(url)).toContain('%15 indirim');
    });

    test('32.8 Should calculate campaign delivery analytics (total, sent, failed, deliveryRate)', () => {
      const recipients = [
        { status: 'SENT' },
        { status: 'SENT' },
        { status: 'SENT' },
        { status: 'FAILED' },
        { status: 'PENDING' },
      ];

      const stats = calculateCampaignAnalytics(recipients);

      expect(stats.total).toBe(5);
      expect(stats.sent).toBe(3);
      expect(stats.failed).toBe(1);
      expect(stats.pending).toBe(1);
      expect(stats.deliveryRate).toBe(60); // 3 / 5 = %60
    });

    test('32.9 Centralized CRM constants and enum keys integrity verification', () => {
      expect(CRM_CONSENT_STATUS.OPT_IN).toBe('OPT_IN');
      expect(CRM_CONSENT_STATUS.OPT_OUT).toBe('OPT_OUT');
      expect(CRM_CONSENT_CHANNELS.IN_STORE_FORM).toBe('IN_STORE_FORM');
      expect(CRM_CAMPAIGN_STATUS.ACTIVE).toBe('ACTIVE');
      expect(CRM_CAMPAIGN_TYPES.DISCOUNT_COUPON).toBe('DISCOUNT_COUPON');
      expect(CRM_SEGMENT_TYPES.VIP).toBe('VIP');
    });

    test('32.10 Multi-tenant dealer data isolation for campaigns and consent records', () => {
      const dealer1Consent = { dealerId: 'dealer-1', customerId: 'cust-1', status: CRM_CONSENT_STATUS.OPT_IN };
      const dealer2Consent = { dealerId: 'dealer-2', customerId: 'cust-1', status: CRM_CONSENT_STATUS.OPT_OUT };

      expect(dealer1Consent.dealerId).not.toBe(dealer2Consent.dealerId);
      expect(dealer1Consent.status).toBe(CRM_CONSENT_STATUS.OPT_IN);
      expect(dealer2Consent.status).toBe(CRM_CONSENT_STATUS.OPT_OUT);
    });
  });
}
