/**
 * Stok, Devir Hızı (Sirkülasyon) ve Kritik Stok Sabitleri ve Enumları
 * Zero Magic Numbers / Magic Strings Kuralına Uygun Tanımlamalar
 */

// Varsayılan Minimum Stok Eşiği
export const DEFAULT_MIN_STOCK_THRESHOLD = 5;

// Stok Eşik Sabitleri
export const STOCK_THRESHOLDS = {
  DEFAULT_MIN_STOCK: DEFAULT_MIN_STOCK_THRESHOLD,
  DEFAULT_MIN_SARRAFIYE: 5,   // Çeyrek, Yarım vb. için adet eşiği
  DEFAULT_MIN_DOVIZ: 1000,    // USD, EUR vb. için nominal eşik
  DEFAULT_MIN_GRAM: 10,       // 24K, 22K vb. için gram eşiği
  CRITICAL_MULTIPLIER: 1.0,   // Stok <= minThreshold ise KRITIK
  WARNING_MULTIPLIER: 1.5,    // Stok <= minThreshold * 1.5 ise UYARI
} as const;

// Stok Devir Hızı / Sirkülasyon Kategorileri
export const TURNOVER_CATEGORIES = {
  HIZLI: 'HIZLI',             // Hızlı Devreden (Fast Mover: V_daily >= 1.0)
  NORMAL: 'NORMAL',           // Normal Devreden (Moderate Mover: 0.2 <= V_daily < 1.0)
  YAVAS: 'YAVAS',             // Yavaş Devreden (Slow Mover: 0 < V_daily < 0.2)
  HAREKETSIZ: 'HAREKETSIZ',   // Hareketsiz / Ölü Stok (Dead Stock: V_daily = 0)
} as const;

export type TurnoverCategory = (typeof TURNOVER_CATEGORIES)[keyof typeof TURNOVER_CATEGORIES];

// Takma Ad (Alternatif İsimlendirme Uyumluluğu)
export const TURNOVER_STATUS = TURNOVER_CATEGORIES;
export type TurnoverStatus = TurnoverCategory;

// Devir Hızı Türkçe Etiketleri
export const TURNOVER_STATUS_LABELS: Record<TurnoverCategory, string> = {
  [TURNOVER_CATEGORIES.HIZLI]: 'Hızlı Devir (Yüksek Talep)',
  [TURNOVER_CATEGORIES.NORMAL]: 'Normal Sirkülasyon',
  [TURNOVER_CATEGORIES.YAVAS]: 'Yavaş Devir',
  [TURNOVER_CATEGORIES.HAREKETSIZ]: 'Hareketsiz Stok (Ölü Stok)',
};

// Analiz Periyotları (Gün Cinsinden)
export const TURNOVER_PERIODS = {
  DAYS_7: 7,
  DAYS_30: 30,
  DAYS_90: 90,
} as const;

export type TurnoverPeriod = (typeof TURNOVER_PERIODS)[keyof typeof TURNOVER_PERIODS];

// Stok Uyarı Seviyeleri
export const STOCK_ALERT_LEVELS = {
  CRITICAL: 'CRITICAL', // Kritik Düzey (Stok <= Eşik)
  WARNING: 'WARNING',   // Yaklaşan Tehlike (Eşik < Stok <= Eşik * 1.5)
  SAFE: 'SAFE',         // Güvenli Seviye (Stok > Eşik * 1.5)
} as const;

export type StockAlertLevel = (typeof STOCK_ALERT_LEVELS)[keyof typeof STOCK_ALERT_LEVELS];

// Sipariş & Tedarik Taslağı Varsayılanları
export const REORDER_DEFAULTS = {
  DEFAULT_LEAD_TIME_DAYS: 7,      // Ortalama Tedarik Süresi (Gün)
  DEFAULT_SAFETY_BUFFER_DAYS: 3,  // Emniyet Stoku Tampon Süresi (Gün)
} as const;

/**
 * Günlük satış hızına göre devir kategorisini belirler
 * @param dailyVelocity Günlük ortalama satış miktarı (Q_sold / gün)
 */
export function determineTurnoverCategory(dailyVelocity: number): TurnoverCategory {
  if (dailyVelocity >= 1.0) {
    return TURNOVER_CATEGORIES.HIZLI;
  }
  if (dailyVelocity >= 0.2) {
    return TURNOVER_CATEGORIES.NORMAL;
  }
  if (dailyVelocity > 0) {
    return TURNOVER_CATEGORIES.YAVAS;
  }
  return TURNOVER_CATEGORIES.HAREKETSIZ;
}

/**
 * Stok miktarı ve eşik değerine göre uyarı seviyesini belirler
 * @param currentAmount Mevcut stok miktarı
 * @param minThreshold Minimum stok eşiği (varsayılan: 5)
 */
export function determineStockAlertLevel(
  currentAmount: number,
  minThreshold: number = DEFAULT_MIN_STOCK_THRESHOLD
): StockAlertLevel {
  if (currentAmount <= minThreshold) {
    return STOCK_ALERT_LEVELS.CRITICAL;
  }
  if (currentAmount <= minThreshold * STOCK_THRESHOLDS.WARNING_MULTIPLIER) {
    return STOCK_ALERT_LEVELS.WARNING;
  }
  return STOCK_ALERT_LEVELS.SAFE;
}
