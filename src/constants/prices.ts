// WebSocket bağlantı sabitleri — Magic String kuralı
export const ALTIS_WS_URL = 'ws://5.250.255.86:17356' as const;
export const HAREM_WS_URL = 'wss://hrmsocketonly.haremaltin.com' as const;
export const HAREM_WS_PATH = '/socket.io' as const;

// DB singleton anahtarı
export const SETTINGS_SINGLETON_ID = 'singleton' as const;
export const HAS_SINGLETON_ID = 'singleton' as const;

// Kaynak etiketleri
export const SOURCE_LABELS: Record<string, string> = {
  altis: 'Altis',
  harem: 'Harem Altın',
};

export const DEFAULT_SOURCE_ORDER = ['harem', 'altis'] as const;

// Has fiyat kodları
export const HAS_CODE = 'GAUTRY' as const;
export const HAREM_HAS_CODE = 'ALTIN' as const; // Harem'den gelen has kodu → GAUTRY'ye map edilir

// Döviz kodları (Harem websocketinden)
export const USDTRY_CODE = 'USDTRY' as const;
export const EURTRY_CODE = 'EURTRY' as const;

// Arka planda DB'ye yazılan Eski Ziynet Has milyemleri (sadece Altis'ten)
export const ZIYNET_OLD_CODES = ['ECEYREK', 'EYARIM', 'ETAM', 'EATA', 'EGREMSE'] as const;
export type ZiynetOldCode = typeof ZIYNET_OLD_CODES[number];

export const ZIYNET_LABELS: Record<string, string> = {
  ECEYREK: 'Çeyrek Altın (Has)',
  EYARIM:  'Yarım Altın (Has)',
  ETAM:    'Tam Altın (Has)',
  EATA:    'Ata Altın (Has)',
  EGREMSE: 'Gremse (Has)',
};

// Orta kolon — Eski ziynet (TL cinsinden), Altis'ten (sırasıyla çeyrek, yarım, tam, ata altını, gremse)
export const ZIYNET_TL_OLD_CODES = ['ECEYREKTL', 'EYARIMTL', 'ETAMTL', 'EATATL', 'EGREMSETL'] as const;
export type ZiynetTlOldCode = typeof ZIYNET_TL_OLD_CODES[number];

export const ZIYNET_TL_LABELS: Record<string, string> = {
  ECEYREKTL: 'Çeyrek Altın',
  EYARIMTL:  'Yarım Altın',
  ETAMTL:    'Tam Altın',
  EATATL:    'Ata Altın',
  EGREMSETL: 'Gremse',
};

// Sağ kolon — Diğer altın ürünler (has × milyem / 1000)
export const PRODUCTS = [
  { key: 'mil24Ayar',     label: '24 Ayar Gram',          defaultMil: 1000 },
  { key: 'mil22Ayar',     label: '22 Ayar Gram',          defaultMil: 916  },
  { key: 'milAdanaBurma', label: 'Adana-Burma Bilezik',   defaultMil: 931  }, // default updated to photo (0.931)
  { key: 'milAjda',       label: 'Ajda-Desenli Bilezik',  defaultMil: 942  }, // default updated to photo (0.942)
  { key: 'mil14Ayar',     label: '14 Ayar Gram',          defaultMil: 583  },
] as const;

export type ProductKey = typeof PRODUCTS[number]['key'];

// Varsayılan ayarlar (DB'den yüklenemezse kullanılır)
export const DEFAULT_SETTINGS = {
  sourceOrder:   ['altis', 'harem'] as string[],
  priceOffsets:  {
    isManuel: false,
    eceyrekWeight: 1.605,
    eyarimWeight: 3.21,
    etamWeight: 6.42,
    eataWeight: 7.008,
    egremseWeight: 16.05,
  } as Record<string, any>,
  mil24Ayar:     1000,
  mil22Ayar:     916,
  milAdanaBurma: 931,
  milAjda:       942,
  mil14Ayar:     583,
  gremseMil:     0,
} as const;
