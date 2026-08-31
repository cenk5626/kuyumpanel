/**
 * WhatsApp 1-Click Paylaşım & İletişim Entegrasyon Modülü
 * Sıfır Magic Number / String Kuralına Uygun Tanımlamalar
 */

import { MESSAGES } from '@/constants/messages';

// ─── Sabitler & Konfigürasyon ──────────────────────────────────────────────────

export const WHATSAPP_CONFIG = {
  BASE_URL: 'https://wa.me/',
  API_BASE_URL: 'https://api.whatsapp.com/send',
  COUNTRY_CODE_TR: '90',
  DEFAULT_STORE_NAME: 'Kuyumcu Panel Mücevherat',
  SEPARATORS: {
    LINE: '--------------------------------',
    DASH: '— — — — — — — — — — — — — — — —',
  },
} as const;

// ─── Tipler ───────────────────────────────────────────────────────────────────

export interface WhatsAppReceiptItem {
  title: string;
  carat?: number | string;
  weight?: number;
  priceTL: number;
  quantity?: number;
  barcode?: string;
}

export interface WhatsAppReceiptData {
  phone?: string | null;
  customerName?: string;
  items: WhatsAppReceiptItem[];
  totalTL: number;
  date?: string;
  paymentMethod?: string;
  storeName?: string;
  employeeName?: string;
}

export interface WhatsAppStatementTxItem {
  date: string;
  type: string; // BORC | TAHSILAT | ODEME | ALACAK
  assetType: string; // TL | HAS | 22K | 14K | CEYREK vb.
  amount: number;
  hasEquivalent?: number;
  description?: string | null;
}

export interface WhatsAppStatementData {
  phone?: string | null;
  customerName: string;
  hasBalance: number; // gr Has cinsinden borç (+) veya alacak (-)
  tlBalance: number;  // TL cinsinden borç (+) veya alacak (-)
  spotRate?: number;  // Anlık Has altın kuru
  estimatedTotalTL?: number;
  recentTransactions?: WhatsAppStatementTxItem[];
  storeName?: string;
  date?: string;
}

export interface WhatsAppQuoteData {
  phone?: string | null;
  customerName?: string;
  productTitle: string;
  barcode?: string;
  carat: number | string;
  weight: number;
  sellingPriceTL: number;
  hasPrice?: number;
  usdEquivalent?: number;
  eurEquivalent?: number;
  storeName?: string;
  date?: string;
}

export interface WhatsAppWholesaleOrderItem {
  productCode: string;
  label: string;
  quantity: number;
  unit?: string;
  currentStock?: number;
  minThreshold?: number;
  estimatedHasWeight?: number;
}

export interface WhatsAppWholesaleOrderData {
  phone?: string | null;
  supplierName: string;
  items: WhatsAppWholesaleOrderItem[];
  storeName?: string;
  date?: string;
  orderNote?: string;
}

// ─── Telefon Numarası Temizleyici / Formatlayıcı ──────────────────────────────

/**
 * Türkiye ve uluslararası telefon numaralarını WhatsApp formatına normalize eder.
 * Örnek: '0532 123 45 67' -> '905321234567'
 */
export function normalizePhoneNumber(phone: string): string {
  if (!phone) return '';
  let cleaned = phone.replace(/[^0-9]/g, '');
  if (cleaned.startsWith('0')) {
    cleaned = cleaned.substring(1);
  }
  if (!cleaned.startsWith(WHATSAPP_CONFIG.COUNTRY_CODE_TR) && cleaned.length === 10) {
    cleaned = WHATSAPP_CONFIG.COUNTRY_CODE_TR + cleaned;
  }
  return cleaned;
}

/**
 * Temizlenmiş telefon ve mesaj metni ile doğrudan WhatsApp linki üretir.
 * Telefon boş ise doğrudan text parametresi ile genel chat linki döner.
 */
export function buildWhatsAppLink(phone: string | null | undefined, message: string): string {
  const normalized = phone ? normalizePhoneNumber(phone) : '';
  const encodedText = encodeURIComponent(message);
  if (normalized) {
    return `${WHATSAPP_CONFIG.BASE_URL}${normalized}?text=${encodedText}`;
  }
  return `${WHATSAPP_CONFIG.API_BASE_URL}?text=${encodedText}`;
}

// ─── 1. Satış Bilgi Fişi (Receipt) Formatlayıcı ───────────────────────────────

/**
 * Perakende satış fişini WhatsApp formatında hazırlar ve link üretir.
 */
