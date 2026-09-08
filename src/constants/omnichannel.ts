/**
 * kuyumpanel - E-Commerce & Omnichannel Integration Constants
 * Strict zero magic number / magic string compliance.
 */

export const CHANNEL_TYPE = {
  TRENDYOL: 'TRENDYOL',
  HEPSIBURADA: 'HEPSIBURADA',
  SHOPIFY: 'SHOPIFY',
  WOOCOMMERCE: 'WOOCOMMERCE',
  CUSTOM_WEB: 'CUSTOM_WEB',
} as const;

export type ChannelType = (typeof CHANNEL_TYPE)[keyof typeof CHANNEL_TYPE];

export const CHANNEL_TYPE_LABELS: Record<ChannelType, string> = {
  [CHANNEL_TYPE.TRENDYOL]: 'Trendyol',
  [CHANNEL_TYPE.HEPSIBURADA]: 'Hepsiburada',
  [CHANNEL_TYPE.SHOPIFY]: 'Shopify',
  [CHANNEL_TYPE.WOOCOMMERCE]: 'WooCommerce',
  [CHANNEL_TYPE.CUSTOM_WEB]: 'Özel Web Sitesi / API',
};

export const EXTERNAL_ORDER_STATUS = {
  NEW: 'NEW',
  PROCESSING: 'PROCESSING',
  SHIPPED: 'SHIPPED',
  CANCELLED: 'CANCELLED',
  RETURNED: 'RETURNED',
} as const;

export type ExternalOrderStatus = (typeof EXTERNAL_ORDER_STATUS)[keyof typeof EXTERNAL_ORDER_STATUS];

export const EXTERNAL_ORDER_STATUS_LABELS: Record<ExternalOrderStatus, string> = {
  [EXTERNAL_ORDER_STATUS.NEW]: 'Yeni Sipariş',
  [EXTERNAL_ORDER_STATUS.PROCESSING]: 'Hazırlanıyor',
  [EXTERNAL_ORDER_STATUS.SHIPPED]: 'Kargoya Verildi',
  [EXTERNAL_ORDER_STATUS.CANCELLED]: 'İptal Edildi',
  [EXTERNAL_ORDER_STATUS.RETURNED]: 'İade Edildi',
};

export const CHANNEL_SYNC_TYPE = {
  STOCK_SYNC: 'STOCK_SYNC',
  PRICE_SYNC: 'PRICE_SYNC',
  ORDER_FETCH: 'ORDER_FETCH',
} as const;

export type ChannelSyncType = (typeof CHANNEL_SYNC_TYPE)[keyof typeof CHANNEL_SYNC_TYPE];

export const CHANNEL_SYNC_TYPE_LABELS: Record<ChannelSyncType, string> = {
  [CHANNEL_SYNC_TYPE.STOCK_SYNC]: 'Stok Senkronizasyonu',
  [CHANNEL_SYNC_TYPE.PRICE_SYNC]: 'Fiyat Senkronizasyonu',
  [CHANNEL_SYNC_TYPE.ORDER_FETCH]: 'Sipariş Çekme',
};

export const OMNICHANNEL_DEFAULTS = {
  DEFAULT_MARKUP_PERCENT: 15.0, // Pazaryeri komisyonu için varsayılan ek marj
  DEFAULT_CARGO_COMPANY: 'Yurtiçi Kargo',
  PRICE_ROUND_STEP: 10, // Fiyatları en yakın 10 TL'ye yuvarlama
} as const;

export const OMNICHANNEL_ERRORS = {
  CHANNEL_NOT_FOUND: 'Satış kanalı bulunamadı.',
  CHANNEL_INACTIVE: 'Bu satış kanalı pasif durumdadır.',
  OVERSELL_RISK: 'Kritik Çifte Satış (Oversell) Riski: Bu ürün mağazada tükenmiştir veya rezerve edilmiştir!',
  ORDER_NOT_FOUND: 'Pazaryeri siparişi bulunamadı.',
  INVALID_ITEMS: 'Sipariş kalemleri geçersiz veya boş.',
} as const;
