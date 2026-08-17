/**
 * Kuyumcu Kelebek (Butterfly) & Termal Barkod Etiket Üreticisi
 * Tamamen yerel (offline) çalışan vektörel Code 128 barkod motoru ve 
 * Çift kanatlı (dual-wing) kelebek etiket şablonları.
 * Zero External Dependencies / Zero CDN / Zero Magic Numbers
 */

import {
  LABEL_TEMPLATES,
  LABEL_DIMENSIONS,
  LABEL_TEMPLATE_LABELS,
  LabelTemplate,
  LabelDimensionConfig,
} from '@/constants/labels';

// ─── Sabitler & Tipler ────────────────────────────────────────────────────────

export const CODE128_CONSTANTS = {
  START_CODE_B: 104,
  STOP_CODE: 106,
  MODULO: 103,
  BAR_WIDTH_MM: 0.25,
  QUIET_ZONE_MODULES: 10,
  DEFAULT_MODULE_WIDTH: 1.5,
  DEFAULT_BARCODE_HEIGHT_MM: 4.2,
} as const;

export const LABEL_FONT_CONFIG = {
  FONT_FAMILY: 'Arial, "Helvetica Neue", Helvetica, sans-serif',
  MONO_FAMILY: 'ui-monospace, "SF Mono", Monaco, "Cascadia Mono", monospace',
  LEFT_WING_TITLE_MAX_CHARS: 18,
  LEFT_WING_TITLE_SHORT_CHARS: 14,
  DEFAULT_STORE_NAME: 'KUYUMCU',
} as const;

export interface LabelProductData {
  id?: string;
  barcode: string;
  title: string;
  carat: number | string;
  weight: number;
  priceTL?: number | null;
  sellingMilyem?: number | null;
  costMilyem?: number | null;
  laborCost?: number | null;
  laborType?: string | null;
  category?: string | null;
  subType?: string | null;
  subSubType?: string | null;
  size?: string | null;
  supplierName?: string | null;
  storeName?: string;
  quantity?: number;
}

export interface LabelRenderOptions {
  template?: LabelTemplate;
  storeName?: string;
  showPrice?: boolean;
  showMilyem?: boolean;
  showStoreName?: boolean;
  scale?: number;
}

// ─── Code 128 Standart Desen Tablosu (107 Sembol) ───────────────────────────
// Her desen 6 elemandan oluşur (3 çizgi, 3 boşluk genişlikleri, toplam 11 modül)
// Durdurma (Stop) sembolü 7 elemandır (toplam 13 modül)
const CODE128_PATTERNS: readonly string[] = [
  '212222', '222122', '222221', '121223', '121322', '131222', '122213', '122312', '132212', '221213', // 0-9
  '221312', '231212', '112232', '122132', '122231', '113222', '123122', '123221', '223211', '221132', // 10-19
  '221231', '213212', '223112', '312131', '311222', '321122', '321221', '312212', '322112', '322211', // 20-29
  '212123', '212321', '232121', '111323', '131123', '131321', '112313', '132113', '132311', '211313', // 30-39
  '231113', '231311', '112133', '112331', '132131', '113123', '113321', '133121', '313121', '211331', // 40-49
  '231131', '213113', '213311', '213131', '311123', '311321', '331121', '312113', '312311', '332111', // 50-59
  '314111', '221411', '431111', '111224', '111422', '121124', '121421', '141122', '141221', '112214', // 60-69
  '112412', '122114', '122411', '142112', '142211', '241211', '221114', '413111', '241112', '134111', // 70-79
  '111242', '121142', '121241', '114212', '124112', '124211', '411212', '421112', '421211', '212141', // 80-89
  '214121', '412121', '111143', '111341', '131141', '114113', '114311', '411113', '411311', '113141', // 90-99
  '114131', '311141', '411131', '211412', '211214', '211232', '2331112'                               // 100-106
];

/**
 * Verilen metni Code 128 Set B formatında modül çizgi dizisine (1: çizgi, 0: boşluk) dönüştürür.
 * Tamamen yerel, sıfır dış kütüphane.
 */
