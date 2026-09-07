/**
 * kuyumpanel - RFID UHF Stocktaking & Tag Reconciliation Engine
 * Algorithms for EPC-Barcode mapping, continuous tag stream reconciliation and audit metrics.
 */

import {
  RFID_MATCH_STATUS,
  RFID_DEFAULTS,
  RfidMatchStatus,
} from '@/constants/rfid';

export interface ExpectedRfidItem {
  epc: string;
  barcode: string;
  title: string;
  carat?: number;
  weight?: number;
  expectedLocation?: string;
}

export interface ScannedTag {
  epc: string;
  rssi?: number;
  scannedAt?: string;
}

export interface ReconciledItem {
  epc: string;
  barcode?: string;
  title?: string;
  carat?: number;
  weight?: number;
  expectedLocation?: string;
  actualLocation?: string;
  matchStatus: RfidMatchStatus;
  readCount: number;
  rssi?: number;
}

export interface RfidReconciliationResult {
  totalExpected: number;
  totalScanned: number;
  matchedCount: number;
  missingCount: number;
  surplusCount: number;
  accuracyRatePercent: number;
  totalMissingWeightGr: number;
  items: ReconciledItem[];
}

/**
 * Ürün barkodundan deterministik 24 karakterli (96-bit) Hex EPC üretir.
 * Örn: "14KP0001" -> "E28011606000000031344B50"
 */
export function generateEpcFromBarcode(barcode: string): string {
  const cleanBarcode = barcode.trim().toUpperCase();
  let hexBarcode = '';
  for (let i = 0; i < cleanBarcode.length; i++) {
    hexBarcode += cleanBarcode.charCodeAt(i).toString(16).toUpperCase();
  }

  // Standart Gen2 Kuyum Başlığı (E280 = EPC Gen2 Standard Header)
  const header = 'E280';
  const padded = (header + hexBarcode.padStart(RFID_DEFAULTS.DEFAULT_TAG_LENGTH_HEX - header.length, '0')).slice(
    0,
    RFID_DEFAULTS.DEFAULT_TAG_LENGTH_HEX
  );

  return padded;
}

/**
 * Hex EPC kodundan orijinal barkodu çözümler.
 */
export function parseBarcodeFromEpc(epc: string): string | null {
  const cleanEpc = epc.trim().toUpperCase();
  if (cleanEpc.length !== RFID_DEFAULTS.DEFAULT_TAG_LENGTH_HEX) {
    return null;
  }

  // Header sonrasındaki sıfır olmayan hex karakterlerini ASCII'ye çevir
  const contentHex = cleanEpc.slice(4).replace(/^0+/, '');
  let barcode = '';
  for (let i = 0; i < contentHex.length; i += 2) {
    const part = contentHex.slice(i, i + 2);
    if (part.length === 2) {
      const code = parseInt(part, 16);
      if (code >= 32 && code <= 126) {
        barcode += String.fromCharCode(code);
      }
    }
  }

  return barcode || null;
}

/**
 * Beklenen ürünler listesi ile RFID okuyucudan gelen etiket akışını mutabakat eder.
 */
