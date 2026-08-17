/**
 * ZPL-II (Zebra Programming Language) Termal Barkod Etiket Üreticisi
 * Zebra, TSC, Godex, Argox ve Bixolon endüstriyel termal yazıcılar için
 * çift kanatlı kuyumcu kelebek etiket komut akışı (Raw ZPL stream) üretir.
 * Zero Magic Numbers / Strings
 */

import {
  LABEL_TEMPLATES,
  LABEL_DIMENSIONS,
  LABEL_DPI,
  LabelTemplate,
  LabelDimensionConfig,
  LabelDpi,
} from '@/constants/labels';
import {
  LabelProductData,
  formatCaratLabel,
  formatWeightLabel,
  formatPriceLabel,
  formatMilyemLabel,
  LABEL_FONT_CONFIG,
} from './kelebek';

// ─── ZPL Sabitleri & Yapılandırması ──────────────────────────────────────────

export const ZPL_COMMANDS = {
  START: '^XA',
  END: '^XZ',
  PRINT_WIDTH: '^PW',
  LABEL_LENGTH: '^LL',
  LABEL_HOME: '^LH0,0',
  UTF8_ENCODING: '^CI28', // UTF-8 Uluslararası Karakter Desteği
  FIELD_ORIGIN: '^FO',
  SCALABLE_FONT: '^A0N',
  BARCODE_DEFAULT: '^BY',
  CODE128_BARCODE: '^BCN',
  FIELD_DATA: '^FD',
  FIELD_SEPARATOR: '^FS',
} as const;

export const ZPL_DPMM_CONFIG: Record<LabelDpi, number> = {
  [LABEL_DPI.DPI_203]: 8.0,    // 8 dots per mm (203.2 DPI)
  [LABEL_DPI.DPI_300]: 11.811, // 11.811 dots per mm (300 DPI)
  [LABEL_DPI.DPI_600]: 23.622, // 23.622 dots per mm (600 DPI)
};

export const ZPL_COORDINATES = {
  MARGIN_LEFT_MM: 2.0,
  MARGIN_RIGHT_MM: 2.0,
  LEFT_WING_ROW1_Y: 15,
  LEFT_WING_ROW2_Y: 40,
  LEFT_WING_ROW3_Y: 65,
  RIGHT_WING_BARCODE_Y: 10,
  RIGHT_WING_TEXT_Y: 42,
  RIGHT_WING_PRICE_Y: 65,
  BARCODE_HEIGHT_203: 25,
  BARCODE_HEIGHT_300: 36,
} as const;

export interface ZplOptions {
  dpi?: LabelDpi | number;
  template?: LabelTemplate;
  storeName?: string;
  showPrice?: boolean;
  showMilyem?: boolean;
}

/**
 * Tek bir kuyumcu ürünü için ZPL II komut dizesi üretir.
 */
