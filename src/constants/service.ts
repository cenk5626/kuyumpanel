// KuyumPanel Kurumsal ERP — Servis, Tamir & Garanti Yönetimi Sabitleri

export const SERVICE_ORDER_STATUS = {
  RECEIVED: 'RECEIVED',       // Teslim Alındı (Kayıt açıldı, ön tartım yapıldı)
  QUOTED: 'QUOTED',           // Fiyat Teklifi Verildi (Müşteri onayı bekleniyor)
  APPROVED: 'APPROVED',       // Müşteri Onayladı (İşleme başlanabilir)
  IN_WORKSHOP: 'IN_WORKSHOP', // Atölyede / Üretimde (Mıhlama, kaynak, cila)
  READY: 'READY',             // Hazır (Mağazada müşteriyi bekliyor)
  DELIVERED: 'DELIVERED',     // Teslim Edildi (Müşteriye verildi, garanti başladı)
  CANCELLED: 'CANCELLED',     // İptal Edildi (İade edildi / reddedildi)
} as const;

export type ServiceOrderStatus = (typeof SERVICE_ORDER_STATUS)[keyof typeof SERVICE_ORDER_STATUS];

export const SERVICE_STATUS_LABELS: Record<ServiceOrderStatus, string> = {
  RECEIVED: 'Kayıt Açıldı',
  QUOTED: 'Teklif Verildi',
  APPROVED: 'Müşteri Onayladı',
  IN_WORKSHOP: 'Atölyede (İşlemde)',
  READY: 'Hazır (Teslim Bekliyor)',
  DELIVERED: 'Teslim Edildi (Garantide)',
  CANCELLED: 'İptal Edildi',
};

export const SERVICE_ORDER_ACTIONS = {
  CREATE: 'CREATE',
  QUOTE: 'QUOTE',
  APPROVE: 'APPROVE',
  SEND_TO_WORKSHOP: 'SEND_TO_WORKSHOP',
  MARK_READY: 'MARK_READY',
  DELIVER: 'DELIVER',
  CANCEL: 'CANCEL',
} as const;

export type ServiceOrderAction = (typeof SERVICE_ORDER_ACTIONS)[keyof typeof SERVICE_ORDER_ACTIONS];

export const SERVICE_DEFAULTS = {
  PREFIX: 'SRV',
  DEFAULT_WARRANTY_MONTHS: 6,
  CURRENCY: 'TRY',
  OVERDUE_ALERT_DAYS: 0, // Vaat edilen tarih 1 gün bile geçse gecikmiş sayılır
} as const;

export const SERVICE_WARRANTY_MONTH_OPTIONS = [1, 3, 6, 12, 24] as const;

export const SERVICE_COMMON_ISSUES = [
  'Taş Düşmesi & Mıhlama',
  'Yüzük Boy Ayarlama (Büyütme/Daraltma)',
  'Kırık / Kopuk Kaynağı (Lazer)',
  'Cila, Rodaj & Parlatma',
  'Kilit / Yay Tamiri & Değişimi',
  'Özel İmalat / Atölye Yenileme',
  'İp / Misina Dizimi (İnci/Mercan)',
] as const;

export const SERVICE_PHOTO_TYPES = {
  INTAKE: 'INTAKE',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
  DEFECT: 'DEFECT',
} as const;

export type ServicePhotoType = (typeof SERVICE_PHOTO_TYPES)[keyof typeof SERVICE_PHOTO_TYPES];

export const SERVICE_PHOTO_CONFIG = {
  MAX_PHOTO_SIZE_BYTES: 5 * 1024 * 1024, // 5MB
  ALLOWED_MIME_TYPES: ['image/jpeg', 'image/png', 'image/webp'],
} as const;

export const CUSTOMER_APPROVAL_STATUS = {
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
} as const;

