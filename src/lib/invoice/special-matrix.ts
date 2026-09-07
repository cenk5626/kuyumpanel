import {
  INVOICE_KDV_RATES,
  INVOICE_DEFAULTS,
  INVOICE_TYPES,
  INVOICE_DOCUMENT_TYPES,
  InvoiceType,
  InvoiceDocumentType,
} from '@/constants/invoice';
import { CARAT_MILYEM_MAP, getMilyemForCarat } from '@/constants/workshop';

export interface SpecialMatrixItemInput {
  name: string;
  weight: number;         // Gramaj (gr)
  carat?: number;         // Ayar (örn: 14, 22)
  milyem?: number;        // Saflık derecesi (örn: 0.585)
  hasGoldPrice: number;   // Has Altın gram alış/maliyet fiyatı (TL/gr)
  laborCost?: number;     // Toplam işçilik tutarı (TL)
  laborPerGram?: number;  // Gram başına işçilik (TL/gr)
  sellingPrice?: number;  // Doğrudan girilen toplam satış fiyatı (TL)
}

export interface SpecialMatrixItemResult {
  name: string;
  weight: number;
  carat: number;
  milyem: number;
  pureGoldWeight: number; // Has altın gramajı (gr)
  goldCost: number;       // Külçe altın bedeli (KDV İstisnası) (TL)
  laborAmount: number;    // İşçilik / kâr matrahı (TL)
  kdvPercent: number;     // %20
  kdvAmount: number;      // Hesaplanan KDV (TL)
  total: number;          // Kalem toplamı (TL)
}

export interface SpecialMatrixInvoiceResult {
  invoiceNumber: string;
  type: InvoiceType;
  documentType: InvoiceDocumentType;
  items: SpecialMatrixItemResult[];
  totalPureGoldWeight: number; // Toplam Has Altın (gr)
  totalGoldAmount: number;     // KDV'den istisna külçe tutarı (TL)
  totalLaborAmount: number;    // KDV matrahı (TL)
  totalKdvAmount: number;      // %20 Toplam KDV (TL)
  grandTotal: number;          // Fatura Genel Toplamı (TL)
  legalNotice: string;         // 3065 s.k. 23/e meşruat yazısı
  currency: string;
}

/**
 * Tek bir takı / külçe kalemi için KDV Kanunu 23/e Özel Matrah hesabı yapar.
 */
export function calculateSpecialMatrixItem(input: SpecialMatrixItemInput): SpecialMatrixItemResult {
  const carat = input.carat || 24;
  const milyem = getMilyemForCarat(carat, input.milyem);
  const weight = Math.max(0, input.weight || 0);
  const hasGoldPrice = Math.max(0, input.hasGoldPrice || 0);

  // 1. Has Altın Gramajı (4 hane hassasiyet)
  const pureGoldWeight = Number((weight * milyem).toFixed(4));

  // 2. Külçe Altın Bedeli (KDV İstisna Matrahı)
  const goldCost = Number((pureGoldWeight * hasGoldPrice).toFixed(2));

  // 3. İşçilik Bedeli (KDV Matrahı) & 4. KDV Tutarı
  let laborAmount = 0;
  let kdvAmount = 0;

  if (input.sellingPrice !== undefined && input.sellingPrice > 0) {
    // Doğrudan satış fiyatı üzerinden: Satış Fiyatı - Külçe Bedeli = İşçilik + KDV
    const diff = Math.max(0, Number((input.sellingPrice - goldCost).toFixed(2)));
    // diff = laborAmount * (1 + kdvRate/100)
    laborAmount = Number((diff / (1 + INVOICE_KDV_RATES.LABOR_PERCENT / 100)).toFixed(2));
    // 1-kuruşluk yuvarlama farkını önlemek için KDV = diff - laborAmount
    kdvAmount = Number((diff - laborAmount).toFixed(2));
  } else {
    if (input.laborCost !== undefined) {
      laborAmount = Number(Math.max(0, input.laborCost).toFixed(2));
    } else if (input.laborPerGram !== undefined) {
      laborAmount = Number((Math.max(0, input.laborPerGram) * weight).toFixed(2));
    }
    kdvAmount = Number((laborAmount * (INVOICE_KDV_RATES.LABOR_PERCENT / 100)).toFixed(2));
  }

  // 5. Kalem Genel Toplamı
  const total = Number((goldCost + laborAmount + kdvAmount).toFixed(2));

  return {
    name: input.name,
    weight,
    carat,
    milyem,
    pureGoldWeight,
    goldCost,
    laborAmount,
    kdvPercent: INVOICE_KDV_RATES.LABOR_PERCENT,
    kdvAmount,
    total,
  };
}

/**
 * Çoklu kalemlerden oluşan tam bir KDV 23/e faturası hesaplar ve özetler.
 */
export function calculateSpecialMatrixInvoice(
  items: SpecialMatrixItemInput[],
  options?: {
    invoiceNumber?: string;
    type?: InvoiceType;
    documentType?: InvoiceDocumentType;
  }
): SpecialMatrixInvoiceResult {
  const calculatedItems = items.map(calculateSpecialMatrixItem);

  let totalPureGoldWeight = 0;
  let totalGoldAmount = 0;
  let totalLaborAmount = 0;
  let totalKdvAmount = 0;
  let grandTotal = 0;

  for (const item of calculatedItems) {
    totalPureGoldWeight += item.pureGoldWeight;
    totalGoldAmount += item.goldCost;
    totalLaborAmount += item.laborAmount;
    totalKdvAmount += item.kdvAmount;
    grandTotal += item.total;
  }

  return {
    invoiceNumber: options?.invoiceNumber || generateInvoiceNumber(),
    type: options?.type || INVOICE_TYPES.OZEL_MATRAH,
    documentType: options?.documentType || INVOICE_DOCUMENT_TYPES.E_ARSIV,
    items: calculatedItems,
    totalPureGoldWeight: Number(totalPureGoldWeight.toFixed(4)),
    totalGoldAmount: Number(totalGoldAmount.toFixed(2)),
    totalLaborAmount: Number(totalLaborAmount.toFixed(2)),
    totalKdvAmount: Number(totalKdvAmount.toFixed(2)),
    grandTotal: Number(grandTotal.toFixed(2)),
    legalNotice: INVOICE_DEFAULTS.NOTE_23E,
    currency: INVOICE_DEFAULTS.CURRENCY,
  };
}

/**
 * Standart e-Fatura / e-Arşiv Fatura seri numarası üretir (Örn: KYM202600000001).
 */
export function generateInvoiceNumber(prefix: string = INVOICE_DEFAULTS.SERIES_PREFIX, sequence: number = 1): string {
  const currentYear = new Date().getFullYear();
  const seqStr = String(sequence).padStart(9, '0');
  return `${prefix}${currentYear}${seqStr}`;
}
