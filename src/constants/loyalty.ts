/**
 * KuyumPanel Müşteri Sadakat, ParaPuan & RFM Segmentasyonu Sabitleri (Faz 4)
 * Sıfır Magic Number / String Kuralına Uygun
 */

export const LOYALTY_TIERS = {
  BRONZE: 'BRONZE',
  SILVER: 'SILVER',
  GOLD: 'GOLD',
  PLATINUM: 'PLATINUM',
} as const;

export type LoyaltyTier = (typeof LOYALTY_TIERS)[keyof typeof LOYALTY_TIERS];

export interface LoyaltyTierInfo {
  label: string;
  minSpendTL: number;
  earnRate: number; // Örn: 0.01 = %1 puan kazanımı
  color: string;
  bg: string;
  border: string;
}

export const LOYALTY_TIER_CONFIG: Record<LoyaltyTier, LoyaltyTierInfo> = {
  [LOYALTY_TIERS.BRONZE]: {
    label: 'Bronz Müşteri',
    minSpendTL: 0,
    earnRate: 0.01,
    color: 'text-amber-500',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/30',
  },
  [LOYALTY_TIERS.SILVER]: {
    label: 'Gümüş Müşteri',
    minSpendTL: 50000,
    earnRate: 0.015,
    color: 'text-slate-300',
    bg: 'bg-slate-400/10',
    border: 'border-slate-400/30',
  },
  [LOYALTY_TIERS.GOLD]: {
    label: 'Altın Müşteri',
    minSpendTL: 150000,
    earnRate: 0.02,
    color: 'text-yellow-400',
    bg: 'bg-yellow-500/10',
    border: 'border-yellow-500/30',
  },
  [LOYALTY_TIERS.PLATINUM]: {
    label: 'Platin VIP',
    minSpendTL: 500000,
    earnRate: 0.03,
    color: 'text-cyan-400',
    bg: 'bg-cyan-500/10',
    border: 'border-cyan-500/30',
  },
};

export const RFM_SEGMENTS = {
  CHAMPIONS: 'CHAMPIONS',                 // Sık gelen, en çok harcayan, yeni işlem yapmış
  LOYAL_CUSTOMERS: 'LOYAL_CUSTOMERS',     // Düzenli gelen, iyi harcayan
  POTENTIAL_LOYALISTS: 'POTENTIAL_LOYALISTS', // Yeni ve yüksek hacimli adaylar
  AT_RISK: 'AT_RISK',                     // Eskiden sık gelen ama uzun süredir uğramayan
  HIBERNATING: 'HIBERNATING',             // Çok seyrek gelen, uyuyan müşteriler
  LOST: 'LOST',                           // Uzun süredir gelmeyen ve az harcayan
  NEW_CUSTOMERS: 'NEW_CUSTOMERS',         // İlk kez alışveriş yapanlar
} as const;

export type RfmSegment = (typeof RFM_SEGMENTS)[keyof typeof RFM_SEGMENTS];

export interface RfmSegmentInfo {
  label: string;
  description: string;
  actionRecommendation: string;
  color: string;
  bg: string;
  border: string;
}

