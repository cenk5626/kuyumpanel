/**
 * KuyumPanel Sayfa Bazlı Bağımsız Yetkilendirme Sabitleri & Tipleri
 * Zero Magic Numbers / Magic Strings Kuralına Tam Uyumlu
 */

export const PAGE_CATEGORY_KEYS = {
  SALES_SHOWCASE: 'sales_showcase',
  CUSTOMER_CRM: 'customer_crm',
  FINANCE_ACCOUNTING: 'finance_accounting',
  OPERATIONS_WORKSHOP: 'operations_workshop',
  MANAGEMENT_AI: 'management_ai',
} as const;

export type PageCategoryKey = typeof PAGE_CATEGORY_KEYS[keyof typeof PAGE_CATEGORY_KEYS];

export interface PageCategoryMeta {
  id: PageCategoryKey;
  title: string;
  icon: string;
  badgeClass: string;
  description: string;
}

export const PAGE_CATEGORIES: Record<PageCategoryKey, PageCategoryMeta> = {
  [PAGE_CATEGORY_KEYS.SALES_SHOWCASE]: {
    id: PAGE_CATEGORY_KEYS.SALES_SHOWCASE,
    title: 'Satış, Vitrin & Kiosk',
    icon: 'ArrowLeftRight',
    badgeClass: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    description: 'Hızlı perakende satış, canlı kurlar, stok ve müşteri fiyat ekranları',
  },
  [PAGE_CATEGORY_KEYS.CUSTOMER_CRM]: {
    id: PAGE_CATEGORY_KEYS.CUSTOMER_CRM,
    title: 'Cari & Müşteri İlişkileri',
    icon: 'UserCheck',
    badgeClass: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    description: 'Veresiye borç takibi, müşteri sadakat puanı, CRM ve teklif yönetimi',
  },
  [PAGE_CATEGORY_KEYS.FINANCE_ACCOUNTING]: {
    id: PAGE_CATEGORY_KEYS.FINANCE_ACCOUNTING,
    title: 'Finans, Kasa & Muhasebe',
    icon: 'Landmark',
    badgeClass: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    description: 'Z-Raporu kasa kapatma, resmi e-fatura (KDV 23/e), senet ve banka takas',
  },
  [PAGE_CATEGORY_KEYS.OPERATIONS_WORKSHOP]: {
    id: PAGE_CATEGORY_KEYS.OPERATIONS_WORKSHOP,
    title: 'Operasyon, Depo & Atölye',
    icon: 'Flame',
    badgeClass: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
    description: 'Toptancı cari, mal kabul, atölye ramat takibi, şubeler ve RFID sayım',
  },
  [PAGE_CATEGORY_KEYS.MANAGEMENT_AI]: {
    id: PAGE_CATEGORY_KEYS.MANAGEMENT_AI,
    title: 'Yönetim, Uyum & Yapay Zeka',
    icon: 'Bot',
    badgeClass: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
    description: 'Yönetici analitiği, MASAK uyum, AI patron asistanı, loglar ve kullanıcılar',
  },
};

export interface SystemPageMeta {
  id: string;
  name: string;
  description: string;
  category: PageCategoryKey;
  icon: string;
  badge?: string;
  isRestrictedByDefault?: boolean;
}

