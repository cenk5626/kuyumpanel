// Pırlanta & Değerli Taş (4C) Sabitleri ve Tanımları
export const DIAMOND_COLORS = [
  { code: 'D', label: 'D (Kusursuz Beyaz / Exceptional White+)' },
  { code: 'E', label: 'E (Ekstra Beyaz / Exceptional White)' },
  { code: 'F', label: 'F (Nadir Beyaz+ / Rare White+)' },
  { code: 'G', label: 'G (Nadir Beyaz / Rare White)' },
  { code: 'H', label: 'H (Beyaz / White)' },
  { code: 'I', label: 'I (Hafif Renkli Beyaz / Slightly Tinted White)' },
  { code: 'J', label: 'J (Renkli Beyaz / Tinted White)' },
  { code: 'K', label: 'K (Hafif Sarı / Tinted Color)' },
] as const;

export const DIAMOND_CLARITIES = [
  { code: 'FL', label: 'FL (Kusursuz / Flawless)' },
  { code: 'IF', label: 'IF (İç Kusursuz / Internally Flawless)' },
  { code: 'VVS1', label: 'VVS1 (Çok Çok Küçük Lekeli 1)' },
  { code: 'VVS2', label: 'VVS2 (Çok Çok Küçük Lekeli 2)' },
  { code: 'VS1', label: 'VS1 (Çok Küçük Lekeli 1)' },
  { code: 'VS2', label: 'VS2 (Çok Küçük Lekeli 2)' },
  { code: 'SI1', label: 'SI1 (Küçük Lekeli 1)' },
  { code: 'SI2', label: 'SI2 (Küçük Lekeli 2)' },
  { code: 'I1', label: 'I1 (Gözle Görülür Lekeli)' },
] as const;

export const DIAMOND_CUTS = [
  { code: 'EXCELLENT', label: 'Mükemmel (Excellent)' },
  { code: 'VERY_GOOD', label: 'Çok İyi (Very Good)' },
  { code: 'GOOD', label: 'İyi (Good)' },
  { code: 'FAIR', label: 'Orta (Fair)' },
] as const;

export const CERTIFICATE_ORGS = [
  { code: 'GIA', label: 'GIA (Gemological Institute of America)' },
  { code: 'HRD', label: 'HRD (HRD Antwerp)' },
  { code: 'IGI', label: 'IGI (International Gemological Institute)' },
  { code: 'MAGAZA', label: 'Özel Mağaza Garantili Sertifika' },
] as const;
