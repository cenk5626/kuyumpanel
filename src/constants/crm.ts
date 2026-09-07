// KuyumPanel Kurumsal ERP — CRM, Segmentasyon & İzinli WhatsApp İletişimi Sabitleri (ETK / KVKK)

export const CRM_CONSENT_STATUS = {
  OPT_IN: 'OPT_IN',   // İletişim İzni Verildi (Ticari elektronik ileti onaylı)
  OPT_OUT: 'OPT_OUT', // İletişim İzni Reddedildi / İptal Edildi (Kara liste)
  PENDING: 'PENDING', // Onay Bekleniyor
} as const;

export type CrmConsentStatus = (typeof CRM_CONSENT_STATUS)[keyof typeof CRM_CONSENT_STATUS];

export const CRM_CONSENT_STATUS_LABELS: Record<CrmConsentStatus, string> = {
  OPT_IN: 'İzinli (Opt-In)',
  OPT_OUT: 'Reddedildi / Kara Liste (Opt-Out)',
  PENDING: 'Onay Bekliyor',
};

export const CRM_CONSENT_CHANNELS = {
  IN_STORE_FORM: 'IN_STORE_FORM',         // Mağaza İçi Islak İmzalı / Sözlü Beyan Formu
  SMS_OTP: 'SMS_OTP',                     // SMS Doğrulama Kodu ile Onay
  VERBAL_PHONE: 'VERBAL_PHONE',           // Telefon Görüşmesi Ses Kaydı Beyanı
  DIGITAL_SIGNATURE: 'DIGITAL_SIGNATURE', // Tablet Üzerinden Dijital İmza
} as const;

export type CrmConsentChannel = (typeof CRM_CONSENT_CHANNELS)[keyof typeof CRM_CONSENT_CHANNELS];

export const CRM_CONSENT_CHANNEL_LABELS: Record<CrmConsentChannel, string> = {
  IN_STORE_FORM: 'Mağaza İçi Matbu Form',
  SMS_OTP: 'SMS Doğrulama Kodu',
  VERBAL_PHONE: 'Telefon Beyanı',
  DIGITAL_SIGNATURE: 'Tablet Dijital İmza',
};

export const CRM_CAMPAIGN_STATUS = {
  DRAFT: 'DRAFT',         // Taslak
  SCHEDULED: 'SCHEDULED', // İleri Tarihe Planlandı
  ACTIVE: 'ACTIVE',       // Gönderim Devam Ediyor
  COMPLETED: 'COMPLETED', // Tamamlandı
  CANCELLED: 'CANCELLED', // İptal Edildi
} as const;

export type CrmCampaignStatus = (typeof CRM_CAMPAIGN_STATUS)[keyof typeof CRM_CAMPAIGN_STATUS];

export const CRM_CAMPAIGN_STATUS_LABELS: Record<CrmCampaignStatus, string> = {
  DRAFT: 'Taslak',
  SCHEDULED: 'Planlandı',
  ACTIVE: 'Yayında / Gönderimde',
  COMPLETED: 'Tamamlandı',
  CANCELLED: 'İptal Edildi',
};

export const CRM_CAMPAIGN_TYPES = {
  DISCOUNT_COUPON: 'DISCOUNT_COUPON',                 // İndirim Kuponu / Özel Teklif
  SPECIAL_DAY_GREETING: 'SPECIAL_DAY_GREETING',       // Doğum Günü / Yıldönümü Tebriği
  NEW_COLLECTION: 'NEW_COLLECTION',                   // Yeni Sezon / Vitrin Koleksiyonu
  GOLD_PRICE_ALERT: 'GOLD_PRICE_ALERT',               // Altın Fiyatı Fırsat Bülteni
  LOYALTY_POINTS_REMINDER: 'LOYALTY_POINTS_REMINDER', // ParaPuan Hatırlatma
} as const;

export type CrmCampaignType = (typeof CRM_CAMPAIGN_TYPES)[keyof typeof CRM_CAMPAIGN_TYPES];

export const CRM_CAMPAIGN_TYPE_LABELS: Record<CrmCampaignType, string> = {
  DISCOUNT_COUPON: 'Özel İndirim & Fırsat',
  SPECIAL_DAY_GREETING: 'Özel Gün Tebriği',
  NEW_COLLECTION: 'Yeni Koleksiyon Tanıtımı',
  GOLD_PRICE_ALERT: 'Altın Fiyatı Duyurusu',
  LOYALTY_POINTS_REMINDER: 'ParaPuan Bakiye Hatırlatma',
};

export const CRM_SEGMENT_TYPES = {
  VIP: 'VIP',                   // Yüksek cirolu VIP müşteriler
  WEDDING: 'WEDDING',           // Düğün & Çeyiz hazırlığı yapanlar
  INVESTOR: 'INVESTOR',         // Has altın / sarrafiye yatırımcıları
  DORMANT: 'DORMANT',           // Uzun süredir alışveriş yapmayan uyuyan müşteriler
  CUSTOM: 'CUSTOM',             // Özel tanımlanmış filtre
} as const;

export type CrmSegmentType = (typeof CRM_SEGMENT_TYPES)[keyof typeof CRM_SEGMENT_TYPES];

export const CRM_SEGMENT_TYPE_LABELS: Record<CrmSegmentType, string> = {
  VIP: 'VIP Müşteriler',
  WEDDING: 'Düğün & Çeyiz Alıcıları',
  INVESTOR: 'Has Altın Yatırımcıları',
  DORMANT: 'Uyuyan Müşteriler (Riskli)',
  CUSTOM: 'Özel Segment',
};

export const CRM_RECIPIENT_STATUS = {
  PENDING: 'PENDING',
  SENT: 'SENT',
  FAILED: 'FAILED',
  OPTED_OUT: 'OPTED_OUT',
} as const;

export type CrmRecipientStatus = (typeof CRM_RECIPIENT_STATUS)[keyof typeof CRM_RECIPIENT_STATUS];

export const CRM_MESSAGE_VARIABLES = {
  CUSTOMER_NAME: '{{ad}}',
  CUSTOMER_FULL_NAME: '{{ad_soyad}}',
  POINTS_BALANCE: '{{puan}}',
  DISCOUNT_PERCENT: '{{indirim}}',
  STORE_NAME: '{{magaza}}',
  EXPIRY_DATE: '{{gecerlilik}}',
  OPT_OUT_INSTRUCTION: '{{ret_metni}}',
} as const;

export const CRM_DEFAULTS = {
  DEFAULT_OPT_OUT_TEXT: 'İleti almak istemiyorsanız RET yazıp bu numaraya iletebilirsiniz. Mersis: 012345678900001',
  DEFAULT_SEGMENT_MIN_SPEND_VIP: 100000,
  DEFAULT_DORMANT_DAYS: 180,
  DEFAULT_CAMPAIGN_TYPE: CRM_CAMPAIGN_TYPES.DISCOUNT_COUPON,
} as const;