export const SYSTEM_PAGES: SystemPageMeta[] = [
  // 1. Satış, Vitrin & Kiosk
  {
    id: 'dashboard',
    name: 'Dashboard (Ana Sayfa)',
    description: 'Genel özet, anlık ciro, altın stoğu ve kritik uyarılar',
    category: PAGE_CATEGORY_KEYS.SALES_SHOWCASE,
    icon: 'LayoutDashboard',
  },
  {
    id: 'prices',
    name: 'Canlı Fiyat Ekranı',
    description: 'Kapalıçarşı anlık altın, döviz kurları ve kâr marjı ayarlama',
    category: PAGE_CATEGORY_KEYS.SALES_SHOWCASE,
    icon: 'Activity',
  },
  {
    id: 'stocks',
    name: 'Stok Takip',
    description: 'Barkodlu takı, ziynet, pırlanta ve sarrafiye ürün envanteri',
    category: PAGE_CATEGORY_KEYS.SALES_SHOWCASE,
    icon: 'Package',
  },
  {
    id: 'transactions',
    name: 'Alış / Satış (POS)',
    description: 'Hızlı perakende satış, hurda altın alış ve çoklu ödeme POS',
    category: PAGE_CATEGORY_KEYS.SALES_SHOWCASE,
    icon: 'ArrowLeftRight',
  },
  {
    id: 'price-check',
    name: 'Fiyat Gör Kiosk',
    description: 'Müşteri barkod okuma ve vitrin bilgilendirme kiosku',
    category: PAGE_CATEGORY_KEYS.SALES_SHOWCASE,
    icon: 'ScanBarcode',
  },
  {
    id: 'alerts',
    name: 'Fiyat Alarmları',
    description: 'Altın ve döviz kurları için hedef fiyat bildirimleri',
    category: PAGE_CATEGORY_KEYS.SALES_SHOWCASE,
    icon: 'BellRing',
  },

  // 2. Cari & Müşteri İlişkileri
  {
    id: 'customers',
    name: 'Müşteriler & Borç Takip',
    description: 'Müşteri kartları, Has/TL veresiye takibi ve emanet altın kasası',
    category: PAGE_CATEGORY_KEYS.CUSTOMER_CRM,
    icon: 'UserCheck',
  },
  {
    id: 'loyalty',
    name: 'Sadakat & RFM',
    description: 'ParaPuan sistemi, RFM müşteri segmentasyonu ve özel günler',
    category: PAGE_CATEGORY_KEYS.CUSTOMER_CRM,
    icon: 'HeartHandshake',
  },
  {
    id: 'crm',
    name: 'CRM & Kampanyalar',
    description: 'WhatsApp şablonları, onaylı iletişim ve toplu kampanya yönetimi',
    category: PAGE_CATEGORY_KEYS.CUSTOMER_CRM,
    icon: 'MessageSquareShare',
  },
  {
    id: 'quotes',
    name: 'Teklif & İskonto',
    description: 'Müşteriye özel süreli fiyat teklifi ve iskonto onay süreci',
    category: PAGE_CATEGORY_KEYS.CUSTOMER_CRM,
    icon: 'BadgePercent',
  },

  // 3. Finans, Kasa & Muhasebe
  {
    id: 'z-report',
    name: 'Kasa Z-Raporu',
    description: 'Gün sonu kasa kapatma, devir mutabakatı ve termal döküm',
    category: PAGE_CATEGORY_KEYS.FINANCE_ACCOUNTING,
    icon: 'Building',
  },
  {
    id: 'balance-sheet',
    name: 'Bilanço & Finans',
    description: 'Kapsamlı gelir-gider tablosu, net kâr ve finansal bilanço',
    category: PAGE_CATEGORY_KEYS.FINANCE_ACCOUNTING,
    icon: 'TrendingUp',
  },
  {
    id: 'banking',
    name: 'Banka & POS Takas',
    description: 'Açık bankacılık hesap hareketleri ve POS bloke gün takibi',
    category: PAGE_CATEGORY_KEYS.FINANCE_ACCOUNTING,
    icon: 'Landmark',
  },
  {
    id: 'invoices',
    name: 'Fatura & e-Arşiv',
    description: 'KDV Kanunu 23/e özel matrahlı kuyumcu faturası ve e-arşiv',
    category: PAGE_CATEGORY_KEYS.FINANCE_ACCOUNTING,
    icon: 'ReceiptText',
  },
  {
    id: 'expense-vouchers',
    name: 'Gider Pusulası',
    description: 'Nihai tüketiciden hurda altın alımında resmi gider pusulası',
    category: PAGE_CATEGORY_KEYS.FINANCE_ACCOUNTING,
    icon: 'FileText',
  },
  {
    id: 'installments',
    name: 'Taksit & Senet',
    description: 'Taksitli satış planlama, resmi bono/senet basımı ve tahsilat',
    category: PAGE_CATEGORY_KEYS.FINANCE_ACCOUNTING,
    icon: 'CalendarClock',
  },

  // 4. Operasyon, Depo & Atölye
  {
    id: 'suppliers',
    name: 'Toptancı & Mutabakat',
    description: 'Toptancı cari hesapları, has altın ve TL bakiye mutabakatı',
    category: PAGE_CATEGORY_KEYS.OPERATIONS_WORKSHOP,
    icon: 'Truck',
  },
  {
    id: 'purchases',
    name: 'Mal Kabul & Satın Alma',
    description: 'Toptancı siparişleri, irsaliyeli mal kabul ve maliyet sapmaları',
    category: PAGE_CATEGORY_KEYS.OPERATIONS_WORKSHOP,
    icon: 'Boxes',
  },
  {
    id: 'workshop',
    name: 'Hurda & Atölye Ramat',
    description: 'Hurda eritme, takoz milyem hesabı ve atölye fire/ramat takibi',
    category: PAGE_CATEGORY_KEYS.OPERATIONS_WORKSHOP,
    icon: 'Flame',
  },
  {
    id: 'services',
    name: 'Servis & Tamir',
    description: 'Müşteri tamir, cila, ölçü küçültme ve bakım takip fişleri',
    category: PAGE_CATEGORY_KEYS.OPERATIONS_WORKSHOP,
    icon: 'Wrench',
  },
  {
    id: 'branches',
    name: 'Şube Yönetimi',
    description: 'Çoklu şube ağı, şube kasaları ve bağımsız envanterler',
    category: PAGE_CATEGORY_KEYS.OPERATIONS_WORKSHOP,
    icon: 'GitFork',
  },
  {
    id: 'transfers',
    name: 'Şube Transfer',
    description: 'Şubeler arası stok sevk irsaliyesi, onay ve kurye takibi',
    category: PAGE_CATEGORY_KEYS.OPERATIONS_WORKSHOP,
    icon: 'ArrowRightLeft',
  },
  {
    id: 'stock-audit',
    name: 'Stok Sayım & Denetim',
    description: 'Periyodik kör sayım, raf mutabakatı ve açık/fazla raporu',
    category: PAGE_CATEGORY_KEYS.OPERATIONS_WORKSHOP,
    icon: 'ClipboardCheck',
  },
  {
    id: 'rfid-stocktake',
    name: 'RFID Vitrin Sayımı',
    description: 'El terminali veya sabit anten ile vitrin tepsilerini saniyeler içinde sayma',
    category: PAGE_CATEGORY_KEYS.OPERATIONS_WORKSHOP,
    icon: 'Radio',
  },

  // 5. Yönetim, Uyum & Yapay Zeka
  {
    id: 'executive-analytics',
    name: 'Yönetici Analitiği',
    description: 'Yönetim kokpiti, talep tahminleri, kârlılık ve büyüme projeksiyonları',
    category: PAGE_CATEGORY_KEYS.MANAGEMENT_AI,
    icon: 'LineChart',
  },
  {
    id: 'approvals',
    name: 'Onay & Limitler',
    description: 'Yetki aşımı, yüksek iskonto ve kritik işlem onay mekanizması',
    category: PAGE_CATEGORY_KEYS.MANAGEMENT_AI,
    icon: 'ShieldCheck',
  },
  {
    id: 'channels',
    name: 'Pazaryeri & E-Ticaret',
    description: 'Trendyol, Hepsiburada ve e-ticaret siteleri ile stok senkronu',
    category: PAGE_CATEGORY_KEYS.MANAGEMENT_AI,
    icon: 'Globe',
  },
  {
    id: 'compliance',
    name: 'MASAK & AML Uyum',
    description: 'Kimlik tespit eşikleri, şüpheli işlem tespiti ve MASAK bildirimleri',
    category: PAGE_CATEGORY_KEYS.MANAGEMENT_AI,
    icon: 'ShieldAlert',
  },
  {
    id: 'data-hub',
    name: 'Veri Merkezi',
    description: 'Excel/CSV ile toplu stok, müşteri ve fiyat içeri/dışarı aktarımı',
    category: PAGE_CATEGORY_KEYS.MANAGEMENT_AI,
    icon: 'FileSpreadsheet',
  },
  {
    id: 'ai-assistant',
    name: 'AI Patron Asistanı',
    description: 'Sesli ve metin tabanlı akıllı mağaza danışmanı ve komut yürütme',
    category: PAGE_CATEGORY_KEYS.MANAGEMENT_AI,
    icon: 'Bot',
  },
  {
    id: 'settings-ai',
    name: 'AI Parametreleri',
    description: 'Yapay zeka modelleri, API anahtarları ve dil parametreleri',
    category: PAGE_CATEGORY_KEYS.MANAGEMENT_AI,
    icon: 'Settings',
  },
  {
    id: 'logs',
    name: 'İşlem Logları',
    description: 'Detaylı sistem denetim ve kullanıcı işlem kayıtları (Sadece Yönetici)',
    category: PAGE_CATEGORY_KEYS.MANAGEMENT_AI,
    icon: 'History',
    isRestrictedByDefault: true,
  },
  {
    id: 'users',
    name: 'Kullanıcı & İzin Yönetimi',
    description: 'Personel hesapları, sayfa yetkilendirmeleri ve bayi atamaları',
    category: PAGE_CATEGORY_KEYS.MANAGEMENT_AI,
    icon: 'Users',
    isRestrictedByDefault: true,
  },
];