export function encodeCode128B(text: string): { modules: number[]; checksum: number } {
  const sanitized = text.replace(/[^ -~]/g, ''); // ASCII 32 - 126 arası
  if (!sanitized) {
    // Boş ise varsayılan '0' basılır
    return encodeCode128B('0');
  }

  const symbolIndices: number[] = [CODE128_CONSTANTS.START_CODE_B];
  let checksumSum = CODE128_CONSTANTS.START_CODE_B;

  for (let i = 0; i < sanitized.length; i++) {
    const codeValue = sanitized.charCodeAt(i) - 32; // Code 128B'de ASCII 32 = symbol index 0
    symbolIndices.push(codeValue);
    checksumSum += codeValue * (i + 1);
  }

  const checksum = checksumSum % CODE128_CONSTANTS.MODULO;
  symbolIndices.push(checksum);
  symbolIndices.push(CODE128_CONSTANTS.STOP_CODE);

  // Sembol desenlerini modüllere çevir
  const modules: number[] = [];
  
  for (const symIndex of symbolIndices) {
    const pattern = CODE128_PATTERNS[symIndex];
    if (!pattern) continue;

    let isBar = true;
    for (let p = 0; p < pattern.length; p++) {
      const width = parseInt(pattern[p], 10);
      for (let w = 0; w < width; w++) {
        modules.push(isBar ? 1 : 0);
      }
      isBar = !isBar;
    }
  }

  return { modules, checksum };
}

/**
 * Code 128 modül dizisini optimize edilmiş SVG dikdörtgen gruplarına çevirir.
 */
export function generateCode128BarcodeSVG(
  text: string,
  targetWidthMm: number,
  targetHeightMm: number,
  xOffsetMm: number = 0,
  yOffsetMm: number = 0
): string {
  const { modules } = encodeCode128B(text);
  if (modules.length === 0) return '';

  const totalModules = modules.length;
  const moduleWidthMm = targetWidthMm / totalModules;

  // Ardışık 1'leri birleştirerek tek bir <rect> oluştur
  const rects: string[] = [];
  let currentRunStart = -1;

  for (let i = 0; i < totalModules; i++) {
    if (modules[i] === 1) {
      if (currentRunStart === -1) {
        currentRunStart = i;
      }
    } else {
      if (currentRunStart !== -1) {
        const barX = xOffsetMm + currentRunStart * moduleWidthMm;
        const barWidth = (i - currentRunStart) * moduleWidthMm;
        rects.push(`<rect x="${barX.toFixed(3)}" y="${yOffsetMm.toFixed(3)}" width="${barWidth.toFixed(3)}" height="${targetHeightMm.toFixed(3)}" fill="#000000" />`);
        currentRunStart = -1;
      }
    }
  }

  // Son kalan bar grubu
  if (currentRunStart !== -1) {
    const barX = xOffsetMm + currentRunStart * moduleWidthMm;
    const barWidth = (totalModules - currentRunStart) * moduleWidthMm;
    rects.push(`<rect x="${barX.toFixed(3)}" y="${yOffsetMm.toFixed(3)}" width="${barWidth.toFixed(3)}" height="${targetHeightMm.toFixed(3)}" fill="#000000" />`);
  }

  return rects.join('\n    ');
}

// ─── Formatlayıcı Yardımcılar ────────────────────────────────────────────────

export function formatCaratLabel(carat: number | string): string {
  if (typeof carat === 'number') {
    return `${carat}K`;
  }
  const str = String(carat).trim();
  if (/^\d+$/.test(str)) {
    return `${str}K`;
  }
  return str;
}

export function formatWeightLabel(weight: number): string {
  return `${weight.toFixed(2)} gr`;
}

export function formatPriceLabel(priceTL?: number | null): string {
  if (priceTL == null || isNaN(priceTL) || priceTL <= 0) {
    return '';
  }
  return `${Math.round(priceTL).toLocaleString('tr-TR')} TL`;
}

export function formatMilyemLabel(milyem?: number | null): string {
  if (milyem == null || isNaN(milyem) || milyem <= 0) {
    return '';
  }
  return `M:${milyem.toFixed(3)}`;
}

// ─── SVG Kelebek Etiket Üreticisi ───────────────────────────────────────────

/**
 * Kuyumcu çift kanatlı kelebek veya kutu etiketi için doğrudan yüksek çözünürlüklü
 * vektörel SVG kodu üretir.
 */