export function generateWhatsAppReceiptUrl(data: WhatsAppReceiptData): string {
  const store = data.storeName || WHATSAPP_CONFIG.DEFAULT_STORE_NAME;
  const dateStr = data.date || new Date().toLocaleDateString('tr-TR');
  const customer = data.customerName || 'Değerli Müşterimiz';

  const lines: string[] = [
    `💎 *${store}*`,
    `📋 *SATIŞ BİLGİ FİŞİ*`,
    `📅 Tarih: ${dateStr}`,
    `👤 Müşteri: ${customer}`,
  ];

  if (data.employeeName) {
    lines.push(`👨‍💼 Kasiyer: ${data.employeeName}`);
  }

  lines.push(WHATSAPP_CONFIG.SEPARATORS.LINE);

  if (!data.items || data.items.length === 0) {
    lines.push(`(Ürün kaydı bulunamadı)`);
  } else {
    data.items.forEach((item, idx) => {
      const caratStr = item.carat ? `${item.carat}K` : '';
      const weightStr = item.weight != null ? `${item.weight.toFixed(2)} gr` : '';
      const details = [caratStr, weightStr].filter(Boolean).join(', ');
      const detailParen = details ? ` (${details})` : '';
      const qtyStr = item.quantity && item.quantity > 1 ? ` [${item.quantity} Adet]` : '';
      const priceStr = `${item.priceTL.toLocaleString('tr-TR')} TL`;
      lines.push(`${idx + 1}. ${item.title}${detailParen}${qtyStr} - ${priceStr}`);
    });
  }

  lines.push(WHATSAPP_CONFIG.SEPARATORS.LINE);
  lines.push(`💰 *TOPLAM TUTAR:* ${data.totalTL.toLocaleString('tr-TR')} TL`);

  if (data.paymentMethod) {
    lines.push(`💳 Ödeme Yöntemi: ${data.paymentMethod}`);
  }

  lines.push(WHATSAPP_CONFIG.SEPARATORS.LINE);
  lines.push(`Bizi tercih ettiğiniz için teşekkür ederiz! ✨`);

  return buildWhatsAppLink(data.phone, lines.join('\n'));
}

/**
 * Test ve domain yardımcıları ile tam uyumlu alias
 */
export function buildWhatsAppSaleReceiptUrl(
  phone: string,
  customerName: string,
  items: Array<{ title: string; carat?: number | string; weight?: number; priceTL: number; quantity?: number }>,
  totalTL: number,
  date: string = new Date().toLocaleDateString('tr-TR')
): string {
  return generateWhatsAppReceiptUrl({
    phone,
    customerName,
    items,
    totalTL,
    date,
  });
}

// ─── 2. Müşteri Hesap Ekstresi (Statement) Formatlayıcı ───────────────────────

/**
 * Müşteri borç/alacak hesabını ve son hareketlerini WhatsApp metnine dönüştürür.
 */
export function generateWhatsAppStatementUrl(data: WhatsAppStatementData): string {
  const store = data.storeName || WHATSAPP_CONFIG.DEFAULT_STORE_NAME;
  const dateStr = data.date || new Date().toLocaleDateString('tr-TR');
  const spotRate = data.spotRate || 3000;
  const totalValuation = data.estimatedTotalTL ?? (data.tlBalance + data.hasBalance * spotRate);

  const lines: string[] = [
    `💎 *${store}*`,
    `📑 *MÜŞTERİ HESAP EKSTRESİ*`,
    `📅 Tarih: ${dateStr}`,
    `👤 Müşteri: ${data.customerName}`,
    WHATSAPP_CONFIG.SEPARATORS.LINE,
    `⚖️ *Has Altın Bakiyesi:* ${data.hasBalance.toFixed(3)} gr Has`,
    `💵 *TL Nakit Bakiyesi:* ₺${data.tlBalance.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}`,
    `📈 *Anlık Has Değerleme:* ₺${spotRate.toLocaleString('tr-TR')}/gr`,
    `💰 *TOPLAM HESAP DEĞERİ:* ₺${totalValuation.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}`,
  ];

  if (data.recentTransactions && data.recentTransactions.length > 0) {
    lines.push(WHATSAPP_CONFIG.SEPARATORS.LINE);
    lines.push(`📝 *Son Hesap Hareketleri:*`);
    const last5 = data.recentTransactions.slice(-5);
    last5.forEach((tx, idx) => {
      const typeLabel = tx.type === 'BORC' ? 'Borç' : tx.type === 'TAHSILAT' ? 'Tahsilat' : tx.type;
      const desc = tx.description ? ` (${tx.description})` : '';
      lines.push(`${idx + 1}. [${tx.date}] ${typeLabel}: ${tx.amount.toLocaleString('tr-TR')} ${tx.assetType}${desc}`);
    });
  }

  lines.push(WHATSAPP_CONFIG.SEPARATORS.LINE);
  lines.push(`Herhangi bir sorunuzda bizimle iletişime geçebilirsiniz. İyi günler dileriz! ✨`);

  return buildWhatsAppLink(data.phone, lines.join('\n'));
}