export function generateKelebekZPL(
  data: LabelProductData,
  dpi: LabelDpi | number = LABEL_DPI.DPI_203,
  template: LabelTemplate = LABEL_TEMPLATES.BUTTERFLY_74x12,
  options?: ZplOptions
): string {
  const config: LabelDimensionConfig = LABEL_DIMENSIONS[template] || LABEL_DIMENSIONS[LABEL_TEMPLATES.BUTTERFLY_74x12];
  
  // DPMM (Dots per mm) Hesaplama
  const activeDpi = Number(dpi) === LABEL_DPI.DPI_300 ? LABEL_DPI.DPI_300 : LABEL_DPI.DPI_203;
  const dpmm = ZPL_DPMM_CONFIG[activeDpi] || 8.0;

  const totalWidthDots = Math.round(config.totalWidthMm * dpmm);
  const totalHeightDots = Math.round(config.heightMm * dpmm);

  const leftMarginMm = ZPL_COORDINATES.MARGIN_LEFT_MM;
  const leftX = Math.round(leftMarginMm * dpmm);
  
  const rightMarginMm = config.leftWingWidthMm + config.bridgeWidthMm + ZPL_COORDINATES.MARGIN_RIGHT_MM;
  const rightX = Math.round(rightMarginMm * dpmm);

  const caratStr = formatCaratLabel(data.carat);
  const weightStr = formatWeightLabel(data.weight);
  const priceStr = options?.showPrice !== false ? formatPriceLabel(data.priceTL) : '';
  const milyemStr = options?.showMilyem !== false ? formatMilyemLabel(data.sellingMilyem) : '';
  
  const maxTitleLen = 16;
  const truncatedTitle = (data.title || '').trim().substring(0, maxTitleLen);

  const is300Dpi = activeDpi === LABEL_DPI.DPI_300;
  const scaleRatio = is300Dpi ? 1.47 : 1.0;

  const row1Y = Math.round(ZPL_COORDINATES.LEFT_WING_ROW1_Y * scaleRatio);
  const row2Y = Math.round(ZPL_COORDINATES.LEFT_WING_ROW2_Y * scaleRatio);
  const row3Y = Math.round(ZPL_COORDINATES.LEFT_WING_ROW3_Y * scaleRatio);
  
  const barcodeY = Math.round(ZPL_COORDINATES.RIGHT_WING_BARCODE_Y * scaleRatio);
  const barcodeTextY = Math.round(ZPL_COORDINATES.RIGHT_WING_TEXT_Y * scaleRatio);
  const priceY = Math.round(ZPL_COORDINATES.RIGHT_WING_PRICE_Y * scaleRatio);
  const barcodeHeight = is300Dpi ? ZPL_COORDINATES.BARCODE_HEIGHT_300 : ZPL_COORDINATES.BARCODE_HEIGHT_203;

  const fontLarge = is300Dpi ? '28,28' : '20,20';
  const fontMedium = is300Dpi ? '24,24' : '18,18';
  const fontSmall = is300Dpi ? '20,20' : '16,16';

  const commands: string[] = [
    ZPL_COMMANDS.START,
    `${ZPL_COMMANDS.PRINT_WIDTH}${totalWidthDots}`,
    `${ZPL_COMMANDS.LABEL_LENGTH}${totalHeightDots}`,
    ZPL_COMMANDS.LABEL_HOME,
    ZPL_COMMANDS.UTF8_ENCODING,
    // Sol Kanat
    `${ZPL_COMMANDS.FIELD_ORIGIN}${leftX},${row1Y}${ZPL_COMMANDS.SCALABLE_FONT},${fontLarge}${ZPL_COMMANDS.FIELD_DATA}${caratStr} ${weightStr}${ZPL_COMMANDS.FIELD_SEPARATOR}`,
    `${ZPL_COMMANDS.FIELD_ORIGIN}${leftX},${row2Y}${ZPL_COMMANDS.SCALABLE_FONT},${fontSmall}${ZPL_COMMANDS.FIELD_DATA}${truncatedTitle}${ZPL_COMMANDS.FIELD_SEPARATOR}`,
  ];

  if (milyemStr && !priceStr) {
    commands.push(`${ZPL_COMMANDS.FIELD_ORIGIN}${leftX},${row3Y}${ZPL_COMMANDS.SCALABLE_FONT},${fontSmall}${ZPL_COMMANDS.FIELD_DATA}${milyemStr}${ZPL_COMMANDS.FIELD_SEPARATOR}`);
  }

  // Sağ Kanat Barkod ve Fiyat
  commands.push(
    `${ZPL_COMMANDS.FIELD_ORIGIN}${rightX},${barcodeY}${ZPL_COMMANDS.BARCODE_DEFAULT}1,2,${barcodeHeight}${ZPL_COMMANDS.CODE128_BARCODE},${barcodeHeight},N,N,N${ZPL_COMMANDS.FIELD_DATA}${data.barcode}${ZPL_COMMANDS.FIELD_SEPARATOR}`,
    `${ZPL_COMMANDS.FIELD_ORIGIN}${rightX},${barcodeTextY}${ZPL_COMMANDS.SCALABLE_FONT},${fontMedium}${ZPL_COMMANDS.FIELD_DATA}${data.barcode}${ZPL_COMMANDS.FIELD_SEPARATOR}`
  );

  if (priceStr) {
    commands.push(`${ZPL_COMMANDS.FIELD_ORIGIN}${rightX},${priceY}${ZPL_COMMANDS.SCALABLE_FONT},${fontLarge}${ZPL_COMMANDS.FIELD_DATA}${priceStr}${ZPL_COMMANDS.FIELD_SEPARATOR}`);
  }

  commands.push(ZPL_COMMANDS.END);

  return commands.join('\n');
}

/**
 * Birden fazla ürün ve kopya sayısı içeren toplu (batch) ZPL komut akışı üretir.
 */
export function generateBatchZPL(
  items: Array<{ data: LabelProductData; copies?: number } | LabelProductData>,
  dpi: LabelDpi | number = LABEL_DPI.DPI_203,
  template: LabelTemplate = LABEL_TEMPLATES.BUTTERFLY_74x12,
  options?: ZplOptions
): string {
  if (!items || items.length === 0) {
    return '';
  }

  const zplBlocks: string[] = [];

  for (const item of items) {
    const isWrapped = 'data' in item;
    const prodData = isWrapped ? (item as any).data : (item as LabelProductData);
    const copies = isWrapped ? Math.max(1, (item as any).copies || 1) : Math.max(1, prodData.quantity || 1);

    if (copies <= 0) continue;

    const singleZpl = generateKelebekZPL(prodData, dpi, template, options);
    for (let c = 0; c < copies; c++) {
      zplBlocks.push(singleZpl);
    }
  }

  return zplBlocks.join('\n');
}
