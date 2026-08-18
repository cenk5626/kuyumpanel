/**
 * Şüpheli İşlem & Risk Analiz Sabitleri
 * Sıfır Magic Number / String Kuralına Uygun
 */

export const RISK_LEVELS = {
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
  CRITICAL: 'CRITICAL',
} as const;

export type RiskLevel = (typeof RISK_LEVELS)[keyof typeof RISK_LEVELS];

export const RISK_LEVEL_LABELS: Record<RiskLevel, string> = {
  [RISK_LEVELS.LOW]: 'Düşük Risk',
  [RISK_LEVELS.MEDIUM]: 'Orta Risk',
  [RISK_LEVELS.HIGH]: 'Yüksek Risk',
  [RISK_LEVELS.CRITICAL]: 'Kritik Risk',
};

export const RISK_LEVEL_BADGE_CLASSES: Record<RiskLevel, string> = {
  [RISK_LEVELS.LOW]: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
  [RISK_LEVELS.MEDIUM]: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
  [RISK_LEVELS.HIGH]: 'bg-orange-500/10 text-orange-400 border-orange-500/30',
  [RISK_LEVELS.CRITICAL]: 'bg-red-500/15 text-red-400 border-red-500/40 animate-pulse',
};

export const SUSPICIOUS_THRESHOLDS = {
  /** Tek işlemde şüphe çeken yüksek tutar eşiği (TL) */
  HIGH_AMOUNT_THRESHOLD_TL: 200000,
  /** Çok yüksek tutar eşiği (TL) */
  VERY_HIGH_AMOUNT_THRESHOLD_TL: 500000,
  /** Piyasa fiyatından yüzde sapma toleransı (%) */
  MAX_PRICE_DEVIATION_PERCENT: 3.5,
  /** Gece / mesai dışı başlangıç saati (24 saat formatı) */
  NIGHT_HOURS_START: 22,
  /** Gece / mesai dışı bitiş saati (24 saat formatı) */
  NIGHT_HOURS_END: 7,
  /** Hızlı ardışık işlem tekrar penceresi (Saniye) */
  RAPID_REPEAT_WINDOW_SECONDS: 120,
} as const;

export const SUSPICIOUS_REASONS = {
  HIGH_AMOUNT: 'Yüksek Tutar Eşiği Aşıldı',
  PRICE_DEVIATION_HIGH: 'Piyasa Satış Fiyatından Belirgin Sapma',
  PRICE_DEVIATION_LOW: 'Maliyetin Altında Aşırı İndirimli Satış',
  AFTER_HOURS: 'Mesai / Çalışma Saatleri Dışı İşlem',
  RAPID_DUPLICATE: 'Kısa Sürede Ardışık Tekrarlayan İşlem',
  CREDIT_LIMIT_EXCEEDED: 'Müşteri Borç / Kredi Limiti Aşıldı',
  SCRAP_ANOMALY: 'Hurda / Geri Alışta Olağandışı Fiyatlandırma',
} as const;