export const RFM_SEGMENT_CONFIG: Record<RfmSegment, RfmSegmentInfo> = {
  [RFM_SEGMENTS.CHAMPIONS]: {
    label: 'Şampiyonlar',
    description: 'En değerli, en sık gelen ve yüksek harcama yapan elit kitle.',
    actionRecommendation: 'Özel VIP indirimleri, lansman davetleri ve hediye ParaPuan sunun.',
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/30',
  },
  [RFM_SEGMENTS.LOYAL_CUSTOMERS]: {
    label: 'Sadık Müşteriler',
    description: 'Düzenli olarak mağazanızı tercih eden güvenilir kitle.',
    actionRecommendation: 'Sadakat kademesini yükseltmek için ek çarpanlı puan kampanyası yapın.',
    color: 'text-blue-400',
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/30',
  },
  [RFM_SEGMENTS.POTENTIAL_LOYALISTS]: {
    label: 'Potansiyel Sadıklar',
    description: 'Son dönemde yüksek alışveriş yapmış, büyüme potansiyeli yüksek kitle.',
    actionRecommendation: 'İkinci alışverişe özel indirim kuponu ve hoş geldin puanı verin.',
    color: 'text-purple-400',
    bg: 'bg-purple-500/10',
    border: 'border-purple-500/30',
  },
  [RFM_SEGMENTS.AT_RISK]: {
    label: 'Risk Altındakiler',
    description: 'Geçmişte iyi harcama yapmış fakat uzun süredir mağazaya gelmemiş kitle.',
    actionRecommendation: 'Kişiselleştirilmiş "Sizi Özledik" mesajı ve sınırlı süreli indirim tanımlayın.',
    color: 'text-amber-400',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/30',
  },
  [RFM_SEGMENTS.HIBERNATING]: {
    label: 'Uyuyan Müşteriler',
    description: 'Düşük sıklıkta gelen ve uzun süredir aktif olmayan kitle.',
    actionRecommendation: 'Genel vitrin duyuruları ve cazip özel gün fırsatları ile yeniden uyandırın.',
    color: 'text-orange-400',
    bg: 'bg-orange-500/10',
    border: 'border-orange-500/30',
  },
  [RFM_SEGMENTS.LOST]: {
    label: 'Kayıp Müşteriler',
    description: 'Çok uzun süredir işlem yapmamış ve düşük harcamalı kitle.',
    actionRecommendation: 'Yılda 1-2 kez genel bayram/yılbaşı tebrikleri gönderin.',
    color: 'text-rose-400',
    bg: 'bg-rose-500/10',
    border: 'border-rose-500/30',
  },
  [RFM_SEGMENTS.NEW_CUSTOMERS]: {
    label: 'Yeni Müşteriler',
    description: 'Son günlerde ilk alışverişini gerçekleştirmiş kitle.',
    actionRecommendation: 'Teşekkür mesajı ile ilk alışveriş ParaPuanını hatırlatın.',
    color: 'text-teal-400',
    bg: 'bg-teal-500/10',
    border: 'border-teal-500/30',
  },
};

export const SPECIAL_DAY_TYPES = {
  BIRTHDAY: 'BIRTHDAY',
  WEDDING_ANNIVERSARY: 'WEDDING_ANNIVERSARY',
  CUSTOM: 'CUSTOM',
} as const;

export type SpecialDayType = (typeof SPECIAL_DAY_TYPES)[keyof typeof SPECIAL_DAY_TYPES];

export const SPECIAL_DAY_LABELS: Record<SpecialDayType, string> = {
  [SPECIAL_DAY_TYPES.BIRTHDAY]: 'Doğum Günü',
  [SPECIAL_DAY_TYPES.WEDDING_ANNIVERSARY]: 'Evlilik Yıldönümü',
  [SPECIAL_DAY_TYPES.CUSTOM]: 'Özel Gün',
};

export const LOYALTY_ACTION_TYPES = {
  EARN: 'EARN',
  REDEEM: 'REDEEM',
  ADJUST: 'ADJUST',
  EXPIRE: 'EXPIRE',
} as const;

export type LoyaltyActionType = (typeof LOYALTY_ACTION_TYPES)[keyof typeof LOYALTY_ACTION_TYPES];

export const LOYALTY_ACTION_LABELS: Record<LoyaltyActionType, { label: string; color: string; bg: string }> = {
  [LOYALTY_ACTION_TYPES.EARN]: { label: 'Puan Kazanımı', color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
  [LOYALTY_ACTION_TYPES.REDEEM]: { label: 'Puan Harcama', color: 'text-rose-400', bg: 'bg-rose-500/10' },
  [LOYALTY_ACTION_TYPES.ADJUST]: { label: 'Manuel Düzeltme', color: 'text-blue-400', bg: 'bg-blue-500/10' },
  [LOYALTY_ACTION_TYPES.EXPIRE]: { label: 'Süre Aşımı', color: 'text-gray-400', bg: 'bg-gray-500/10' },
};

export const LOYALTY_DEFAULTS = {
  POINT_TL_CONVERSION_RATE: 1.0, // 1 ParaPuan = 1.00 TL
  DEFAULT_BIRTHDAY_POINTS: 250,   // Doğum günü hediye puanı (250 TL değerinde)
  DEFAULT_ANNIVERSARY_POINTS: 500,// Yıldönümü hediye puanı (500 TL değerinde)
  MAX_REDEMPTION_RATIO: 0.5,      // Satış toplamının en fazla %50'si puanla ödenebilir
  UPCOMING_DAYS_WINDOW: 15,       // Yaklaşan 15 günlük özel günler
  DEPOSIT_PREFIX: 'EMT',
  PAD_LENGTH: 4,
} as const;
