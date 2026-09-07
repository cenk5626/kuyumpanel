import { PO_DEFAULTS } from '@/constants/purchase';
import { roundGrams } from '@/lib/security/validation';

/**
 * Ayara karşılık gelen standart milyem değerini döndürür.
 */
export function getCaratMilyem(carat: number): number {
  switch (carat) {
    case 24:
      return 995;
    case 22:
      return 916;
    case 18:
      return 750;
    case 14:
      return 585;
    case 8:
      return 333;
    default:
      if (carat >= 24) return 995;
      if (carat >= 22) return 916;
      if (carat >= 18) return 750;
      if (carat >= 14) return 585;
      return 333;
  }
}

/**
 * Fiili gramaj ve ayardan Has Altın (saf altın) karşılığını hesaplar.
 */
export function calculateHasEquivalent(
  weight: number,
  carat: number,
  customMilyem?: number
): number {
  const milyem = customMilyem && customMilyem > 0 ? customMilyem : getCaratMilyem(carat);
  const has = weight * (milyem / 1000);
  return roundGrams(has);
}

/**
 * Sipariş edilen tahmini gramaj ile fiili mal kabulde gelen gramaj arasındaki farkı hesaplar.
 */
export function calculateWeightVariance(
  orderedWeight: number,
  actualWeight: number
): {
  weightDiff: number;
  percentDiff: number;
  isExcess: boolean;
  statusText: string;
} {
  const weightDiff = roundGrams(actualWeight - orderedWeight);
  const percentDiff =
    orderedWeight > 0
      ? Number(((weightDiff / orderedWeight) * 100).toFixed(2))
      : 0;
  const isExcess = weightDiff > 0;

  let statusText = 'Tam Eşleşme';
  if (weightDiff > 0) {
    statusText = `+${weightDiff.toFixed(2)} gr Fazla Geldi (+%${percentDiff})`;
  } else if (weightDiff < 0) {
    statusText = `${weightDiff.toFixed(2)} gr Eksik Geldi (%${percentDiff})`;
  }

  return {
    weightDiff,
    percentDiff,
    isExcess,
    statusText,
  };
}

/**
 * Sıralı Tedarik Siparişi Numarası üretir (Örn: PO-2026-0001).
 */
export function generatePurchaseOrderNumber(
  existingCount: number,
  year: number = new Date().getFullYear()
): string {
  const padded = String(existingCount + 1).padStart(PO_DEFAULTS.PAD_LENGTH, '0');
  return `${PO_DEFAULTS.PO_PREFIX}-${year}-${padded}`;
}

/**
 * Sıralı Mal Kabul İrsaliye Numarası üretir (Örn: GR-2026-0001).
 */
export function generateGoodsReceiptNumber(
  existingCount: number,
  year: number = new Date().getFullYear()
): string {
  const padded = String(existingCount + 1).padStart(PO_DEFAULTS.PAD_LENGTH, '0');
  return `${PO_DEFAULTS.GR_PREFIX}-${year}-${padded}`;
}
