/**
 * Toptancı Sipariş Takibi & WhatsApp Sipariş Mesajı Üretici
 */

export interface PoLineItem {
  productCategory: string;
  description: string;
  carat: number;
  orderedWeight: number;
  orderedQuantity: number;
  laborCostPerGram?: number;
  notes?: string | null;
}

export interface PoMessagePayload {
  orderNumber: string;
  orderDate: Date | string;
  expectedDeliveryDate?: Date | string | null;
  supplierName: string;
  dealerName: string;
  totalEstimatedWeight: number;
  totalEstimatedHas: number;
  notes?: string | null;
  lines: PoLineItem[];
}

/**
 * Telefon numarasını WhatsApp uluslararası formatına normalize eder (+90532xxxxxxx -> 90532xxxxxxx).
 */
export function normalizePhoneNumber(rawPhone: string | null | undefined): string {
  if (!rawPhone) return '';
  // Rakam haricindeki her şeyi ayıkla
  let digits = rawPhone.replace(/\D/g, '');
  if (!digits) return '';

  // 0532xxxxxxx -> 90532xxxxxxx
  if (digits.startsWith('0') && digits.length === 11) {
    digits = '9' + digits;
  }
  // 532xxxxxxx -> 90532xxxxxxx
  else if (digits.length === 10 && digits.startsWith('5')) {
    digits = '90' + digits;
  }

  // En az 10 hane olmalı
  if (digits.length < 10) return '';
  return digits;
}

/**
 * Toptancıya iletilecek WhatsApp sipariş fiş metnini üretir.
 */
export function formatPurchaseOrderWhatsAppMessage(payload: PoMessagePayload): string {
  const dateStr = payload.orderDate instanceof Date 
    ? payload.orderDate.toLocaleDateString('tr-TR')
    : new Date(payload.orderDate).toLocaleDateString('tr-TR');

  const deliveryStr = payload.expectedDeliveryDate
    ? (payload.expectedDeliveryDate instanceof Date 
        ? payload.expectedDeliveryDate.toLocaleDateString('tr-TR')
        : new Date(payload.expectedDeliveryDate).toLocaleDateString('tr-TR'))
    : 'Belirtilmedi';

  let msg = `*📦 SİPARİŞ BİLGİ FORMU — ${payload.dealerName}*\n`;
  msg += `*Sipariş No:* ${payload.orderNumber}\n`;
  msg += `*Tarih:* ${dateStr}\n`;
  msg += `*Sayın:* ${payload.supplierName}\n`;
  msg += `*Termin:* ${deliveryStr}\n`;
  msg += `━━━━━━━━━━━━━━━━━━━━\n`;
  msg += `*SİPARİŞ KALEMLERİ:*\n`;

  payload.lines.forEach((line, idx) => {
    msg += `\n*${idx + 1}.* ${line.description} (${line.carat}K)\n`;
    msg += `   • Adet: ${line.orderedQuantity} | Tahmini Gramaj: ${line.orderedWeight.toFixed(2)} gr\n`;
    if (line.laborCostPerGram && line.laborCostPerGram > 0) {
      msg += `   • İşçilik: ${line.laborCostPerGram.toFixed(2)} TL/gr\n`;
    }
    if (line.notes) {
      msg += `   • Not: ${line.notes}\n`;
    }
  });

  msg += `\n━━━━━━━━━━━━━━━━━━━━\n`;
  msg += `*TOPLAM BEKLENEN:* ~${payload.totalEstimatedWeight.toFixed(2)} gr (${payload.totalEstimatedHas.toFixed(2)} gr Has)\n`;

  if (payload.notes) {
    msg += `*Genel Sipariş Notu:* ${payload.notes}\n`;
  }

  msg += `\n_Lütfen siparişin imalat/teslimat durumunu teyit ediniz. İyi çalışmalar dileriz._`;
  return msg;
}

/**
 * WhatsApp Web / Mobil App Intent bağlantısı oluşturur.
 */
export function buildWhatsAppIntentUrl(phone: string, message: string): string {
  const cleanPhone = normalizePhoneNumber(phone);
  const encodedText = encodeURIComponent(message);
  return `https://wa.me/${cleanPhone}?text=${encodedText}`;
}
