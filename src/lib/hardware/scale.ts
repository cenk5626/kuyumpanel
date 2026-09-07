/**
 * Kuyumcu Hassas Terazisi (Web Serial API & RS232/USB Entegrasyonu)
 * Desteklenen Cihazlar: Mettler Toledo, CAS, Radwag, Ohaus, DESIS, Sartorius
 * Protokoller: STX/ETX, CRLF, Sürekli Yayın veya Talep Modu
 */

import { SCALE_CONSTANTS, SCALE_SOURCES } from '@/constants/scale';

export interface ScaleReading {
  weight: number;      // Okunan gramaj (gr)
  isStable: boolean;   // Terazinin kararlı (durağan) olup olmadığı
  unit: string;        // 'g' | 'ct' | 'gn'
  raw: string;         // Ham seri port verisi
  source: (typeof SCALE_SOURCES)[keyof typeof SCALE_SOURCES];
}

export interface ScaleConfig {
  baudRate?: number;   // Varsayılan: 9600 (veya 4800, 19200)
  dataBits?: 7 | 8;
  stopBits?: 1 | 2;
  parity?: 'none' | 'even' | 'odd';
  flowControl?: 'none' | 'hardware';
}

export const SCALE_DEFAULTS = {
  BAUD_RATE: SCALE_CONSTANTS.DEFAULT_BAUD_RATE,
  DATA_BITS: SCALE_CONSTANTS.DEFAULT_DATA_BITS,
  STOP_BITS: SCALE_CONSTANTS.DEFAULT_STOP_BITS,
  TIMEOUT_MS: SCALE_CONSTANTS.DEFAULT_TIMEOUT_MS,
  ERROR_DISPLAY_MS: SCALE_CONSTANTS.ERROR_DISPLAY_MS,
} as const;

export const DEFAULT_SCALE_CONFIG: ScaleConfig = {
  baudRate: SCALE_DEFAULTS.BAUD_RATE,
  dataBits: SCALE_DEFAULTS.DATA_BITS,
  stopBits: SCALE_DEFAULTS.STOP_BITS,
  parity: 'none',
  flowControl: 'none',
};


/**
 * Tarayıcının Web Serial API desteğini doğrular.
 */
export function isWebSerialSupported(): boolean {
  return typeof window !== 'undefined' && 'serial' in navigator;
}

/**
 * Seri porttan gelen ham kuyumcu terazisi metin satırını ayrıştırır.
 * Örnekler:
 * - "S S     14.250 g\r\n" (Mettler Toledo Kararlı)
 * - "ST,GS,+  24.500 g\r\n" (CAS Kararlı)
 * - "SI      18.420 g\r\n" (Radwag Kararlı)
 * - "US,GS,+  24.498 g\r\n" (CAS Kararsız / Dinamik)
 * - "   3.210 g\r\n" (Genel Dijital Terazi)
 */
export function parseScaleData(rawText: string): ScaleReading | null {
  if (!rawText || rawText.trim().length === 0) return null;

  const cleaned = rawText.replace(/[\x00-\x09\x0B-\x1F\x7F]/g, ' ').trim();

  // Kararlılık tespiti: ST, S S, SI -> Stable | US, SD, D -> Unstable
  let isStable = true;
  if (/\b(US|SD|DYN|MOVING)\b/i.test(cleaned)) {
    isStable = false;
  }

  // Ağırlık sayısını ve birimi yakalama regex'i
  // Negatif veya pozitif ondalıklı ve binlik basamaklı sayılar: "+ 14.250", "14,250", "1,250.750", "1.250,750", "-0.05"
  const match = cleaned.match(/([+-]?\s*[\d\s.,]+?)\s*(g|gr|gram|ct|gn)?(?:\s|$)/i);
  if (!match) return null;

  let numberStr = match[1].replace(/\s+/g, '');
  if (!numberStr || !/\d/.test(numberStr)) return null;

  // İşareti ayıkla
  let sign = 1;
  if (numberStr.startsWith('-')) {
    sign = -1;
    numberStr = numberStr.slice(1);
  } else if (numberStr.startsWith('+')) {
    numberStr = numberStr.slice(1);
  }

  const lastDot = numberStr.lastIndexOf('.');
  const lastComma = numberStr.lastIndexOf(',');

  if (lastDot !== -1 && lastComma !== -1) {
    // Hem nokta hem virgül var (Örn: "1,250.75" veya "1.250,75")
    if (lastDot > lastComma) {
      // Nokta en sonda: virgüller binlik ayırıcı, nokta ondalık (Örn: 1,250.75)
      numberStr = numberStr.replace(/,/g, '');
    } else {
      // Virgül en sonda: noktalar binlik ayırıcı, virgül ondalık (Örn: 1.250,75)
      numberStr = numberStr.replace(/\./g, '').replace(',', '.');
    }
  } else if (lastComma !== -1) {
    // Sadece virgül var
    const commaCount = (numberStr.match(/,/g) || []).length;
    if (commaCount > 1) {
      // Birden fazla virgül: binlik ayracı
      numberStr = numberStr.replace(/,/g, '');
    } else {
      // Tek virgül: ondalık ayracı (Örn: 14,250 -> 14.250)
      numberStr = numberStr.replace(',', '.');
    }
  } else if (lastDot !== -1) {
    // Sadece nokta var
    const dotCount = (numberStr.match(/\./g) || []).length;
    if (dotCount > 1) {
      // Birden fazla nokta: binlik ayracı
      numberStr = numberStr.replace(/\./g, '');
    }
    // Tek nokta: zaten standart JavaScript ondalık noktası
  }

  const parsedNumber = parseFloat(numberStr);
  if (isNaN(parsedNumber)) return null;

  const weight = sign * parsedNumber;
  const unit = (match[2] || 'g').toLowerCase();

  return {
    weight: Number(weight.toFixed(3)),
    isStable,
    unit: unit.startsWith('ct') ? 'ct' : 'g',
    raw: rawText,
    source: 'hardware',
  };
}

