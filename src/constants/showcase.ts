/**
 * TV Vitrin ve Dijital Bilgilendirme Ekranı Sabitleri
 * Zero Magic Numbers / Magic Strings Kuralına Uygun Tanımlamalar
 */

export const SHOWCASE_CONFIG = {
  PRICE_REFRESH_INTERVAL_MS: 2500, // 2.5 saniyede bir fiyat yenileme / kontrol
  TICKER_SPEED_SECONDS: 35,        // Alt kayan yazı bandı geçiş hızı (sn)
  AUTO_HIDE_CONTROLS_DELAY_MS: 5000,// 5 saniye hareketsizlik sonrası kontrolleri gizle
  DEFAULT_ANNOUNCEMENT: 'Hoş Geldiniz • Canlı Altın ve Döviz Kurları • Kalite ve Güvenin Adresi',
  CAROUSEL_INTERVAL_MS: 6000,      // Kampanya duyuru rotasyon süresi (ms)
  SEPARATOR_SYMBOL: '✦',           // Kayan yazı ayırıcı sembolü
  MAX_BANNER_LENGTH: 150,          // Maksimum duyuru uzunluğu
} as const;

export const SHOWCASE_PROMOTIONS = [
  'KuyumPanel — Canlı Altın, Ziynet ve Döviz Kurları',
  'Özel tasarım pırlanta ve elmas koleksiyonlarında %15 net indirim!',
  'Eski altınınız en yüksek piyasa değerinden değerinde alınır.',
  'Tüm ziynet ve sarrafiye ürünlerinde anında nakit teslimat.',
  'Kredi kartına vade farksız taksit seçenekleri mevcuttur.',
] as const;

export const SHOWCASE_CHANNELS = {
  HAREM: 'harem',
  ALTIS: 'altis',
} as const;

export type ShowcaseChannel = (typeof SHOWCASE_CHANNELS)[keyof typeof SHOWCASE_CHANNELS];

