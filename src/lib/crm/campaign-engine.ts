import {
  CRM_CONSENT_STATUS,
  CRM_MESSAGE_VARIABLES,
  CRM_DEFAULTS,
  CRM_SEGMENT_TYPES,
  CrmConsentStatus,
  CrmSegmentType,
} from '@/constants/crm';

export interface CustomerForSegmentation {
  id: string;
  name: string;
  phone?: string | null;
  monetary?: number;
  recencyDays?: number;
  frequency?: number;
  consentStatus?: string;
  loyaltyPoints?: number;
}

export interface SegmentRule {
  type: CrmSegmentType;
  minSpendTl?: number;
  maxRecencyDays?: number;
  minTransactions?: number;
}

/**
 * Müşteriyi harcama, sıklık ve güncellik kurallarına göre segment kriterine uydurur.
 */
export function evaluateCustomerSegmentation(
  customer: CustomerForSegmentation,
  rule: SegmentRule
): boolean {
  const spend = customer.monetary || 0;
  const recency = customer.recencyDays ?? 999;
  const freq = customer.frequency || 0;

  switch (rule.type) {
    case CRM_SEGMENT_TYPES.VIP: {
      const minSpend = rule.minSpendTl ?? CRM_DEFAULTS.DEFAULT_SEGMENT_MIN_SPEND_VIP;
      return spend >= minSpend;
    }

    case CRM_SEGMENT_TYPES.DORMANT: {
      const dormantDays = rule.maxRecencyDays ?? CRM_DEFAULTS.DEFAULT_DORMANT_DAYS;
      return recency >= dormantDays;
    }

    case CRM_SEGMENT_TYPES.WEDDING:
    case CRM_SEGMENT_TYPES.INVESTOR:
    case CRM_SEGMENT_TYPES.CUSTOM:
    default: {
      const spendOk = rule.minSpendTl ? spend >= rule.minSpendTl : true;
      const recencyOk = rule.maxRecencyDays !== undefined ? recency <= rule.maxRecencyDays : true;
      const freqOk = rule.minTransactions ? freq >= rule.minTransactions : true;
      return spendOk && recencyOk && freqOk;
    }
  }
}

/**
 * ETK / KVKK İzin Filtresi (Compliance Guard):
 * Yalnızca geçerli telefonu olan ve İletişim İzni (OPT_IN) bulunan müşterileri döndürür.
 * İzni olmayan (OPT_OUT, PENDING veya tanımsız) tüm müşteriler elenir.
 */
export function filterPermittedRecipients<T extends CustomerForSegmentation>(
  customers: T[]
): { permitted: T[]; rejectedCount: number } {
  const permitted: T[] = [];
  let rejectedCount = 0;

  for (const c of customers) {
    if (!c.phone || c.phone.trim().length < 10) {
      rejectedCount++;
      continue;
    }

    if (c.consentStatus === CRM_CONSENT_STATUS.OPT_IN) {
      permitted.push(c);
    } else {
      rejectedCount++;
    }
  }

  return { permitted, rejectedCount };
}

/**
 * Dinamik kampanya şablon değişkenlerini müşteriye ve bayiye göre doldurur.
 * ETK Gereği: Şablonda ret metni yoksa yasal ret uyarısı otomatik olarak sona eklenir.
 */
export function buildPersonalizedCampaignMessage(
  template: string,
  customer: {
    name: string;
    loyaltyPoints?: number;
    discountPercent?: number;
    expiryDate?: string;
  },
  dealer: {
    name: string;
  },
  customOptOutText?: string
): string {
  const firstName = customer.name.split(' ')[0] || customer.name;
  const points = customer.loyaltyPoints !== undefined ? customer.loyaltyPoints.toString() : '0';
  const discount = customer.discountPercent !== undefined ? `%${customer.discountPercent}` : '';
  const expiry = customer.expiryDate || '';
  const optOutText = customOptOutText || CRM_DEFAULTS.DEFAULT_OPT_OUT_TEXT;

  let message = template
    .replaceAll(CRM_MESSAGE_VARIABLES.CUSTOMER_NAME, firstName)
    .replaceAll(CRM_MESSAGE_VARIABLES.CUSTOMER_FULL_NAME, customer.name)
    .replaceAll(CRM_MESSAGE_VARIABLES.POINTS_BALANCE, points)
    .replaceAll(CRM_MESSAGE_VARIABLES.DISCOUNT_PERCENT, discount)
    .replaceAll(CRM_MESSAGE_VARIABLES.STORE_NAME, dealer.name)
    .replaceAll(CRM_MESSAGE_VARIABLES.EXPIRY_DATE, expiry);

  // Ret ibaresi yer alıyorsa değiştir, yoksa zorunlu olarak sona ekle
  if (message.includes(CRM_MESSAGE_VARIABLES.OPT_OUT_INSTRUCTION)) {
    message = message.replaceAll(CRM_MESSAGE_VARIABLES.OPT_OUT_INSTRUCTION, optOutText);
  } else {
    message = `${message.trim()}\n\n---\n${optOutText}`;
  }

  return message;
}

/**
 * Müşteri telefon numarasını ve kişiselleştirilmiş mesajı WhatsApp Web/Deep link formatına çevirir.
 */
export function generateWhatsAppBroadcastUrl(phone: string, message: string): string {
  const cleanPhone = phone.replace(/\D/g, '');
  const targetPhone = cleanPhone.startsWith('90')
    ? cleanPhone
    : cleanPhone.startsWith('0')
    ? `9${cleanPhone}`
    : `90${cleanPhone}`;

  return `https://wa.me/${targetPhone}?text=${encodeURIComponent(message)}`;
}

/**
 * Kampanya alıcı listesi üzerinden gönderim istatistiklerini hesaplar.
 */
export function calculateCampaignAnalytics(recipients: Array<{ status: string }>) {
  const total = recipients.length;
  let sent = 0;
  let failed = 0;
  let optedOut = 0;
  let pending = 0;

  for (const r of recipients) {
    if (r.status === 'SENT') sent++;
    else if (r.status === 'FAILED') failed++;
    else if (r.status === 'OPTED_OUT') optedOut++;
    else pending++;
  }

  const deliveryRate = total > 0 ? Math.round((sent / total) * 100) : 0;

  return {
    total,
    sent,
    failed,
    optedOut,
    pending,
    deliveryRate,
  };
}