// ─── 3. Fiyat Teklifi (Price Quote) Formatlayıcı ──────────────────────────────

/**
 * Kiosk veya müşteri danışma ekranındaki anlık fiyat teklifini WhatsApp ile paylaşır.
 */
export function generateWhatsAppQuoteUrl(data: WhatsAppQuoteData): string {
  const store = data.storeName || WHATSAPP_CONFIG.DEFAULT_STORE_NAME;
  const dateStr = data.date || new Date().toLocaleDateString('tr-TR');
  const customer = data.customerName ? ` ${data.customerName}` : '';

  const lines: string[] = [
    `💎 *${store}*`,
    `✨ *ÖZEL FİYAT TEKLİFİ*`,
    `📅 Tarih: ${dateStr}`,
    customer ? `👤 Sayın${customer},` : '',
    WHATSAPP_CONFIG.SEPARATORS.LINE,
    `💍 *Ürün:* ${data.productTitle}`,
    data.barcode ? `🏷️ *Barkod:* ${data.barcode}` : '',
    `⭐ *Ayar:* ${data.carat} Ayar`,
    `⚖️ *Ağırlık:* ${data.weight.toFixed(2)} gr`,
    WHATSAPP_CONFIG.SEPARATORS.LINE,
    `💰 *SATIŞ FİYATI:* ₺${data.sellingPriceTL.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}`,
  ].filter(Boolean);

  if (data.usdEquivalent && data.usdEquivalent > 0) {
    lines.push(`💵 Dolar Karşılığı: $${data.usdEquivalent.toFixed(2)}`);
  }
  if (data.eurEquivalent && data.eurEquivalent > 0) {
    lines.push(`💶 Euro Karşılığı: €${data.eurEquivalent.toFixed(2)}`);
  }

  lines.push(WHATSAPP_CONFIG.SEPARATORS.LINE);
  lines.push(`⚠️ *Not:* Fiyatlar anlık altın piyasasına göre düzenlenmiş olup gün içerisinde değişiklik gösterebilir.`);
  lines.push(`Sizleri mağazamızda ağırlamaktan onur duyarız! ✨`);

  return buildWhatsAppLink(data.phone, lines.join('\n'));
}

// ─── 4. Toptancı Sipariş & Tedarik Talebi Formatlayıcı ─────────────────────────

/**
 * Toptancıya veya atölyeye iletilecek sipariş taslağını WhatsApp sipariş mesajına dönüştürür.
 */
export function generateWhatsAppWholesaleOrderUrl(data: WhatsAppWholesaleOrderData): string {
  const store = data.storeName || WHATSAPP_CONFIG.DEFAULT_STORE_NAME;
  const dateStr = data.date || new Date().toLocaleDateString('tr-TR');

  const lines: string[] = [
    `🏭 *TOPTAN SİPARİŞ & TEDARİK TALEBİ*`,
    `💎 *Mağaza:* ${store}`,
    `📅 *Tarih:* ${dateStr}`,
    `🏢 *Tedarikçi / Atölye:* ${data.supplierName}`,
    WHATSAPP_CONFIG.SEPARATORS.LINE,
    `📦 *Sipariş Kalemleri:*`,
  ];

  let totalQty = 0;
  let totalEstimatedHas = 0;

  data.items.forEach((item, idx) => {
    totalQty += item.quantity;
    const unitStr = item.unit || 'Adet';
    const hasStr = item.estimatedHasWeight ? ` (~${item.estimatedHasWeight.toFixed(2)} gr Has)` : '';
    if (item.estimatedHasWeight) {
      totalEstimatedHas += item.estimatedHasWeight;
    }
    lines.push(`${idx + 1}. *${item.label}* (${item.productCode}) -> *${item.quantity} ${unitStr}*${hasStr}`);
  });

  lines.push(WHATSAPP_CONFIG.SEPARATORS.LINE);
  lines.push(`📊 *Toplam Kalem:* ${data.items.length} çeşit`);
  lines.push(`📦 *Toplam Miktar:* ${totalQty} adet/birim`);

  if (totalEstimatedHas > 0) {
    lines.push(`⚖️ *Tahmini Has Karşılığı:* ${totalEstimatedHas.toFixed(2)} gr Has`);
  }

  if (data.orderNote) {
    lines.push(`📝 *Sipariş Notu:* ${data.orderNote}`);
  }

  lines.push(WHATSAPP_CONFIG.SEPARATORS.LINE);
  lines.push(`Siparişin hazırlanarak tarafımıza bilgi verilmesini rica ederiz. İyi çalışmalar.`);

  return buildWhatsAppLink(data.phone, lines.join('\n'));
}

/**
 * Genel amaçlı WhatsApp paylaşım linki üretir.
 */
export function generateWhatsAppShareUrl(phone?: string | null, message: string = ''): string {
  return buildWhatsAppLink(phone, message);
}

