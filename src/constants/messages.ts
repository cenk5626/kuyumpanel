// Türkçe UI metinleri — Magic String kuralı
export const MESSAGES = {
  APP_NAME: 'KuyumPanel',
  APP_SUBTITLE: 'Kuyumculuk Yönetim Sistemi',

  // Login
  LOGIN_TITLE: 'Giriş Yap',
  LOGIN_EMAIL_LABEL: 'E-posta',
  LOGIN_EMAIL_PLACEHOLDER: 'admin@kuyumpanel.com',
  LOGIN_PASSWORD_LABEL: 'Şifre',
  LOGIN_PASSWORD_PLACEHOLDER: '••••••••',
  LOGIN_BUTTON: 'Giriş Yap',
  LOGIN_LOADING: 'Giriş yapılıyor...',
  LOGIN_ERROR_INVALID: 'E-posta veya şifre hatalı.',
  LOGIN_ERROR_GENERIC: 'Bir hata oluştu. Lütfen tekrar deneyin.',

  // Dashboard
  DASHBOARD_TITLE: 'Dashboard',
  DASHBOARD_WELCOME: 'Hoş Geldiniz',
  DASHBOARD_SUBTITLE: 'KuyumPanel yönetim panelinize hoş geldiniz.',
  STAT_TOTAL_USERS: 'Toplam Kullanıcı',
  STAT_ADMINS: 'Admin Sayısı',
  STAT_ACTIVE_TODAY: 'Bugün Aktif',
  STAT_SYSTEM_STATUS: 'Sistem Durumu',
  STAT_SYSTEM_ONLINE: 'Çevrimiçi',

  // Users
  USERS_TITLE: 'Kullanıcı Yönetimi',
  USERS_ADD_BUTTON: 'Yeni Kullanıcı',
  USERS_TABLE_NAME: 'Ad Soyad',
  USERS_TABLE_EMAIL: 'E-posta',
  USERS_TABLE_ROLE: 'Rol',
  USERS_TABLE_DATE: 'Kayıt Tarihi',
  USERS_TABLE_ACTIONS: 'İşlemler',
  USERS_EMPTY: 'Henüz kullanıcı bulunmuyor.',
  USERS_DELETE_CONFIRM: 'Bu kullanıcıyı silmek istediğinize emin misiniz?',
  USERS_SUPER_ADMIN_NO_DELETE: 'Super Admin silinemez.',

  // User Form
  USER_FORM_ADD_TITLE: 'Yeni Kullanıcı Ekle',
  USER_FORM_EDIT_TITLE: 'Kullanıcı Düzenle',
  USER_FORM_NAME: 'Ad Soyad',
  USER_FORM_EMAIL: 'E-posta',
  USER_FORM_PASSWORD: 'Şifre',
  USER_FORM_PASSWORD_HINT: 'Düzenlerken boş bırakırsanız şifre değişmez.',
  USER_FORM_ROLE: 'Rol',
  USER_FORM_SAVE: 'Kaydet',
  USER_FORM_CANCEL: 'İptal',

  // Roles
  ROLE_SUPER_ADMIN: 'Super Admin',
  ROLE_ADMIN: 'Bayi Yetkilisi',
  ROLE_TABLET: 'Tablet Kullanıcısı',
  ROLE_PC: 'Bilgisayar Kullanıcısı',
  ROLE_USER: 'Kullanıcı',

  // Sidebar
  MENU_DASHBOARD: 'Dashboard',
  MENU_PRICES: 'Fiyat Ekranı',
  MENU_USERS: 'Kullanıcılar',
  MENU_STOCKS: 'Stok Takip',
  MENU_TRANSACTIONS: 'Alış / Satış',
  MENU_SUPPLIERS: 'Toptancı & Mutabakat',
  MENU_CUSTOMERS: 'Müşteriler & Borç Takip',
  MENU_LOGS: 'İşlem Logları',
  MENU_PRICE_CHECK: 'Fiyat Gör Kiosk',
  MENU_LOGOUT: 'Çıkış Yap',

  // General
  LOADING: 'Yükleniyor...',
  ERROR: 'Hata',
  SUCCESS: 'Başarılı',
  CONFIRM: 'Onayla',
  CANCEL: 'İptal',

  // Fiyat ekranı
  PRICES_HAS_TITLE: 'HAS FİYATI',
  PRICES_DOVIZ_TITLE: 'DÖVİZ',
  PRICES_ZIYNET_HAS_TITLE: 'ZİYNET (HAS)',
  PRICES_ZIYNET_TL_TITLE: 'Eski Ziynet',
  PRICES_PRODUCTS_TITLE: 'Diğer Altın Ürünler',
  PRICES_ACTIVE_SOURCE: 'Aktif',
  PRICES_SECONDARY_SOURCE: 'Yedek',
  PRICES_ALIS: 'ALIŞ',
  PRICES_SATIS: 'SATIŞ',
  PRICES_CONNECTED: 'Bağlandı',
  PRICES_CONNECTING: 'Bağlanıyor...',
  PRICES_ERROR: 'Bağlantı Hatası',
  PRICES_SETTINGS_TITLE: 'Fiyat Ayarları',
  PRICES_SOURCE_ORDER_TAB: 'Kaynak Önceliği',
  PRICES_MILLIEMES_TAB: 'Ürün Fiyatlandırma',
  PRICES_SAVE: 'Kaydet',
  PRICES_MILIEME_LABEL: 'Milyem',

  // Stok Takip
  STOCKS_TITLE: 'Stok Takip',
  STOCKS_SARRAFIYE: 'Sarrafiye',
  STOCKS_DOVIZ: 'Döviz',
  STOCKS_AMOUNT: 'Stok Miktarı',
  STOCKS_EDIT: 'Düzelt',
  STOCKS_EMPTY: 'Stok kaydı bulunamadı.',
  STOCKS_ADJUST_TITLE: 'Stok Düzeltme',
  STOCKS_ADJUST_SAVE: 'Güncelle',

  // Alış / Satış
  TX_TITLE: 'Alış / Satış İşlemleri',
  TX_TYPE_BUY: 'Alış (Biz Alıyoruz)',
  TX_TYPE_SELL: 'Satış (Biz Satıyoruz)',
  TX_CATEGORY: 'Kategori',
  TX_PRODUCT: 'Ürün',
  TX_PRICE: 'Birim Fiyat (TL)',
  TX_QUANTITY: 'Miktar',
  TX_TOTAL: 'Toplam',
  TX_COMPLETE: 'İşlemi Tamamla',
  TX_HISTORY: 'Son İşlemler',
  TX_EMPTY: 'Henüz işlem yok.',
} as const;

