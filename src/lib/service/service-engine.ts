import {
  SERVICE_DEFAULTS,
  SERVICE_ORDER_STATUS,
  ServiceOrderStatus,
  SERVICE_STATUS_LABELS,
} from '@/constants/service';
import { roundMoney, roundGrams } from '@/lib/security/validation';

/**
 * Sıradaki servis takip numarasını üretir (Örn: SRV-2026-0001).
 */
export function generateServiceNumber(dealerId: string, currentCount: number): string {
  const currentYear = new Date().getFullYear();
  const sequenceNumber = (currentCount + 1).toString().padStart(4, '0');
  return `${SERVICE_DEFAULTS.PREFIX}-${currentYear}-${sequenceNumber}`;
}

/**
 * Servis iş emri durum geçiş kurallarını ve müşteri onayı zorunluluğunu denetler.
 * Kural: Müşteri onayı olmadan (isCustomerApproved === false) ücretli işe (estimatedCostTl > 0) başlanamaz.
 */
export function canTransitionServiceStatus(
  fromStatus: ServiceOrderStatus,
  toStatus: ServiceOrderStatus,
  isCustomerApproved: boolean,
  estimatedCostTl: number
): { allowed: boolean; reason?: string } {
  // İptal edilmiş veya teslim edilmiş işler doğrudan başka aşamaya alınamaz
  if (fromStatus === SERVICE_ORDER_STATUS.CANCELLED) {
    return { allowed: false, reason: 'İptal edilmiş servis kaydı yeniden durum değiştiremez.' };
  }
  if (fromStatus === SERVICE_ORDER_STATUS.DELIVERED && toStatus !== SERVICE_ORDER_STATUS.CANCELLED) {
    return { allowed: false, reason: 'Teslim edilmiş servis kaydı doğrudan değiştirilemez.' };
  }

  // Ücretli işlerde müşteri onayı zorunluluğu
  if (
    (toStatus === SERVICE_ORDER_STATUS.APPROVED || toStatus === SERVICE_ORDER_STATUS.IN_WORKSHOP) &&
    estimatedCostTl > 0 &&
    !isCustomerApproved
  ) {
    return {
      allowed: false,
      reason: 'Müşteri onayı alınmadan ücretli tamir/işleme başlanamaz ve atölyeye sevk edilemez.',
    };
  }

  return { allowed: true };
}

/**
 * Vaat edilen teslim tarihine göre gecikme (overdue) analizi yapar.
 */
export function checkServiceOverdue(
  promisedDate: Date | string,
  deliveredAt?: Date | string | null
): { isOverdue: boolean; overdueDays: number } {
  // Zaten teslim edilmişse gecikme kapanmıştır
  if (deliveredAt) {
    const pDate = new Date(promisedDate);
    const dDate = new Date(deliveredAt);
    if (dDate > pDate) {
      const diffMs = dDate.getTime() - pDate.getTime();
      const overdueDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
      return { isOverdue: true, overdueDays };
    }
    return { isOverdue: false, overdueDays: 0 };
  }

  const pDate = new Date(promisedDate);
  const now = new Date();

  if (now > pDate) {
    const diffMs = now.getTime() - pDate.getTime();
    const overdueDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    return { isOverdue: true, overdueDays };
  }

  return { isOverdue: false, overdueDays: 0 };
}

/**
 * Teslim anında garanti bitiş tarihini hesaplar.
 */
export function calculateWarrantyExpiry(
  deliveredAt: Date | string,
  warrantyMonths: number = SERVICE_DEFAULTS.DEFAULT_WARRANTY_MONTHS
): Date {
  const delivery = new Date(deliveredAt);
  const expiry = new Date(delivery);
  expiry.setMonth(expiry.getMonth() + Math.max(1, warrantyMonths));
  return expiry;
}

/**
 * Müşteriye WhatsApp formatlı servis bildirim mesajı üretir.
 */
export function formatServiceWhatsAppNotification(service: {
  customerName: string;
  customerPhone: string;
  serviceNumber: string;
  itemDescription: string;
  status: ServiceOrderStatus;
  finalCostTl: number;
  warrantyMonths?: number;
}): string {
  const cleanPhone = service.customerPhone.replace(/\D/g, '');
  const targetPhone = cleanPhone.startsWith('90')
    ? cleanPhone
    : cleanPhone.startsWith('0')
    ? `9${cleanPhone}`
    : `90${cleanPhone}`;

  let messageBody = '';

  switch (service.status) {
    case SERVICE_ORDER_STATUS.RECEIVED:
      messageBody = `Sayın *${service.customerName}*,\n\n*${service.itemDescription}* ürününüz *${service.serviceNumber}* takip numarasıyla servisimize teslim alınmıştır. Bakım ve fiyat incelemesi tamamlandığında tarafınıza bilgi verilecektir.\n\nSağlıklı günler dileriz.`;
      break;

    case SERVICE_ORDER_STATUS.QUOTED:
      messageBody = `Sayın *${service.customerName}*,\n\n*${service.serviceNumber}* no'lu *${service.itemDescription}* servis işleminiz için tahmini maliyet *₺${service.finalCostTl.toLocaleString('tr-TR')}* olarak belirlenmiştir. İşleme başlamak için onayınızı rica ederiz.\n\nOnaylamak için bu mesaja "ONAYLIYORUM" yazabilirsiniz.`;
      break;

    case SERVICE_ORDER_STATUS.READY:
      messageBody = `Sayın *${service.customerName}*,\n\n*${service.serviceNumber}* no'lu *${service.itemDescription}* bakım/tamir işleminiz başarıyla tamamlanmıştır. Mağazamızdan teslim alabilirsiniz.\n\nÖdenecek Tutar: *₺${service.finalCostTl.toLocaleString('tr-TR')}*\n\nBizi tercih ettiğiniz için teşekkür ederiz.`;
      break;

    case SERVICE_ORDER_STATUS.DELIVERED:
      messageBody = `Sayın *${service.customerName}*,\n\n*${service.serviceNumber}* no'lu *${service.itemDescription}* ürününüz teslim edilmiştir. Yapılan işlem *${service.warrantyMonths || 6} Ay* mağaza garantimiz altındadır.\n\nİyi günlerde kullanmanızı dileriz.`;
      break;

    default:
      messageBody = `Sayın *${service.customerName}*,\n\n*${service.serviceNumber}* takip numaralı servis işleminizin güncel durumu: *${SERVICE_STATUS_LABELS[service.status] || service.status}* olarak güncellenmiştir.`;
      break;
  }

  return `https://wa.me/${targetPhone}?text=${encodeURIComponent(messageBody)}`;
}
