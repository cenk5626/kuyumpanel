// KuyumPanel Kurumsal ERP — Yönetici Analitiği & Talep Tahmini Sabitleri

export const STOCK_VELOCITY_CATEGORY = {
  FAST_MOVING: 'FAST_MOVING', // Hızlı Dönen (Tükenme Riski Taşıyan)
  NORMAL: 'NORMAL',           // Dengeli Devir
  SLOW_MOVING: 'SLOW_MOVING', // Yavaş Dönen
  DEAD_STOCK: 'DEAD_STOCK',   // Ölü Sermaye (Stokta Hareketsiz Yatan)
} as const;

export type StockVelocityCategory = (typeof STOCK_VELOCITY_CATEGORY)[keyof typeof STOCK_VELOCITY_CATEGORY];

export const STOCK_VELOCITY_LABELS: Record<StockVelocityCategory, string> = {
  FAST_MOVING: 'Hızlı Dönen (Tükenme Riski)',
  NORMAL: 'Dengeli Devir',
  SLOW_MOVING: 'Yavaş Dönen',
  DEAD_STOCK: 'Ölü Sermaye (>180 Gün)',
};

export const ANALYTICS_PERIOD_OPTIONS = [
  { value: 7, label: 'Son 7 Gün' },
  { value: 30, label: 'Son 30 Gün' },
  { value: 90, label: 'Son 90 Gün (Çeyrek Dönem)' },
  { value: 180, label: 'Son 6 Ay' },
  { value: 365, label: 'Son 1 Yıl' },
] as const;

export const EXECUTIVE_DEFAULTS = {
  DEFAULT_PERIOD_DAYS: 90,
  DEFAULT_SAFETY_DAYS: 14,
  DEFAULT_LEAD_TIME_DAYS: 7,
  DEFAULT_DEAD_STOCK_DAYS: 180,
  FAST_MOVING_DAYS_THRESHOLD: 15, // 15 günden az stoğu kalan kalemler tükenme riski taşır
  SLOW_MOVING_DAYS_THRESHOLD: 90, // 90 günden uzun sürede satılanlar yavaş dönendir
  DEFAULT_TARGET_MARGIN_PERCENT: 15.0,
} as const;
