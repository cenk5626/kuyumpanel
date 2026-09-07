import { describe, test, expect, setTestContext } from '../helpers/test-utils';
import {
  LOYALTY_TIERS,
  LOYALTY_TIER_CONFIG,
  RFM_SEGMENTS,
  RFM_SEGMENT_CONFIG,
  SPECIAL_DAY_TYPES,
  LOYALTY_ACTION_TYPES,
  LOYALTY_DEFAULTS,
  LoyaltyTier,
} from '../../src/constants/loyalty';
import {
  calculateRfmScoreAndSegment,
  calculateLoyaltyTier,
  calculatePointsEarned,
  calculatePointsRedemption,
  generateSpecialDayWhatsAppMessage,
  generateDepositReceiptNumber,
} from '../../src/lib/loyalty/rfm-engine';

export function registerF29LoyaltyRfmSpecialDaysTests(): void {
  setTestContext(
    'Tier 1',
    29,
    'Customer Loyalty, Points, RFM Segmentation & Special Days',
    'F29: Loyalty & RFM'
  );

  describe('Feature 29: Customer Loyalty, Points, RFM & Special Days (Tier 1)', () => {
    // -------------------------------------------------------------
    // 1. Sabitler ve Enums Doğrulama
    // -------------------------------------------------------------
    test('F29-01: Sadakat kademeleri, RFM segmentleri ve özel gün sabitleri eksiksiz tanımlanmalıdır', () => {
      expect(LOYALTY_TIERS.BRONZE).toBe('BRONZE');
      expect(LOYALTY_TIERS.SILVER).toBe('SILVER');
      expect(LOYALTY_TIERS.GOLD).toBe('GOLD');
      expect(LOYALTY_TIERS.PLATINUM).toBe('PLATINUM');

      expect(RFM_SEGMENTS.CHAMPIONS).toBe('CHAMPIONS');
      expect(RFM_SEGMENTS.LOYAL_CUSTOMERS).toBe('LOYAL_CUSTOMERS');
      expect(RFM_SEGMENTS.POTENTIAL_LOYALISTS).toBe('POTENTIAL_LOYALISTS');
      expect(RFM_SEGMENTS.AT_RISK).toBe('AT_RISK');
      expect(RFM_SEGMENTS.HIBERNATING).toBe('HIBERNATING');
      expect(RFM_SEGMENTS.LOST).toBe('LOST');
      expect(RFM_SEGMENTS.NEW_CUSTOMERS).toBe('NEW_CUSTOMERS');

      expect(SPECIAL_DAY_TYPES.BIRTHDAY).toBe('BIRTHDAY');
      expect(SPECIAL_DAY_TYPES.WEDDING_ANNIVERSARY).toBe('WEDDING_ANNIVERSARY');

      expect(LOYALTY_ACTION_TYPES.EARN).toBe('EARN');
      expect(LOYALTY_ACTION_TYPES.REDEEM).toBe('REDEEM');

      expect(LOYALTY_DEFAULTS.POINT_TL_CONVERSION_RATE).toBe(1.0);
      expect(LOYALTY_DEFAULTS.MAX_REDEMPTION_RATIO).toBe(0.5);
    });

    test('F29-02: Her sadakat kademesinin kazanım oranı ve harcama baremi tutarlı olmalıdır', () => {
      expect(LOYALTY_TIER_CONFIG.BRONZE.earnRate).toBe(0.01);
      expect(LOYALTY_TIER_CONFIG.SILVER.earnRate).toBe(0.015);
      expect(LOYALTY_TIER_CONFIG.GOLD.earnRate).toBe(0.02);
      expect(LOYALTY_TIER_CONFIG.PLATINUM.earnRate).toBe(0.03);

      expect(LOYALTY_TIER_CONFIG.BRONZE.minSpendTL).toBe(0);
      expect(LOYALTY_TIER_CONFIG.SILVER.minSpendTL).toBe(50000);
      expect(LOYALTY_TIER_CONFIG.GOLD.minSpendTL).toBe(150000);
      expect(LOYALTY_TIER_CONFIG.PLATINUM.minSpendTL).toBe(500000);
    });

    // -------------------------------------------------------------
    // 2. Sadakat Kademesi ve Puan Kazanım / Harcama Mantığı
    // -------------------------------------------------------------
    test('F29-03: Kümülatif ciroya göre müşterinin sadakat kademesi doğru belirlenmelidir', () => {
      expect(calculateLoyaltyTier(25000)).toBe(LOYALTY_TIERS.BRONZE);
      expect(calculateLoyaltyTier(50000)).toBe(LOYALTY_TIERS.SILVER);
      expect(calculateLoyaltyTier(160000)).toBe(LOYALTY_TIERS.GOLD);
      expect(calculateLoyaltyTier(750000)).toBe(LOYALTY_TIERS.PLATINUM);
    });

    test('F29-04: Kademeye göre satıştan kazanılan ParaPuan ve TL değeri doğru hesaplanmalıdır', () => {
      // 10,000 TL harcayan Bronz müşteri (%1) -> 100 Puan (100 TL)
      const bronzeEarn = calculatePointsEarned(10000, LOYALTY_TIERS.BRONZE);
      expect(bronzeEarn.points).toBe(100);
      expect(bronzeEarn.tlValue).toBe(100);

      // 10,000 TL harcayan Platin müşteri (%3) -> 300 Puan (300 TL)
      const platEarn = calculatePointsEarned(10000, LOYALTY_TIERS.PLATINUM);
      expect(platEarn.points).toBe(300);
      expect(platEarn.tlValue).toBe(300);
    });

    test('F29-05: Puan harcamada sepetin maksimum %50 kuralı ve bakiye düşümü korunmalıdır', () => {
      // Sepet: 2,000 TL -> Maksimum indirim %50 = 1,000 TL (1,000 Puan)
      // Müşterinin 1,500 puanı varsa en fazla 1,000 puan kullanabilir
      const res1 = calculatePointsRedemption({
        availablePoints: 1500,
        totalCartTL: 2000,
      });

      expect(res1.usedPoints).toBe(1000);
      expect(res1.discountTL).toBe(1000);
      expect(res1.remainingPoints).toBe(500);

      // Müşterinin 300 puanı varsa tamamını (300 puan) kullanabilir
      const res2 = calculatePointsRedemption({
        availablePoints: 300,
        totalCartTL: 2000,
      });

      expect(res2.usedPoints).toBe(300);
      expect(res2.discountTL).toBe(300);
      expect(res2.remainingPoints).toBe(0);
    });

    // -------------------------------------------------------------
    // 3. RFM Skorlama ve Segmentasyon Karar Ağacı
    // -------------------------------------------------------------
    test('F29-06: Sık gelen ve yüksek harcayan müşteri Şampiyonlar (CHAMPIONS) segmentine atanmalıdır', () => {
      const rfm = calculateRfmScoreAndSegment({
        recencyDays: 15,
        frequency: 10,
        monetaryTL: 250000,
      });

      expect(rfm.rScore).toBe(5);
      expect(rfm.fScore).toBe(5);
      expect(rfm.mScore).toBe(5);
      expect(rfm.totalScore).toBe(555);
      expect(rfm.segment).toBe(RFM_SEGMENTS.CHAMPIONS);
    });

    test('F29-07: İlk kez veya yeni alışveriş yapan müşteri Yeni Müşteriler segmentine atanmalıdır', () => {
      const rfm = calculateRfmScoreAndSegment({
        recencyDays: 10,
        frequency: 1,
        monetaryTL: 15000,
      });

      expect(rfm.segment).toBe(RFM_SEGMENTS.NEW_CUSTOMERS);
    });

    test('F29-08: Eskiden sık gelen ama 200 gündür gelmeyen müşteri Risk Altındakiler segmentine atanmalıdır', () => {
      const rfm = calculateRfmScoreAndSegment({
        recencyDays: 200,
        frequency: 7,
        monetaryTL: 85000,
      });

      expect(rfm.rScore).toBe(2);
      expect(rfm.segment).toBe(RFM_SEGMENTS.AT_RISK);
    });

    // -------------------------------------------------------------
    // 4. Özel Günler & WhatsApp Mesaj Üretimi
    // -------------------------------------------------------------
    test('F29-09: Doğum günü WhatsApp mesajı kişiselleştirilmiş kutlama ve hediye puan metnini içermelidir', () => {
      const msg = generateSpecialDayWhatsAppMessage({
        customerName: 'Ayşe Hanım',
        specialDayType: SPECIAL_DAY_TYPES.BIRTHDAY,
        giftPoints: 250,
        discountCode: 'DOGUM250',
      });

      expect(msg).toContain('Ayşe Hanım');
      expect(msg).toContain('İyi ki Doğdunuz');
      expect(msg).toContain('250 ParaPuan');
      expect(msg).toContain('DOGUM250');
    });

    test('F29-10: Emanet altın teslim fiş numarası EMT-YYYY-XXXX formatında ardışık üretilmelidir', () => {
      const currentYear = new Date().getFullYear();
      const depNo = generateDepositReceiptNumber(1);
      expect(depNo).toBe(`EMT-${currentYear}-0001`);
    });
  });
}