export function reconcileRfidScan(
  expectedItems: ExpectedRfidItem[],
  scannedTags: ScannedTag[],
  actualLocation: string = RFID_DEFAULTS.DEFAULT_LOCATION
): RfidReconciliationResult {
  // EPC bazında okuma sayıları ve en güçlü sinyali (RSSI) topla
  const scannedMap = new Map<string, { count: number; maxRssi: number; lastScanned: string }>();

  for (const tag of scannedTags) {
    const epc = tag.epc.trim().toUpperCase();
    if (!epc) continue;

    const existing = scannedMap.get(epc);
    const rssi = tag.rssi ?? -55;
    if (existing) {
      existing.count += 1;
      if (rssi > existing.maxRssi) existing.maxRssi = rssi;
    } else {
      scannedMap.set(epc, {
        count: 1,
        maxRssi: rssi,
        lastScanned: tag.scannedAt || new Date().toISOString(),
      });
    }
  }

  const expectedEpcSet = new Set<string>();
  const reconciledItems: ReconciledItem[] = [];

  let matchedCount = 0;
  let missingCount = 0;
  let totalMissingWeightGr = 0;

  // 1. Beklenen ürünleri kontrol et (MATCHED veya MISSING)
  for (const exp of expectedItems) {
    const epc = exp.epc.trim().toUpperCase();
    expectedEpcSet.add(epc);

    const scanData = scannedMap.get(epc);
    if (scanData) {
      matchedCount++;
      reconciledItems.push({
        epc,
        barcode: exp.barcode,
        title: exp.title,
        carat: exp.carat,
        weight: exp.weight,
        expectedLocation: exp.expectedLocation,
        actualLocation,
        matchStatus: RFID_MATCH_STATUS.MATCHED,
        readCount: scanData.count,
        rssi: scanData.maxRssi,
      });
    } else {
      missingCount++;
      totalMissingWeightGr += exp.weight || 0;
      reconciledItems.push({
        epc,
        barcode: exp.barcode,
        title: exp.title,
        carat: exp.carat,
        weight: exp.weight,
        expectedLocation: exp.expectedLocation,
        actualLocation: undefined,
        matchStatus: RFID_MATCH_STATUS.MISSING,
        readCount: 0,
        rssi: undefined,
      });
    }
  }

  // 2. Beklenmeyen (SURPLUS) etiketleri tespit et
  let surplusCount = 0;
  for (const [epc, data] of scannedMap.entries()) {
    if (!expectedEpcSet.has(epc)) {
      surplusCount++;
      const derivedBarcode = parseBarcodeFromEpc(epc);
      reconciledItems.push({
        epc,
        barcode: derivedBarcode || undefined,
        title: derivedBarcode ? `Harici Ürün (${derivedBarcode})` : 'Tanımsız RFID Etiketi',
        expectedLocation: 'Bilinmiyor',
        actualLocation,
        matchStatus: RFID_MATCH_STATUS.SURPLUS,
        readCount: data.count,
        rssi: data.maxRssi,
      });
    }
  }

  const totalExpected = expectedItems.length;
  const accuracyRatePercent =
    totalExpected > 0
      ? Math.round((matchedCount / totalExpected) * 1000) / 10
      : scannedMap.size > 0
      ? 100
      : 0;

  return {
    totalExpected,
    totalScanned: scannedMap.size,
    matchedCount,
    missingCount,
    surplusCount,
    accuracyRatePercent,
    totalMissingWeightGr: Math.round(totalMissingWeightGr * 100) / 100,
    items: reconciledItems,
  };
}

/**
 * Donanım bağlı olmadığında veya demo ortamında RFID tarama akışı simülasyonu üretir.
 */
export function simulateRfidScan(
  items: Array<{ epc: string }>,
  missingIndices: number[] = []
): ScannedTag[] {
  const scanned: ScannedTag[] = [];
  const missingSet = new Set(missingIndices);

  items.forEach((item, idx) => {
    if (!missingSet.has(idx)) {
      // 1 ila 5 arasında rastgele okuma sıklığı
      const reads = Math.floor(Math.random() * 4) + 1;
      const rssi = Math.floor(Math.random() * 30) - 70; // -70 ila -40 dBm
      for (let r = 0; r < reads; r++) {
        scanned.push({
          epc: item.epc,
          rssi,
          scannedAt: new Date().toISOString(),
        });
      }
    }
  });

  return scanned;
}

/**
 * Sayım oturumu sonuç raporunu WhatsApp bildirim formatında üretir.
 */
export function formatRfidAuditSummary(
  sessionNumber: string,
  location: string,
  result: RfidReconciliationResult
): string {
  return (
    `📡 *KuyumPanel — RFID Vitrin Sayım Raporu*\n\n` +
    `*Oturum No:* #${sessionNumber}\n` +
    `*Konum:* ${location}\n` +
    `*Doğruluk Oranı:* %${result.accuracyRatePercent}\n` +
    `*Beklenen Ürün:* ${result.totalExpected} adet\n` +
    `*Fiilen Okunan:* ${result.totalScanned} adet\n` +
    `*Eşleşen (Mevcut):* ${result.matchedCount} adet ✅\n` +
    `*Eksik (Kayıp):* ${result.missingCount} adet ⚠️ (${result.totalMissingWeightGr} gr)\n` +
    `*Fazla (Farklı Konum):* ${result.surplusCount} adet ℹ️\n\n` +
    `Detaylı kayıp listesi sisteme işlenmiştir.`
  );
}
