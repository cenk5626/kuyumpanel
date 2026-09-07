import {
  LOYALTY_TIERS,
  LOYALTY_TIER_CONFIG,
  LoyaltyTier,
  RFM_SEGMENTS,
  RfmSegment,
  SPECIAL_DAY_TYPES,
  SpecialDayType,
  LOYALTY_DEFAULTS,
} from '@/constants/loyalty';
import { roundMoney } from '@/lib/security/validation';

export interface RfmInput {
  recencyDays: number;
  frequency: number;
  monetaryTL: number;
}

export interface RfmResult {
  rScore: number;
  fScore: number;
  mScore: number;
  totalScore: number;
  segment: RfmSegment;
}

/**
 * Müşterinin son alışveriş tarihi (Recency), işlem sıklığı (Frequency)
 * ve toplam harcama tutarına (Monetary) göre RFM skorunu ve segmentini hesaplar.
 */
export function calculateRfmScoreAndSegment(params: RfmInput): RfmResult {
  const { recencyDays, frequency, monetaryTL } = params;

  // 1. Recency Skoru (1 - 5): Daha az gün = Daha yüksek skor
  let rScore = 1;
  if (recencyDays <= 30) rScore = 5;
  else if (recencyDays <= 60) rScore = 4;
  else if (recencyDays <= 120) rScore = 3;
  else if (recencyDays <= 240) rScore = 2;
  else rScore = 1;

  // 2. Frequency Skoru (1 - 5): Daha çok ziyaret/işlem = Daha yüksek skor
  let fScore = 1;
  if (frequency >= 10) fScore = 5;
  else if (frequency >= 6) fScore = 4;
  else if (frequency >= 3) fScore = 3;
  else if (frequency >= 2) fScore = 2;
  else fScore = 1;

  // 3. Monetary Skoru (1 - 5): Daha çok ciro = Daha yüksek skor
  let mScore = 1;
  if (monetaryTL >= 200000) mScore = 5;
  else if (monetaryTL >= 100000) mScore = 4;
  else if (monetaryTL >= 50000) mScore = 3;
  else if (monetaryTL >= 20000) mScore = 2;
  else mScore = 1;

  const totalScore = rScore * 100 + fScore * 10 + mScore;

  // 4. Segment Karar Ağacı
  let segment: RfmSegment = RFM_SEGMENTS.HIBERNATING;

  if (frequency <= 1 && recencyDays <= 60) {
    segment = RFM_SEGMENTS.NEW_CUSTOMERS;
  } else if (rScore >= 4 && fScore >= 4 && mScore >= 4) {
    segment = RFM_SEGMENTS.CHAMPIONS;
  } else if (rScore >= 3 && fScore >= 3) {
    segment = RFM_SEGMENTS.LOYAL_CUSTOMERS;
  } else if (rScore >= 4 && fScore <= 2) {
    segment = RFM_SEGMENTS.POTENTIAL_LOYALISTS;
  } else if (rScore <= 2 && (fScore >= 3 || mScore >= 3)) {
    segment = RFM_SEGMENTS.AT_RISK;
  } else if (rScore <= 2 && fScore <= 2 && mScore <= 2 && recencyDays > 180) {
    segment = RFM_SEGMENTS.LOST;
  } else {
    segment = RFM_SEGMENTS.HIBERNATING;
  }

  return {
    rScore,
    fScore,
    mScore,
    totalScore,
    segment,
  };
}

/**
 * Müşterinin toplam geçmiş harcamasına göre sadakat kademesini belirler.
 */
export function calculateLoyaltyTier(totalLifetimeSpendTL: number): LoyaltyTier {
  if (totalLifetimeSpendTL >= LOYALTY_TIER_CONFIG[LOYALTY_TIERS.PLATINUM].minSpendTL) {
    return LOYALTY_TIERS.PLATINUM;
  }
  if (totalLifetimeSpendTL >= LOYALTY_TIER_CONFIG[LOYALTY_TIERS.GOLD].minSpendTL) {
    return LOYALTY_TIERS.GOLD;
  }
  if (totalLifetimeSpendTL >= LOYALTY_TIER_CONFIG[LOYALTY_TIERS.SILVER].minSpendTL) {
    return LOYALTY_TIERS.SILVER;
  }
  return LOYALTY_TIERS.BRONZE;
}

/**
 * Satış tutarına ve müşterinin sadakat kademesine göre kazanılan ParaPuanı hesaplar.
 */