/**
 * Web Serial API ile bağlı teraziden tek seferlik ağırlık okur.
 */
export async function readWeightFromSerial(
  config: ScaleConfig = DEFAULT_SCALE_CONFIG,
  timeoutMs: number = 8000
): Promise<ScaleReading> {
  if (!isWebSerialSupported()) {
    throw new Error('Web Serial API bu tarayıcıda desteklenmiyor.');
  }

  const serial = (navigator as any).serial;
  let port: any = null;
  let reader: any = null;
  let readableStreamClosed: any = null;

  try {
    // Kullanıcıdan seri port seçimi talep et
    port = await serial.requestPort();
    await port.open(config);

    const textDecoder = new TextDecoderStream();
    readableStreamClosed = port.readable.pipeTo(textDecoder.writable);
    reader = textDecoder.readable.getReader();

    let accumulated = '';
    const startTime = Date.now();

    while (Date.now() - startTime < timeoutMs) {
      const { value, done } = await Promise.race([
        reader.read(),
        new Promise<{ value: undefined; done: boolean }>((_, reject) =>
          setTimeout(() => reject(new Error('Terazi okuma zaman aşımına uğradı.')), timeoutMs)
        ),
      ]);

      if (done || !value) break;

      accumulated += value;

      // CRLF veya LF ile ayrılmış satır kontrolü
      if (accumulated.includes('\n') || accumulated.includes('\r')) {
        const lines = accumulated.split(/[\r\n]+/);
        for (const line of lines) {
          const parsed = parseScaleData(line);
          if (parsed && parsed.weight >= 0) {
            return parsed;
          }
        }
      }
    }

    // Zaman aşımı sonrası birikmiş metni bir kez daha dene
    const parsed = parseScaleData(accumulated);
    if (parsed) return parsed;

    throw new Error('Teraziden geçerli gramaj verisi okunamadı.');
  } finally {
    if (reader) {
      try {
        await reader.cancel();
      } catch (_) {}
    }
    if (readableStreamClosed) {
      try {
        await readableStreamClosed.catch(() => {});
      } catch (_) {}
    }
    if (port) {
      try {
        await port.close();
      } catch (_) {}
    }
  }
}

/**
 * Donanım bağlı olmadığında veya demo amaçlı gerçekçi gramaj simülatörü.
 * 1.50 gr ile 45.00 gr arasında gerçekçi kuyumcu takısı gramajı üretir.
 */
export function simulateScaleWeight(): ScaleReading {
  // Popüler kuyumcu gramaj aralıkları (örnek: 3.25 gr küpe, 14.80 gr bilezik, 24.50 gr burma)
  const baseWeights = [1.605, 3.210, 6.420, 7.850, 14.220, 18.500, 22.400, 31.100];
  const randomBase = baseWeights[Math.floor(Math.random() * baseWeights.length)];
  // Hafif bir varyasyon ekle (+- 0.35 gr)
  const jitter = (Math.random() - 0.5) * 0.7;
  const weight = Number(Math.max(0.1, randomBase + jitter).toFixed(3));

  return {
    weight,
    isStable: true,
    unit: 'g',
    raw: `ST,GS,+  ${weight.toFixed(3)} g`,
    source: 'simulation',
  };
}
