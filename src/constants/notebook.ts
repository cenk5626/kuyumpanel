// Kuyumcu Defteri & Operasyonel Notlar Sabitleri

export const NOTEBOOK_CATEGORY = {
  GENERAL: 'GENERAL',
  CUSTOMER: 'CUSTOMER',
  SUPPLIER: 'SUPPLIER',
  WORKSHOP: 'WORKSHOP',
  SERVICE: 'SERVICE',
  PRICE: 'PRICE',
  REMINDER: 'REMINDER',
  PRIVATE: 'PRIVATE',
} as const;

export type NotebookCategory = (typeof NOTEBOOK_CATEGORY)[keyof typeof NOTEBOOK_CATEGORY];

export const NOTEBOOK_CATEGORY_LABELS: Record<NotebookCategory, string> = {
  GENERAL: 'Genel Not',
  CUSTOMER: 'Müşteri Notu',
  SUPPLIER: 'Toptancı Notu',
  WORKSHOP: 'Atölye / Üretim',
  SERVICE: 'Servis / Tamir',
  PRICE: 'Fiyat / Kur Notu',
  REMINDER: 'Hatırlatıcı & Ajanda',
  PRIVATE: 'Özel / Kişisel',
};

export const NOTEBOOK_VISIBILITY = {
  PRIVATE: 'PRIVATE',
  BRANCH: 'BRANCH',
  DEALER: 'DEALER',
} as const;

export type NotebookVisibility = (typeof NOTEBOOK_VISIBILITY)[keyof typeof NOTEBOOK_VISIBILITY];

export const NOTEBOOK_VISIBILITY_LABELS: Record<NotebookVisibility, string> = {
  PRIVATE: 'Sadece Ben (Gizli)',
  BRANCH: 'Şube Personeli',
  DEALER: 'Tüm Mağaza Yetkilileri',
};

export const NOTEBOOK_STATUS = {
  ACTIVE: 'ACTIVE',
  ARCHIVED: 'ARCHIVED',
} as const;

export type NotebookStatus = (typeof NOTEBOOK_STATUS)[keyof typeof NOTEBOOK_STATUS];
