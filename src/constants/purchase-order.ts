// Toptancı Sipariş Takibi ve WhatsApp Entegrasyonu Sabitleri

export const PURCHASE_ORDER_STATUS = {
  DRAFT: 'DRAFT',
  APPROVAL_PENDING: 'APPROVAL_PENDING',
  APPROVED: 'APPROVED',
  SENT_TO_SUPPLIER: 'SENT_TO_SUPPLIER',
  PARTIALLY_RECEIVED: 'PARTIALLY_RECEIVED',
  RECEIVED: 'RECEIVED',
  CANCELLED: 'CANCELLED',
  REJECTED: 'REJECTED',
} as const;

export type PurchaseOrderStatus = (typeof PURCHASE_ORDER_STATUS)[keyof typeof PURCHASE_ORDER_STATUS];
export type WholesalePurchaseOrderStatus = PurchaseOrderStatus;

export const PURCHASE_ORDER_STATUS_LABELS: Record<PurchaseOrderStatus, string> = {
  DRAFT: 'Taslak',
  APPROVAL_PENDING: 'Onay Bekliyor',
  APPROVED: 'Onaylandı',
  SENT_TO_SUPPLIER: 'Toptancıya İletildi',
  PARTIALLY_RECEIVED: 'Kısmi Mal Kabul',
  RECEIVED: 'Teslim Alındı (Tamamlandı)',
  CANCELLED: 'İptal Edildi',
  REJECTED: 'Reddedildi',
};

export const PO_MESSAGE_PROVIDER = {
  WEB_INTENT: 'WEB_INTENT',
  CLOUD_API: 'CLOUD_API',
  GATEWAY: 'GATEWAY',
} as const;

export type PoMessageProvider = (typeof PO_MESSAGE_PROVIDER)[keyof typeof PO_MESSAGE_PROVIDER];

export const PO_MESSAGE_STATUS = {
  SENT: 'SENT',
  FAILED: 'FAILED',
  QUEUED: 'QUEUED',
} as const;

export type PoMessageStatus = (typeof PO_MESSAGE_STATUS)[keyof typeof PO_MESSAGE_STATUS];

export const PURCHASE_ORDER_CONFIG = {
  ORDER_NUMBER_PREFIX: 'PO',
  MAX_LINES_PER_ORDER: 50,
  DEFAULT_CURRENCY: 'TL',
} as const;
