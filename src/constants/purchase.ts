/**
 * KuyumPanel Tedarik Siparişi ve Mal Kabul Sabitleri (Faz 2)
 * Sıfır Magic Number / String Kuralına Uygun
 */

export const PO_STATUS = {
  DRAFT: 'DRAFT',
  ORDERED: 'ORDERED',
  PARTIALLY_RECEIVED: 'PARTIALLY_RECEIVED',
  RECEIVED: 'RECEIVED',
  CANCELLED: 'CANCELLED',
} as const;

export type PurchaseOrderStatus = (typeof PO_STATUS)[keyof typeof PO_STATUS];

export const PO_LINE_STATUS = {
  PENDING: 'PENDING',
  PARTIALLY_RECEIVED: 'PARTIALLY_RECEIVED',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
} as const;

export type PurchaseOrderLineStatus = (typeof PO_LINE_STATUS)[keyof typeof PO_LINE_STATUS];

export const PO_DEFAULTS = {
  PO_PREFIX: 'PO',
  GR_PREFIX: 'GR',
  PAD_LENGTH: 4,
  MAX_LINES_PER_ORDER: 100,
  MIN_DESCRIPTION_LENGTH: 2,
  MAX_DESCRIPTION_LENGTH: 200,
  MAX_NOTES_LENGTH: 500,
} as const;

export const PRODUCT_CATEGORIES = {
  BILEZIK: 'Bilezik',
  YUZUK: 'Yüzük',
  KOLYE: 'Kolye',
  KUPE: 'Küpe',
  ZIYNET: 'Ziynet / Sarrafiye',
  HAS_KULCE: 'Has / Külçe Altın',
  DIGER: 'Diğer Takı',
} as const;

export type ProductCategoryKey = keyof typeof PRODUCT_CATEGORIES;

export const PO_STATUS_LABELS: Record<PurchaseOrderStatus, { label: string; color: string; bg: string }> = {
  [PO_STATUS.DRAFT]: { label: 'Taslak', color: 'text-amber-500', bg: 'bg-amber-500/10' },
  [PO_STATUS.ORDERED]: { label: 'Sipariş Verildi', color: 'text-blue-500', bg: 'bg-blue-500/10' },
  [PO_STATUS.PARTIALLY_RECEIVED]: { label: 'Kısmi Kabul', color: 'text-purple-500', bg: 'bg-purple-500/10' },
  [PO_STATUS.RECEIVED]: { label: 'Tamamlandı (Kabul Edildi)', color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
  [PO_STATUS.CANCELLED]: { label: 'İptal Edildi', color: 'text-slate-400', bg: 'bg-slate-500/10' },
};

export const PO_LINE_STATUS_LABELS: Record<PurchaseOrderLineStatus, { label: string; color: string; bg: string }> = {
  [PO_LINE_STATUS.PENDING]: { label: 'Bekliyor', color: 'text-amber-500', bg: 'bg-amber-500/10' },
  [PO_LINE_STATUS.PARTIALLY_RECEIVED]: { label: 'Kısmi Teslim', color: 'text-purple-500', bg: 'bg-purple-500/10' },
  [PO_LINE_STATUS.COMPLETED]: { label: 'Eksiksiz Teslim', color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
  [PO_LINE_STATUS.CANCELLED]: { label: 'İptal', color: 'text-slate-400', bg: 'bg-slate-500/10' },
};