export function generateKelebekLabelSVG(
  data: LabelProductData,
  template: LabelTemplate = LABEL_TEMPLATES.BUTTERFLY_74x12,
  options?: LabelRenderOptions
): string {
  const config: LabelDimensionConfig = LABEL_DIMENSIONS[template] || LABEL_DIMENSIONS[LABEL_TEMPLATES.BUTTERFLY_74x12];
  
  const storeName = options?.storeName || data.storeName || LABEL_FONT_CONFIG.DEFAULT_STORE_NAME;
  const showPrice = options?.showPrice !== false;
  const showMilyem = options?.showMilyem !== false;

  const caratText = formatCaratLabel(data.carat);
  const weightText = formatWeightLabel(data.weight);
  const priceText = showPrice ? formatPriceLabel(data.priceTL) : '';
  const milyemText = showMilyem ? formatMilyemLabel(data.sellingMilyem) : '';

  const maxTitleLen = config.totalWidthMm >= 70 
    ? LABEL_FONT_CONFIG.LEFT_WING_TITLE_MAX_CHARS 
    : LABEL_FONT_CONFIG.LEFT_WING_TITLE_SHORT_CHARS;
  const truncatedTitle = (data.title || '').trim().substring(0, maxTitleLen);

  // Kanat Boyutlandırmaları
  const isDualWing = config.hasBridge && config.bridgeWidthMm > 0;
  const leftWidth = config.leftWingWidthMm;
  const bridgeWidth = config.bridgeWidthMm;
  const rightWidth = config.rightWingWidthMm;
  const height = config.heightMm;

  if (isDualWing) {
    // Standart Kelebek / Halter (Çift Kanatlı)
    const rightWingStartX = leftWidth + bridgeWidth;
    
    // Sağ kanat barkod boyutları (sağ kanadın %90'ı)
    const barcodeTargetWidth = rightWidth - 3;
    const barcodeHeight = 4.2;
    const barcodeStartX = rightWingStartX + 1.5;
    const barcodeStartY = 3.5;

    const barcodeRects = generateCode128BarcodeSVG(
      data.barcode,
      barcodeTargetWidth,
      barcodeHeight,
      barcodeStartX,
      barcodeStartY
    );

    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${config.totalWidthMm} ${height}" width="${config.totalWidthMm}mm" height="${height}mm" class="kelebek-label-vector">
  <defs>
    <style>
      .label-text { font-family: ${LABEL_FONT_CONFIG.FONT_FAMILY}; font-size: 2.2px; fill: #000000; font-weight: bold; }
      .label-sub { font-family: ${LABEL_FONT_CONFIG.FONT_FAMILY}; font-size: 1.8px; fill: #333333; }
      .label-bold { font-family: ${LABEL_FONT_CONFIG.FONT_FAMILY}; font-size: 2.0px; fill: #000000; font-weight: 800; }
      .barcode-text { font-family: ${LABEL_FONT_CONFIG.MONO_FAMILY}; font-size: 1.8px; fill: #000000; font-weight: bold; letter-spacing: 0.2px; }
      .store-text { font-family: ${LABEL_FONT_CONFIG.FONT_FAMILY}; font-size: 1.6px; fill: #444444; text-transform: uppercase; }
    </style>
  </defs>

  <!-- Sol Kanat (${leftWidth}x${height}mm) -->
  <g id="left-wing" transform="translate(1, 1)">
    <text x="0" y="2.5" class="label-text">${caratText} | ${weightText}</text>
    <text x="0" y="5.5" class="label-sub">${truncatedTitle}</text>
    <text x="0" y="8.5" class="label-sub">${milyemText}</text>
    ${storeName ? `<text x="0" y="10.5" class="store-text">${storeName.substring(0, 16)}</text>` : ''}
  </g>

  <!-- Orta İp Köprüsü (${bridgeWidth}mm boşluk) -->

  <!-- Sağ Kanat (${rightWidth}x${height}mm) -->
  <g id="right-wing">
    <text x="${(rightWingStartX + 1.5).toFixed(2)}" y="2.5" class="barcode-text">${data.barcode}</text>
    ${barcodeRects}
    <text x="${(rightWingStartX + 1.5).toFixed(2)}" y="10.2" class="label-text">${priceText}</text>
  </g>
</svg>`;
  } else {
    // Tek Kanatlı / Dikdörtgen Kutu Etiketi (40x20mm veya 50x12mm)
    const barcodeTargetWidth = config.totalWidthMm - 6;
    const barcodeHeight = height > 15 ? 7.0 : 4.0;
    const barcodeStartX = 3.0;
    const barcodeStartY = height > 15 ? 8.5 : 4.5;

    const barcodeRects = generateCode128BarcodeSVG(
      data.barcode,
      barcodeTargetWidth,
      barcodeHeight,
      barcodeStartX,
      barcodeStartY
    );

    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${config.totalWidthMm} ${height}" width="${config.totalWidthMm}mm" height="${height}mm" class="kelebek-label-vector">
  <defs>
    <style>
      .label-text { font-family: ${LABEL_FONT_CONFIG.FONT_FAMILY}; font-size: 2.6px; fill: #000000; font-weight: bold; }
      .label-sub { font-family: ${LABEL_FONT_CONFIG.FONT_FAMILY}; font-size: 2.0px; fill: #333333; }
      .barcode-text { font-family: ${LABEL_FONT_CONFIG.MONO_FAMILY}; font-size: 2.2px; fill: #000000; font-weight: bold; letter-spacing: 0.3px; }
      .store-text { font-family: ${LABEL_FONT_CONFIG.FONT_FAMILY}; font-size: 1.9px; fill: #555555; text-transform: uppercase; }
    </style>
  </defs>

  <g id="single-wing" transform="translate(3, 1)">
    <text x="0" y="3.0" class="label-text">${caratText} | ${weightText} - ${truncatedTitle}</text>
    ${barcodeRects}
    <text x="0" y="${(height - 2.5).toFixed(1)}" class="barcode-text">${data.barcode}</text>
    <text x="${(config.totalWidthMm - 6).toFixed(1)}" y="${(height - 2.5).toFixed(1)}" text-anchor="end" class="label-text">${priceText}</text>
  </g>
</svg>`;
  }
}

// ─── Doğrudan Tarayıcı / Termal Yazıcı HTML Çıktısı ─────────────────────────

/**
 * Tarayıcıdan doğrudan termal yazıcıya (Zebra, TSC, Argox, Xprinter vs.) 
 * sıfır kenar boşluğu ile baskı verecek HTML dökümanı üretir.
 */
export function generateLabelPrintHTML(
  items: LabelProductData | LabelProductData[],
  options?: LabelRenderOptions
): string {
  const itemList = Array.isArray(items) ? items : [items];
  const template = options?.template || LABEL_TEMPLATES.BUTTERFLY_74x12;
  const config: LabelDimensionConfig = LABEL_DIMENSIONS[template] || LABEL_DIMENSIONS[LABEL_TEMPLATES.BUTTERFLY_74x12];

  const labelsMarkup = itemList
    .filter(item => (item.quantity == null || item.quantity > 0))
    .map(item => {
      const copies = Math.max(1, item.quantity || 1);
      const svg = generateKelebekLabelSVG(item, template, options);
      return Array.from({ length: copies }, () => `
        <div class="label-page">
          ${svg}
        </div>
      `).join('\n');
    })
    .join('\n');

  return `<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8">
  <title>Termal Etiket Baskısı - ${config.name}</title>
  <style>
    @page {
      size: ${config.totalWidthMm}mm ${config.heightMm}mm;
      margin: 0mm;
    }
    *, *:before, *:after {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    html, body {
      margin: 0;
      padding: 0;
      background: #FFFFFF;
      color: #000000;
      font-family: ${LABEL_FONT_CONFIG.FONT_FAMILY};
    }
    .label-page {
      width: ${config.totalWidthMm}mm;
      height: ${config.heightMm}mm;
      page-break-after: always;
      break-after: page;
      overflow: hidden;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0;
      padding: 0;
    }
    .label-page:last-child {
      page-break-after: auto;
      break-after: auto;
    }
    .kelebek-label-vector {
      width: ${config.totalWidthMm}mm;
      height: ${config.heightMm}mm;
      display: block;
    }
    @media screen {
      body {
        background: #1e293b;
        padding: 20px;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 15px;
      }
      .label-page {
        background: white;
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.3);
        border-radius: 4px;
        border: 1px solid #cbd5e1;
      }
    }
  </style>
</head>
<body>
  ${labelsMarkup}
  <script>
    window.onload = function() {
      setTimeout(function() {
        window.print();
      }, 300);
    };
  </script>
</body>
</html>`;
}
