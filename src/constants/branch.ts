/**
 * KuyumPanel Şube Yönetimi ve Transfer Sabitleri (Faz 1)
 * Sıfır Magic Number / String Kuralına Uygun
 */

export const TRANSFER_STATUS = {
  DRAFT: 'DRAFT',
  APPROVED: 'APPROVED',
  SHIPPED: 'SHIPPED',
  RECEIVED: 'RECEIVED',
  CANCELLED: 'CANCELLED',
  REJECTED: 'REJECTED',
} as const;

export type TransferStatus = (typeof TRANSFER_STATUS)[keyof typeof TRANSFER_STATUS];

export const BRANCH_DEFAULTS = {
  CODE: 'MRKZ',
  NAME: 'Merkez Şube',
  TRANSFER_PREFIX: 'TRF',
  TRANSFER_PAD_LENGTH: 4,
} as const;

export const TRANSFER_LIMITS = {
  MAX_LINES_PER_TRANSFER: 100,
  MAX_NOTES_LENGTH: 500,
  MIN_CODE_LENGTH: 2,
  MAX_CODE_LENGTH: 10,
  MIN_NAME_LENGTH: 2,
  MAX_NAME_LENGTH: 100,
} as const;

export const TRANSFER_STATUS_LABELS: Record<TransferStatus, { label: string; color: string; bg: string }> = {
  [TRANSFER_STATUS.DRAFT]: { label: 'Taslak', color: 'text-amber-500', bg: 'bg-amber-500/10' },
  [TRANSFER_STATUS.APPROVED]: { label: 'Onaylandı', color: 'text-blue-500', bg: 'bg-blue-500/10' },
  [TRANSFER_STATUS.SHIPPED]: { label: 'Sevk Edildi (Yolda)', color: 'text-purple-500', bg: 'bg-purple-500/10' },
  [TRANSFER_STATUS.RECEIVED]: { label: 'Teslim Alındı', color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
  [TRANSFER_STATUS.CANCELLED]: { label: 'İptal Edildi', color: 'text-zinc-400', bg: 'bg-zinc-500/10' },
  [TRANSFER_STATUS.REJECTED]: { label: 'Reddedildi', color: 'text-rose-500', bg: 'bg-rose-500/10' },
};
