/**
 * Termal Kuyumcu Etiket ve Barkod Sabitleri
 * Zero Magic Numbers / Magic Strings Kuralına Uygun Tanımlamalar
 */

// Etiket Şablonları / Formatları
export const LABEL_TEMPLATES = {
  BUTTERFLY_74x12: 'BUTTERFLY_74x12', // Standart İpli Kelebek (74mm x 12mm)
  BARBELL_50x12: 'BARBELL_50x12',     // Halter / Mini Kelebek (50mm x 12mm)
  RECTANGLE_40x20: 'RECTANGLE_40x20', // Dikdörtgen Takı Kutusu (40mm x 20mm)
  RECTANGLE_50x12: 'RECTANGLE_50x12', // Düz Mini Etiket (50mm x 12mm)
} as const;

export type LabelTemplate = (typeof LABEL_TEMPLATES)[keyof typeof LABEL_TEMPLATES];

// Format Takma Adı (Geriye Dönük & Alternatif Yazım Uyumluluğu)
export const LABEL_FORMATS = {
  BUTTERFLY_74X12: LABEL_TEMPLATES.BUTTERFLY_74x12,
  BARBELL_50X12: LABEL_TEMPLATES.BARBELL_50x12,
  RECTANGLE_40X20: LABEL_TEMPLATES.RECTANGLE_40x20,
  RECTANGLE_50X12: LABEL_TEMPLATES.RECTANGLE_50x12,
} as const;

export type LabelFormat = LabelTemplate;

// Etiket Şablonu Türkçe Etiketleri
export const LABEL_TEMPLATE_LABELS: Record<LabelTemplate, string> = {
  [LABEL_TEMPLATES.BUTTERFLY_74x12]: 'Standart İpli Kelebek (74x12 mm)',
  [LABEL_TEMPLATES.BARBELL_50x12]: 'Halter / Dar Kelebek (50x12 mm)',
  [LABEL_TEMPLATES.RECTANGLE_40x20]: 'Kutu / Vitrin Etiketi (40x20 mm)',
  [LABEL_TEMPLATES.RECTANGLE_50x12]: 'Düz Dikdörtgen (50x12 mm)',
};

export interface LabelDimensionConfig {
  name: string;
  totalWidthMm: number;
  heightMm: number;
  leftWingWidthMm: number;
  bridgeWidthMm: number;
  rightWingWidthMm: number;
  defaultDpi: number;
  hasBridge: boolean;
}

// Etiket Boyut Konfigürasyonları (Milimetre Cinsinden)
export const LABEL_DIMENSIONS: Record<LabelTemplate, LabelDimensionConfig> = {
  [LABEL_TEMPLATES.BUTTERFLY_74x12]: {
    name: 'Standart İpli Kelebek',
    totalWidthMm: 74,
    heightMm: 12,
    leftWingWidthMm: 28,  // Sol kanat: Mağaza, Ayar, Gram, Model
    bridgeWidthMm: 18,    // Orta köprü: İp geçiş boşluğu (baskısız)
    rightWingWidthMm: 28, // Sağ kanat: Barkod, Kod, Fiyat/Milyem
    defaultDpi: 300,
    hasBridge: true,
  },
  [LABEL_TEMPLATES.BARBELL_50x12]: {
    name: 'Halter / Dar Kelebek',
    totalWidthMm: 50,
    heightMm: 12,
    leftWingWidthMm: 20,
    bridgeWidthMm: 10,
    rightWingWidthMm: 20,
    defaultDpi: 300,
    hasBridge: true,
  },
  [LABEL_TEMPLATES.RECTANGLE_40x20]: {
    name: 'Kutu / Vitrin Etiketi',
    totalWidthMm: 40,
    heightMm: 20,
    leftWingWidthMm: 40,
    bridgeWidthMm: 0,
    rightWingWidthMm: 0,
    defaultDpi: 300,
    hasBridge: false,
  },
  [LABEL_TEMPLATES.RECTANGLE_50x12]: {
    name: 'Düz Mini Etiket',
    totalWidthMm: 50,
    heightMm: 12,
    leftWingWidthMm: 50,
    bridgeWidthMm: 0,
    rightWingWidthMm: 0,
    defaultDpi: 300,
    hasBridge: false,
  },
};

// Barkod Tipleri
export const BARCODE_TYPES = {
  CODE128: 'CODE128',
  EAN13: 'EAN13',
  QR_CODE: 'QR_CODE',
} as const;

export type BarcodeType = (typeof BARCODE_TYPES)[keyof typeof BARCODE_TYPES];

// Yazıcı Çıktı Modları
export const PRINTER_OUTPUT_MODES = {
  HTML_CANVAS: 'HTML_CANVAS', // Tarayıcıdan 2D Canvas render + Doğrudan Yazdırma
  SVG_VECTOR: 'SVG_VECTOR',   // Vektörel SVG Çıktı
  ZPL_ZEBRA: 'ZPL_ZEBRA',     // Zebra / TSC / Godex Endüstriyel ZPL II Çıktısı
  ESC_POS: 'ESC_POS',         // Termal Fiş / ESC-POS
} as const;

export type PrinterOutputMode = (typeof PRINTER_OUTPUT_MODES)[keyof typeof PRINTER_OUTPUT_MODES];

// Baskı Çözünürlükleri (DPI)
export const LABEL_DPI = {
  DPI_203: 203, // 8 dot/mm (Standart masaüstü termal yazıcılar)
  DPI_300: 300, // 12 dot/mm (Yüksek kaliteli kuyumcu yazıcıları)
  DPI_600: 600, // 24 dot/mm (Ultra hassas mikro barkodlar)
} as const;

export type LabelDpi = (typeof LABEL_DPI)[keyof typeof LABEL_DPI];

// Milimetreyi DPI bazında Piksel / Noktaya (Dot) Dönüştürür
export function mmToDots(mm: number, dpi: number = LABEL_DPI.DPI_300): number {
  return Math.round((mm / 25.4) * dpi);
}
