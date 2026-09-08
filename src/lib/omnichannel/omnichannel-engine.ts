/**
 * kuyumpanel - E-Commerce & Omnichannel Integration Engine
 * Real-time price calculation, oversell prevention and payload normalization.
 */

import {
  OMNICHANNEL_DEFAULTS,
  OMNICHANNEL_ERRORS,
} from '@/constants/omnichannel';

export interface ChannelOrderItem {
  barcode: string;
  title: string;
  quantity: number;
  price: number;
}

export interface StandardizedExternalOrder {
  orderNumber: string;
  customerName: string;
  customerPhone?: string;
  totalAmount: number;
  items: ChannelOrderItem[];
  orderedAt: string;
}

/**
 * Pazaryeri satış fiyatını hesaplar (Komisyon farkı ve canlı altın kuru artışı dahil).
 */
export function calculateChannelSellingPrice(
  basePrice: number,
  markupPercent: number = OMNICHANNEL_DEFAULTS.DEFAULT_MARKUP_PERCENT,
  goldRateChangePercent: number = 0
): number {
  if (basePrice <= 0) return 0;

  // Altın kuru artışı varsa baz fiyata yansıt
  const adjustedBase = basePrice * (1 + (goldRateChangePercent > 0 ? goldRateChangePercent / 100 : 0));

  // Pazaryeri komisyon marjı ekle (örn: %15)
  const priceWithMarkup = adjustedBase * (1 + markupPercent / 100);

  // En yakın 10 TL'ye yuvarla (örn: 1243 TL -> 1250 TL)
  // Kuruş hassasiyetinde floating-point toleransı (11550.000000000002 -> 11550)
  const normalizedPrice = Math.round(priceWithMarkup * 100) / 100;
  const step = OMNICHANNEL_DEFAULTS.PRICE_ROUND_STEP;
  return Math.ceil(normalizedPrice / step) * step;
}

/**
 * Çifte Satış (Oversell) Riski Kontrolü.
 * Mağaza stoğu ile internetten gelen bekleyen siparişleri kıyaslar.
 */
export function checkOversellRisk(
  inStockQuantity: number,
  externalPendingOrdersQuantity: number
): {
  isRisk: boolean;
  availableQuantity: number;
  message?: string;
} {
  const available = inStockQuantity - externalPendingOrdersQuantity;

  if (available <= 0) {
    return {
      isRisk: true,
      availableQuantity: Math.max(0, available),
      message: OMNICHANNEL_ERRORS.OVERSELL_RISK,
    };
  }

  return {
    isRisk: false,
    availableQuantity: available,
  };
}

/**
 * Farklı pazar yeri webhook yüklerini standart formatımıza dönüştürür.
 */
export function parseExternalOrderPayload(
  channelType: string,
  raw: any
): StandardizedExternalOrder {
  if (!raw) {
    throw new Error('Geçersiz sipariş yükü.');
  }

  // Standart format
  if (raw.orderNumber && raw.items) {
    return {
      orderNumber: String(raw.orderNumber),
      customerName: raw.customerName || 'Misafir Müşteri',
      customerPhone: raw.customerPhone || undefined,
      totalAmount: Number(raw.totalAmount || 0),
      items: Array.isArray(raw.items)
        ? raw.items.map((it: any) => ({
            barcode: it.barcode || it.sku || 'BARCODE-YOK',
            title: it.title || it.productName || 'Ürün',
            quantity: Number(it.quantity || 1),
            price: Number(it.price || 0),
          }))
        : [],
      orderedAt: raw.orderedAt || new Date().toISOString(),
    };
  }

  // Trendyol Webhook Formatı Fallback
  if (raw.orderNumber || raw.lines) {
    const items = (raw.lines || []).map((l: any) => ({
      barcode: l.barcode || l.merchantSku || 'TY-ITEM',
      title: l.productName || 'Trendyol Ürünü',
      quantity: Number(l.quantity || 1),
      price: Number(l.price || 0),
    }));

    const total = items.reduce((sum: number, it: any) => sum + it.price * it.quantity, 0);

    return {
      orderNumber: String(raw.orderNumber || `TY-${Date.now()}`),
      customerName: raw.customerFirstName
        ? `${raw.customerFirstName} ${raw.customerLastName || ''}`.trim()
        : 'Trendyol Müşterisi',
      customerPhone: raw.shipmentAddress?.phone,
      totalAmount: total,
      items,
      orderedAt: new Date().toISOString(),
    };
  }

  throw new Error('Desteklenmeyen pazaryeri sipariş formatı.');
}

/**
 * Yeni pazar yeri siparişi geldiğinde kuyumcuya anlık WhatsApp bildirim mesajı üretir.
 * Böylece vitrindeki ürün derhal ayrılabilir!
 */
export function formatOmnichannelOrderWhatsAppNotification(order: {
  orderNumber: string;
  channelName: string;
  customerName: string;
  totalAmount: number;
  itemCount: number;
}): string {
  return (
    `🛍️ *KuyumPanel — Yeni İnternet Siparişi!*\n\n` +
    `*Kanal:* ${order.channelName}\n` +
    `*Sipariş No:* #${order.orderNumber}\n` +
    `*Müşteri:* ${order.customerName}\n` +
    `*Tutar:* ${order.totalAmount.toLocaleString('tr-TR')} TL\n` +
    `*Ürün Adedi:* ${order.itemCount} adet\n\n` +
    `⚠️ *DİKKAT:* Lütfen vitrindeki ilgili takıyı derhal ayırarak çifte satışı önleyiniz.`
  );
}