export const ALL_PAGE_IDS = SYSTEM_PAGES.map((page) => page.id);

/**
 * Hızlı Yetki Şablonları (Role & Görev Bazlı Presets)
 */
export const PERMISSION_PRESETS = {
  FULL: {
    id: 'full',
    label: 'Tam Yetki (Tüm Sayfalar)',
    description: 'Sistemdeki tüm modül ve sayfalara sınırsız erişim',
    pages: ALL_PAGE_IDS,
  },
  CASHIER: {
    id: 'cashier',
    label: 'Kasiyer & Satış Tezgahtarı',
    description: 'Temel satış, stok görüntüleme, borç kaydı ve fiyat kiosk ekranı',
    pages: [
      'dashboard',
      'prices',
      'stocks',
      'transactions',
      'customers',
      'quotes',
      'installments',
      'price-check',
      'alerts',
    ],
  },
  ACCOUNTING: {
    id: 'accounting',
    label: 'Ön Muhasebe & Kasa',
    description: 'Kasa Z-Raporu, faturalar, gider pusulası, senetler ve banka işlemleri',
    pages: [
      'dashboard',
      'prices',
      'transactions',
      'customers',
      'suppliers',
      'invoices',
      'expense-vouchers',
      'installments',
      'z-report',
      'balance-sheet',
      'banking',
    ],
  },
  WORKSHOP: {
    id: 'workshop',
    label: 'Atölye & Depo Sorumlusu',
    description: 'Stoklar, atölye ramat, hurda sandığı, tamir ve sayım süreçleri',
    pages: [
      'dashboard',
      'stocks',
      'workshop',
      'services',
      'purchases',
      'suppliers',
      'transfers',
      'stock-audit',
      'rfid-stocktake',
    ],
  },
  STORE_MANAGER: {
    id: 'store_manager',
    label: 'Mağaza Müdürü',
    description: 'Kullanıcı ve log yönetimi hariç tüm operasyonel modüller',
    pages: ALL_PAGE_IDS.filter((id) => id !== 'users' && id !== 'settings-ai'),
  },
} as const;

export type PermissionPresetKey = keyof typeof PERMISSION_PRESETS;