export function calculatePointsEarned(
  spendTL: number,
  tier: LoyaltyTier = LOYALTY_TIERS.BRONZE
): {
  points: number;
  tlValue: number;
  earnRate: number;
} {
  const tierConfig = LOYALTY_TIER_CONFIG[tier] || LOYALTY_TIER_CONFIG[LOYALTY_TIERS.BRONZE];
  const earnRate = tierConfig.earnRate;
  const points = roundMoney(Math.max(0, spendTL) * earnRate);
  const tlValue = roundMoney(points * LOYALTY_DEFAULTS.POINT_TL_CONVERSION_RATE);

  return {
    points,
    tlValue,
    earnRate,
  };
}

/**
 * Satış sırasında ParaPuan harcama ve indirim hesaplaması yapar.
 * Tutarın en fazla %50'si puanla karşılanabilir kuralı uygulanır.
 */
export function calculatePointsRedemption(params: {
  availablePoints: number;
  totalCartTL: number;
  requestedPoints?: number;
}): {
  usedPoints: number;
  discountTL: number;
  remainingPoints: number;
} {
  const { availablePoints, totalCartTL, requestedPoints } = params;

  if (availablePoints <= 0 || totalCartTL <= 0) {
    return {
      usedPoints: 0,
      discountTL: 0,
      remainingPoints: Math.max(0, availablePoints),
    };
  }

  // İzin verilen maksimum indirim (Sepetin %50'si)
  const maxAllowedDiscountTL = roundMoney(totalCartTL * LOYALTY_DEFAULTS.MAX_REDEMPTION_RATIO);
  const maxUsablePoints = Math.min(
    availablePoints,
    maxAllowedDiscountTL / LOYALTY_DEFAULTS.POINT_TL_CONVERSION_RATE
  );

  const desiredPoints = requestedPoints !== undefined && requestedPoints !== null
    ? Math.max(0, requestedPoints)
    : maxUsablePoints;

  const usedPoints = roundMoney(Math.min(desiredPoints, maxUsablePoints));
  const discountTL = roundMoney(usedPoints * LOYALTY_DEFAULTS.POINT_TL_CONVERSION_RATE);
  const remainingPoints = roundMoney(Math.max(0, availablePoints - usedPoints));

  return {
    usedPoints,
    discountTL,
    remainingPoints,
  };
}

/**
 * Doğum günü veya evlilik yıldönümü için kişiselleştirilmiş WhatsApp mesaj şablonu üretir.
 */
export function generateSpecialDayWhatsAppMessage(params: {
  customerName: string;
  specialDayType: SpecialDayType;
  storeName?: string;
  giftPoints?: number;
  discountCode?: string;
}): string {
  const { customerName, specialDayType, storeName = 'KuyumPanel Mücevherat', giftPoints, discountCode } = params;

  let header = '';
  let body = '';

  if (specialDayType === SPECIAL_DAY_TYPES.BIRTHDAY) {
    header = `🎉 *İyi ki Doğdunuz, Sayın ${customerName}!* 🎂✨`;
    body = `Yeni yaşınızın size sağlık, mutluluk ve ışıltı getirmesini dileriz.`;
  } else if (specialDayType === SPECIAL_DAY_TYPES.WEDDING_ANNIVERSARY) {
    header = `💍 *Evlilik Yıldönümünüz Kutlu Olsun, Sayın ${customerName}!* 🥂✨`;
    body = `Birlikte geçirdiğiniz ömrün altın değerinde güzelliklerle dolu olmasını dileriz.`;
  } else {
    header = `✨ *Sayın ${customerName}, Sizin İçin Özel Bir Gün!* 💎`;
    body = `Özel gününüzü en içten dileklerimizle kutlarız.`;
  }

  let giftSection = '';
  if (giftPoints && giftPoints > 0) {
    giftSection += `\n\n🎁 *Size Özel Hediye:* Hesabınıza tam *${giftPoints} ParaPuan* (${giftPoints} TL değerinde) yüklendi! Mağazamızdaki tüm takı alışverişlerinizde kullanabilirsiniz.`;
  }
  if (discountCode) {
    giftSection += `\n🎟 *Kupon Kodunuz:* *${discountCode}* (Kasada ibraz ediniz)`;
  }

  const footer = `\n\nSizi en kısa sürede mağazamızda ağırlamaktan onur duyarız.\n\n📍 *${storeName}*`;

  return `${header}\n\n${body}${giftSection}${footer}`;
}

/**
 * Sıralı Emanet Teslim Fişi Numarası üretir (Örn: EMT-2026-0001).
 */
export function generateDepositReceiptNumber(
  sequenceNumber: number,
  year: number = new Date().getFullYear()
): string {
  const padded = String(sequenceNumber).padStart(LOYALTY_DEFAULTS.PAD_LENGTH, '0');
  return `${LOYALTY_DEFAULTS.DEPOSIT_PREFIX}-${year}-${padded}`;
}
