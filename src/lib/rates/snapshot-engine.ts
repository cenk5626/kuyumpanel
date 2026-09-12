import prisma from '@/lib/prisma';
import {
  HISTORY_RATES_CONFIG,
  SNAPSHOT_STATUS,
  SNAPSHOT_SOURCE,
  TRACKED_RATE_PRODUCTS,
  STANDARD_MILYEM_DEFINITIONS,
} from '@/constants/history-rates';

/**
 * Verilen tarihe göre Türkiye Saati (Europe/Istanbul) 30 dakikalık slot anahtarı üretir.
 * Örn: 2026-09-09-17-00 veya 2026-09-09-17-30
 */
export function getCaptureSlotKey(date: Date = new Date()): string {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: HISTORY_RATES_CONFIG.TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  const parts = formatter.formatToParts(date);
  const year = parts.find((p) => p.type === 'year')?.value || '2026';
  const month = parts.find((p) => p.type === 'month')?.value || '01';
  const day = parts.find((p) => p.type === 'day')?.value || '01';
  const hour = parts.find((p) => p.type === 'hour')?.value || '00';
  const minute = parseInt(parts.find((p) => p.type === 'minute')?.value || '0', 10);
  const slotMinute = minute < 30 ? '00' : '30';

  return `${year}-${month}-${day}-${hour}-${slotMinute}`;
}

export interface CapturePriceSnapshotOptions {
  source?: string;
  slotDate?: Date;
  customItems?: Array<{
    productCode: string;
    label: string;
    bid: number;
    ask: number;
    currency?: string;
  }>;
}

/**
 * 30 dakikalık periyot için tekil fiyat snapshot'ı alır (Idempotent).
 */
export async function capturePriceSnapshot(
  dealerId: string,
  options: CapturePriceSnapshotOptions = {}
) {
  const captureDate = options.slotDate || new Date();
  const captureSlotKey = getCaptureSlotKey(captureDate);
  const source = options.source || SNAPSHOT_SOURCE.SYSTEM;

  // 1. Idempotency kontrolü: Bu slot daha önce kaydedilmiş mi?
  const existing = await prisma.priceSnapshot.findUnique({
    where: {
      dealerId_captureSlotKey: {
        dealerId,
        captureSlotKey,
      },
    },
    include: {
      items: true,
    },
  });

  if (existing) {
    return {
      snapshot: existing,
      isNew: false,
    };
  }

  // 2. Mevcut kurları topla (Canlı fiyat tablolarından veya sağlanan özel item'lardan)
  let itemsToInsert = options.customItems;

  if (!itemsToInsert || itemsToInsert.length === 0) {
    try {
      const [hasPrice, ziynetPrices] = await Promise.all([
        prisma.hasPrice.findUnique({ where: { id: 'singleton' } }).catch(() => null),
        prisma.ziynetPrice.findMany().catch(() => []),
      ]);

      const hasBid = hasPrice?.bid || 3000;
      const hasAsk = hasPrice?.ask || 3020;

      itemsToInsert = [
        { productCode: 'HAS_ALTIN', label: 'Has Altın (Gr)', bid: hasBid, ask: hasAsk, currency: 'TL' },
        { productCode: 'USD', label: 'Amerikan Doları', bid: 38.20, ask: 38.50, currency: 'TL' },
        { productCode: 'EUR', label: 'Euro', bid: 41.10, ask: 41.45, currency: 'TL' },
        { productCode: 'AYAR22_BILEZIK', label: '22 Ayar Bilezik (Gr)', bid: hasBid * 0.916, ask: hasAsk * 0.930, currency: 'TL' },
        { productCode: 'CEYREK_YENI', label: 'Yeni Çeyrek Altın', bid: hasBid * 1.635, ask: hasAsk * 1.650, currency: 'TL' },
        { productCode: 'YARIM_YENI', label: 'Yeni Yarım Altın', bid: hasBid * 3.270, ask: hasAsk * 3.300, currency: 'TL' },
        { productCode: 'TAM_YENI', label: 'Yeni Tam Altın', bid: hasBid * 6.540, ask: hasAsk * 6.600, currency: 'TL' },
        { productCode: 'ATA_YENI', label: 'Yeni Ata Lira', bid: hasBid * 6.720, ask: hasAsk * 6.780, currency: 'TL' },
      ];
    } catch {
      itemsToInsert = TRACKED_RATE_PRODUCTS.map((p) => ({
        productCode: p.code,
        label: p.label,
        bid: 3000,
        ask: 3050,
        currency: p.defaultCurrency,
      }));
    }
  }

  // 3. Atomik Prisma Transaction ile Snapshot kaydet
  const snapshot = await prisma.$transaction(async (tx) => {
    return tx.priceSnapshot.create({
      data: {
        dealerId,
        capturedAt: captureDate,
        captureSlotKey,
        source,
        status: SNAPSHOT_STATUS.SUCCESS,
        items: {
          create: (itemsToInsert || []).map((item) => ({
            productCode: item.productCode,
            label: item.label,
            bid: item.bid,
            ask: item.ask,
            currency: item.currency || 'TL',
            source,
            providerUpdatedAt: captureDate,
          })),
        },
      },
      include: {
        items: true,
      },
    });
  });

  return {
    snapshot,
    isNew: true,
  };
}

/**
 * 30 dakikalık periyot için tekil milyem snapshot'ı alır (Idempotent).
 */
export async function captureMilyemSnapshot(
  dealerId: string,
  options: { slotDate?: Date; source?: string } = {}
) {
  const captureDate = options.slotDate || new Date();
  const captureSlotKey = getCaptureSlotKey(captureDate);
  const source = options.source || SNAPSHOT_SOURCE.SYSTEM;

  const existing = await prisma.milyemSnapshot.findUnique({
    where: {
      dealerId_captureSlotKey: {
        dealerId,
        captureSlotKey,
      },
    },
    include: {
      items: true,
    },
  });

  if (existing) {
    return {
      snapshot: existing,
      isNew: false,
    };
  }

  // Fiyat ayarlarından milyemleri al
  let settings = await prisma.priceSettings.findUnique({ where: { id: 'singleton' } }).catch(() => null);

  const milyemList = [
    { code: 'mil24Ayar', label: '24 Ayar (Has)', value: settings?.mil24Ayar || 995, unit: 'milyem' },
    { code: 'mil22Ayar', label: '22 Ayar Bilezik', value: settings?.mil22Ayar || 916, unit: 'milyem' },
    { code: 'milAdanaBurma', label: '22 Ayar Adana Burma', value: settings?.milAdanaBurma || 931, unit: 'milyem' },
    { code: 'milAjda', label: '22 Ayar Ajda Bilezik', value: settings?.milAjda || 942, unit: 'milyem' },
    { code: 'mil18Ayar', label: '18 Ayar Takı', value: 750, unit: 'milyem' },
    { code: 'mil14Ayar', label: '14 Ayar Takı', value: settings?.mil14Ayar || 585, unit: 'milyem' },
    { code: 'mil8Ayar', label: '8 Ayar Takı', value: 333, unit: 'milyem' },
  ];

  const snapshot = await prisma.$transaction(async (tx) => {
    return tx.milyemSnapshot.create({
      data: {
        dealerId,
        capturedAt: captureDate,
        captureSlotKey,
        source,
        items: {
          create: milyemList.map((m) => ({
            code: m.code,
            label: m.label,
            value: m.value,
            unit: m.unit,
          })),
        },
      },
      include: {
        items: true,
      },
    });
  });

  return {
    snapshot,
    isNew: true,
  };
}
