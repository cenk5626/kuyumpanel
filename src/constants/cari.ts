/**
 * Cari & Altın Hesap Sabitleri ve Enumları
 * Zero Magic Numbers / Magic Strings Kuralına Uygun Tanımlamalar
 */

// Müşteri İşlem Tipleri (Borçlandırma / Tahsilat / Alacak / Ödeme)
export const CUSTOMER_TRANSACTION_TYPES = {
  BORC: 'BORC',         // Müşteriye borç verme (Bizim alacağımız artar)
  TAHSILAT: 'TAHSILAT', // Müşteriden alacak tahsilatı (Müşteri borcu azalır)
  ALACAK: 'ALACAK',     // Müşteri lehine alacak kaydı
  ODEME: 'ODEME',       // Müşteriye ödeme yapma
} as const;

export type CustomerTransactionType = (typeof CUSTOMER_TRANSACTION_TYPES)[keyof typeof CUSTOMER_TRANSACTION_TYPES];

// Cari İşlem Tipleri Kısaltması
export const CARI_TX_TYPES = CUSTOMER_TRANSACTION_TYPES;
export type CariTxType = CustomerTransactionType;

// Toptancı İşlem Tipleri
export const SUPPLIER_TRANSACTION_TYPES = {
  PURCHASE: 'PURCHASE',         // Mal Alımı (Toptancıya borcumuz artar)
  HAS_PAYMENT: 'HAS_PAYMENT',   // Has Altın Ödemesi (Toptancı borcumuz azalır)
  TL_PAYMENT: 'TL_PAYMENT',     // TL Ödemesi (Toptancı borcumuz azalır)
  SETTLEMENT: 'SETTLEMENT',     // Mutabakat / Bakiye Düzeltmesi
} as const;

export type SupplierTransactionType = (typeof SUPPLIER_TRANSACTION_TYPES)[keyof typeof SUPPLIER_TRANSACTION_TYPES];

// Desteklenen Varlık Türleri
export const ASSET_TYPES = {
  TL: 'TL',
  USD: 'USD',
  EUR: 'EUR',
  HAS: 'HAS',
  K24: '24K',
  K22: '22K',
  K18: '18K',
  K14: '14K',
  K8: '8K',
  CEYREK: 'CEYREK',
  YARIM: 'YARIM',
  TAM: 'TAM',
  ATA: 'ATA',
  GREMSE: 'GREMSE',
} as const;

export type AssetType = (typeof ASSET_TYPES)[keyof typeof ASSET_TYPES];

/**
 * Altın Ayar Milyem / Has Dönüşüm Katsayıları
 * 1 gram ilgili ayardaki altının Has Altın (24K / 0.995+) karşılığı
 */
export const GOLD_FINENESS_RATES: Record<string, number> = {
  '24K': 0.995,
  '22K': 0.916,
  '18K': 0.750,
  '14K': 0.585,
  '8K': 0.333,
  'HAS': 1.000,
  '24_AYAR': 0.995,
  '22_AYAR': 0.916,
  '18_AYAR': 0.750,
  '14_AYAR': 0.585,
  '8_AYAR': 0.333,
};

export const GOLD_FINENESS_FACTORS = {
  [ASSET_TYPES.HAS]: 1.000,
  [ASSET_TYPES.K24]: 0.995,
  [ASSET_TYPES.K22]: 0.916,
  [ASSET_TYPES.K18]: 0.750,
  [ASSET_TYPES.K14]: 0.585,
  [ASSET_TYPES.K8]: 0.333,
} as const;

/**
 * Ziynet Altın Standart Has Gram Ağırlıkları
 * Her bir adet ziynetin saf altın karşılığı (gr Has)
 */
export const ZIYNET_WEIGHTS: Record<string, number> = {
  CEYREK: 1.605, // 1.75 gr * 0.916 milyem = ~1.605 gr Has
  YARIM: 3.210,  // 3.50 gr * 0.916 milyem = ~3.210 gr Has
  TAM: 6.420,    // 7.00 gr * 0.916 milyem = ~6.420 gr Has
  ATA: 6.608,    // 7.216 gr * 0.916 milyem = ~6.608 gr Has
  GREMSE: 16.050,// 17.50 gr * 0.916 milyem = ~16.050 gr Has
};

export const ZIYNET_HAS_WEIGHTS = {
  [ASSET_TYPES.CEYREK]: 1.605,
  [ASSET_TYPES.YARIM]: 3.210,
  [ASSET_TYPES.TAM]: 6.420,
  [ASSET_TYPES.ATA]: 6.608,
  [ASSET_TYPES.GREMSE]: 16.050,
} as const;

/**
 * Varlık türüne göre Has Altın karşılığını hesaplar
 * @param assetType Varlık türü (TL, USD, EUR, HAS, 22K, CEYREK vb.)
 * @param amount Miktar / Gram / Adet
 * @param unitPrice TL işlemleri için o anki Gram Has Altın Fiyatı (TL/gr) veya döviz kuru
 */
export function calculateHasEquivalent(
  assetType: string,
  amount: number,
  unitPrice?: number | null,
  goldSpotPrice?: number | null
): number {
  if (!amount || amount <= 0) return 0;

  const normalizedAsset = assetType.toUpperCase();

  // 1. Doğrudan Has Altın
  if (normalizedAsset === ASSET_TYPES.HAS) {
    return Number(amount.toFixed(4));
  }

  // 2. Ziynet Altınları (Adet bazlı Has karşılığı)
  if (ZIYNET_WEIGHTS[normalizedAsset] !== undefined) {
    return Number((amount * ZIYNET_WEIGHTS[normalizedAsset]).toFixed(4));
  }

  // 3. Ayar Bazlı Altınlar (Gram * Milyem)
  if (GOLD_FINENESS_RATES[normalizedAsset] !== undefined) {
    return Number((amount * GOLD_FINENESS_RATES[normalizedAsset]).toFixed(4));
  }

  // 4. TL Cinsi (TL Tutar / Gram Has Fiyatı)
  if (normalizedAsset === ASSET_TYPES.TL && unitPrice && unitPrice > 0) {
    return Number((amount / unitPrice).toFixed(4));
  }

  // 5. USD / EUR Cinsi (FX Tutar * FX Kuru / Gram Has Fiyatı)
  if (normalizedAsset === ASSET_TYPES.USD || normalizedAsset === ASSET_TYPES.EUR) {
    const fxRate = unitPrice && unitPrice > 0 ? unitPrice : 1;
    const goldRate = goldSpotPrice && goldSpotPrice > 0 ? goldSpotPrice : 6000;
    if (fxRate < 500) {
      // unitPrice döviz kuru olarak girilmiş (örn: 38.50 ₺)
      return Number(((amount * fxRate) / goldRate).toFixed(4));
    }
    // unitPrice doğrudan has fiyatı olarak girilmiş
    return Number((amount / fxRate).toFixed(4));
  }

  return 0;
}
