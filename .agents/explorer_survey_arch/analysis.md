# KuyumPanel Kapsamlı Mimari & Kod Tabanı İnceleme Raporu

**Tarih**: 2026-08-17  
**Çalışma Dizini**: `c:\xampp\htdocs\kuyumpanel`  
**İnceleyen**: Explorer Subagent (`explorer_survey_arch`)  
**Hedef**: Mevcut kuyumpanel mimarisinin haritalandırılması ve R1-R6 gereksinimleri için entegrasyon noktalarının belirlenmesi.

---

## 1. Yönetici Özeti (Executive Summary)

`kuyumpanel`, modern kuyumculuk ve sarrafiye işletmeleri için geliştirilmiş, kurumsal düzeyde bir yönetim paneli ve satış/stok otomasyon sistemidir. Proje; Next.js 16 (App Router), React 19, Tailwind CSS v4, Prisma ORM (SQLite / LibSQL adapter), NextAuth v5 ve canlı WebSocket fiyat beslemeleri (Altis & Harem Altın) üzerine inşa edilmiştir.

Kod tabanı TypeScript ile geliştirilmiş olup sıkı tip denetiminden (`strict: true`, `npx tsc --noEmit`) 0 hata ile geçmektedir. Magic string/number kurallarına ve modüler klasör ayrımına özen gösterilmiştir.

---

## 2. Teknoloji Yığını ve Konfigürasyon Analizi

### 2.1. Çekirdek Bağımlılıklar (`package.json`)
- **Framework**: `next@16.2.10` (Next.js 16 App Router)
  - *Önemli Not*: `AGENTS.md` içerisinde belirtildiği üzere Next.js 16 API ve konvansiyonları güncel dokümantasyon kurallarına uygun kullanılmalıdır.
- **Frontend / UI**: `react@19.2.4`, `react-dom@19.2.4`
- **Animasyon & İkonlar**: `framer-motion@^12.42.2`, `lucide-react@^1.24.0`
- **Stil & CSS**: `tailwindcss@^4`, `@tailwindcss/postcss@^4` (Tailwind CSS v4 mimarisi)
- **Kimlik Doğrulama**: `next-auth@^5.0.0-beta.31` (Auth.js v5), `bcryptjs@^3.0.3`
- **Veritabanı & ORM**: `prisma@^5.22.0`, `@prisma/client@^5.22.0`, `@prisma/adapter-libsql@^5.22.0`, `@libsql/client@^0.8.0`
  - Yerel geliştirme ortamında `file:./dev.db` (SQLite), bulutta opsiyonel Turso LibSQL bağlantısı desteklenmektedir.
- **Canlı Veri & Soketler**: `socket.io-client@^4.8.3` (Harem Altın için), `ws@^8.21.1` (Altis WebSocket için sunucu tarafı dinleme)
- **Barkod & Kamera**: `html5-qrcode@^2.3.8` (Kamera ile Code128, Code39, EAN-13, QR okutma)

### 2.2. Geliştirme, Derleme ve Test Altyapısı
- **Derleme Komutu**: `npm run build` (`prisma generate && next build`)
- **Geliştirme Sunucusu**: `npm run dev` (`next dev -H 0.0.0.0 -p 3000`)
- **Lint**: `npm run lint` (`eslint`) — `eslint.config.mjs` (ESLint 9 flat config + `eslint-config-next`). Sıkı ESLint ve React 19 Compiler kuralları gereği mevcut bazı dosyalarda `@typescript-eslint/no-explicit-any` ve `react-hooks/exhaustive-deps` uyarıları mevcuttur; `npx tsc --noEmit` ise 0 hata ile tamamen temizdir.
- **Tip Kontrolü**: `tsconfig.json` (`target: ES2017`, `strict: true`, path alias `@/*` -> `./src/*`) — 0 hata.
- **Test Durumu**: Halihazırda yapılandırılmış otomatik unit/integration test kütüphanesi (Jest/Vitest/Playwright) `package.json` scriptlerinde bulunmamaktadır. Scratch dizininde bağımsız entegrasyon test scriptleri mevcuttur.

---

## 3. Dizin Organizasyonu & Dosya Yapısı

```
c:\xampp\htdocs\kuyumpanel\
├── .agents/                      # Multi-agent orkestrasyon metadata ve raporları
├── prisma/
│   ├── schema.prisma             # Veritabanı veri modelleri ve ilişkiler
│   ├── seed.ts                   # Başlangıç Super Admin tohumlama scripti
│   └── dev.db                    # Yerel SQLite veritabanı dosyası
├── public/                       # Statik varlıklar (SVG ikonlar, logolar)
├── src/
│   ├── middleware.ts             # JWT oturum kontrolü ve rota yönlendirme ara yazılımı
│   ├── app/
│   │   ├── layout.tsx            # Kök layout (Geist font ve metadata)
│   │   ├── login/
│   │   │   └── page.tsx          # Giriş sayfası (NextAuth credentials formu)
│   │   ├── (panel)/              # Yetkili panel rota grubu (PanelLayout)
│   │   │   ├── layout.tsx        # Panel genel düzeni (ThemeProvider, SessionProvider, Sidebar)
│   │   │   ├── page.tsx          # Ana Dashboard sunucu bileşeni
│   │   │   ├── DashboardClient.tsx# Dashboard interaktif metrik ve işlem akışı ekranı
│   │   │   ├── prices/           # Canlı fiyat ekranı ve milyem ayarları (/prices)
│   │   │   ├── stocks/           # Barkodlu ürün & sarrafiye stok takibi (/stocks)
│   │   │   ├── transactions/     # POS perakende alış/satış ekranı (/transactions)
│   │   │   ├── suppliers/        # Toptancı, atölye & mutabakat yönetimi (/suppliers)
│   │   │   ├── customers/        # Müşteri rehberi & veresiye takibi (/customers)
│   │   │   ├── price-check/      # Kiosk fiyat kontrol ekranı (/price-check)
│   │   │   ├── logs/             # Sistem işlem & audit logları (/logs)
│   │   │   └── users/            # Kullanıcı ve yetki yönetimi (/users)
│   │   └── api/                  # 19 REST API Uç Noktası
│   │       ├── auth/[...nextauth]/route.ts
│   │       ├── prices/ (has, live, altis, settings, ziynet)
│   │       ├── stocks/route.ts
│   │       ├── transactions/route.ts
│   │       ├── customers/route.ts
│   │       ├── customer-transactions/route.ts
│   │       ├── suppliers/route.ts
│   │       ├── supplier-transactions/route.ts
│   │       ├── products/route.ts
│   │       ├── categories/route.ts
│   │       ├── dealers/route.ts
│   │       ├── employees/route.ts
│   │       ├── logs/route.ts
│   │       ├── users/route.ts
│   │       └── seed/route.ts
│   ├── components/
│   │   ├── Sidebar.tsx           # Yan menü ve rol bazlı menü filtreleme
│   │   ├── HeaderActions.tsx     # Tema değiştirici & çıkış yap aksiyonları
│   │   ├── ThemeToggle.tsx       # Dark/Light mod buton bileşeni
│   │   └── CameraScannerModal.tsx# HTML5 QR/Barkod kamera modalı
│   ├── constants/
│   │   ├── routes.ts             # Tüm sayfa ve API rota sabitleri (ROUTES)
│   │   ├── roles.ts              # Kullanıcı rolleri (USER_ROLES)
│   │   ├── menu.ts               # Sol menü elemanları ve ikon tanımları (MENU_ITEMS)
│   │   ├── messages.ts           # Türkçe UI metin sabitleri (MESSAGES)
│   │   ├── prices.ts             # Altın/Döviz kodları, milyem ve soket sabitleri
│   │   └── theme.ts              # Tailwind class ve animasyon sabitleri (THEME, ANIM)
│   ├── context/
│   │   └── ThemeContext.tsx      # Aydınlık / Karanlık mod React Context sağlayıcısı
│   └── lib/
│       ├── prisma.ts             # Prisma Client singleton ve LibSQL adaptör yapılandırması
│       ├── auth.ts               # NextAuth v5 yetkilendirme yapılandırması
│       ├── logger.ts             # AuditLog kayıt fonksiyonu (`logActivity`)
│       └── altis-server.ts       # Sunucu tarafı Altis WebSocket veri çekici
```

---

## 4. Veri Modeli Analizi (`prisma/schema.prisma`)

Mevcut veritabanı şemasında tanımlı başlıca modeller:

1. **`User` & `Dealer`**: Çoklu bayi/şube desteği (`dealerId`), kullanıcı rolleri (`SUPER_ADMIN`, `ADMIN`, `TABLET`, `PC`, `USER`), JSON yetki dizisi (`permissions`).
2. **`HasPrice` & `ZiynetPrice` & `LivePrice` & `PriceSettings`**:
   - `HasPrice`: Singleton aktif Has altın alış/satış fiyatı.
   - `ZiynetPrice`: Eski ziynet Has milyemleri.
   - `LivePrice`: Hesaplanmış ve farkları eklenmiş canlı liste (`GAUTRY`, `USDTRY`, `EURTRY`, `mil24Ayar`, `mil22Ayar`, `ECEYREKTL` vb.).
   - `PriceSettings`: Kaynak önceliği (`sourceOrder`), ofsetler (`priceOffsets`), milyem katsayıları.
3. **`Stock` & `ProductItem`**:
   - `Stock`: Sarrafiye ve Döviz toplam miktarları (`product`, `label`, `type`, `amount`, `dealerId`).
   - `ProductItem`: Tekil barkodlu takı ürünleri (`barcode`, `title`, `carat`, `weight`, `laborType`, `laborCost`, `costMilyem`, `sellingMilyem`, `status`).
4. **`Category`, `SubCategory`, `SubSubCategory`**: 3 seviyeli takı kategori hiyerarşisi.
5. **`Supplier` & `SupplierTransaction`**: Toptancı/atölye cari hesapları (`hasBalance`, `tlBalance`), mal alımı ve Has/TL ödeme hareketleri.
6. **`Customer` & `CustomerTransaction`**: Müşteri rehberi ve veresiye borç/tahsilat hareketleri (`amount`, `hasEquivalent`, `assetType`, `unitPrice`).
7. **`Transaction`**: Perakende POS alış/satış fişleri (`type: buy/sell`, `productCode`, `quantity`, `price`, `total`, `employeeName`).
8. **`AuditLog`**: Sistem içi kritik aksiyonların bayi bazlı denetim kaydı.

---

## 5. R1 - R6 Modülleri İçin Durum Tespiti & Entegrasyon Planı

### R1. Has / Altın Cinsinden Cari Hesap & Veresiye Takibi
- **Mevcut Durum**:
  - `Customer` ve `CustomerTransaction` modelleri veresiye borçlandırma ve tahsilat hareketlerini tutmaktadır.
  - `CustomersClient.tsx` üzerinde TL, USD, EUR ve Gram Has cinsinden bakiyeler canlı altın kuruna (`GAUTRY`) göre otomatik değerlenmektedir.
  - Ekstre modalı ve yazdırma özelliği mevcuttur.
- **Gereken Geliştirme & Entegrasyon Noktaları**:
  - Ziynet adedi cinsinden bağımsız bakiyelerin (örn: 3 Adet Çeyrek Altın, 2 Adet Ata) net adet olarak da cariye yazılması ve ekstrede adet kırılımıyla gösterilmesi.
  - Müşteri ve toptancı detay ekstrelerinde canlı kurla TL/Has eşdeğeri toplamlarının netleştirilmesi ve WhatsApp formatında hızlı paylaşım entegrasyonu (R5 ile bağlantılı).
  - Toptancı ve müşteri mutabakat dökümünün profesyonel fiş/ekstre formatına getirilmesi.

### R2. Gün Sonu & Kasa Kapatma (Z-Raporu)
- **Mevcut Durum**:
  - `Transaction` tablosu POS işlemlerini (`buy`/`sell`) kaydetmekte, ancak günlük vardiya/kasa açılış-kapanış modeli (Kasa Devri, Fiili Sayım, Kasa Farkı) mevcut değildir.
- **Gereken Geliştirme & Entegrasyon Noktaları**:
  - **Yeni Model / Tablo**: `ZReport` veya `CashShift` (Bayi ID, açılış bakiyesi TL/USD/EUR/Has, gün içi nakit/kart/hurda giriş-çıkışları, fiili sayım, kasa farkı, kapanış tarihi, kapatan personel).
  - **Yeni Sayfa & Arayüz**: `(panel)/z-report` veya `(panel)/kasa` sayfası — Günlük kasa mutabakatı, anlık fiili sayım girişi, devir hesaplama, Z-Raporu önizleme ve termal fiş yazdırma.
  - **API Uç Noktası**: `/api/z-report` (veya `/api/cash-register`) — Günün tüm satış, alış, müşteri tahsilatı, toptancı ödemesi hareketlerini ödeme yöntemine göre konsolide eden servis.
  - **Menü & Rota Entegrasyonu**: `ROUTES.Z_REPORT` ve `MENU_ITEMS` güncellemeleri.

### R3. Termal Kuyumcu Barkod & Kelebek Etiket Yazıcı Desteği
- **Mevcut Durum**:
  - `stocks/page.tsx` içinde temel bir `handlePrintLabel` fonksiyonu harici CDN (`JsBarcode`) kullanarak popup açmakta; ancak bu kuyumcu ipli/kelebek etiket standartlarına ve çevrimdışı çalışma gereksinimine tam uygun değildir.
- **Gereken Geliştirme & Entegrasyon Noktaları**:
  - **Etiket Şablon Motoru**:
    1. **Kelebek (Butterfly) Etiket**: Sol kanat (Ayar, Gram, Fiyat/Milyem, Ürün Adı), Orta boğum (katlama/ip alanı), Sağ kanat (Barkod, Barkod No, Firma Adı).
    2. **İpli / Standart Etiket**: 50x12mm, 40x10mm kuyumcu standartları.
  - **ZPL (Zebra Programming Language) Desteği**: Termal yazıcılara doğrudan ham ZPL kodu gönderme / indirme seçeneği.
  - **Yerel Barkod Üretici**: Harici CDN bağımlılığı olmadan SVG/HTML5 Canvas üzerinde yerel Code128 / QR üretimi.
  - **Toplu Etiket Yazdırma (Batch Print)**: Stok listesinden birden çok ürün seçip tek seferde şablonlu etiket döken modal arayüzü.

### R4. Müşteri Bilgilendirme & TV Vitrin Ekranı (Digital Signage)
- **Mevcut Durum**:
  - `/prices` sayfası canlı soket fiyatlarını göstermekte fakat yönetici menüleri, sidebar ve ayar butonları ile doludur.
- **Gereken Geliştirme & Entegrasyon Noktaları**:
  - **Yeni Bağımsız Rota**: `app/showcase/page.tsx` veya `app/tv/page.tsx` — Yan menüsüz, tam ekran (`requestFullscreen`), koyu altın lüks kuyumcu temalı Digital Signage ekranı.
  - **Bileşenler**:
    1. **Canlı Fiyat Panosu**: Has Altın, 22K Bilezik, 14K, Çeyrek, Yarım, Tam, Ata, Dolar, Euro (yeşil/kırmızı canlı tick animasyonları).
    2. **Duyuru & Kampanya Vitrini**: Otomatik dönen görsel/metin kampanya slaytları (Örn: "Düğün Paketlerinde Özel İndirim").
    3. **Alt Kayan Bant (Ticker)**: Özelleştirilebilir kayan duyuru ve döviz/altın özet bandı.
  - **Middleware Desteği**: TV ekranının oturum kesintisine uğramadan veya kiosk modunda kesintisiz çalışabilmesi.

### R5. Mobil, PWA & Çevrimdışı / Kamera Barkod & İletişim
- **Mevcut Durum**:
  - `CameraScannerModal.tsx` (`html5-qrcode`) halihazırda mevcuttur ve `/transactions`, `/price-check` sayfalarında kullanılmaktadır.
- **Gereken Geliştirme & Entegrasyon Noktaları**:
  - **PWA Altyapısı**: `manifest.json` / `manifest.webmanifest`, servis çalışanı (service worker) / çevrimdışı önbellekleme desteği, mobil cihaz meta etiketleri (`viewport-fit=cover`, `apple-mobile-web-app-capable`).
  - **WhatsApp Fiş & Ekstre İletişimi**:
    - Satış işlemi tamamlandığında veya müşteri ekstresinde "WhatsApp ile Paylaş" butonu.
    - Formatlanmış mesaj şablonu (Mağaza Adı, İşlem Özeti, Kalan Bakiye, Tarih, İletişim) oluşturarak doğrudan `https://wa.me/{phone}?text={encodedMsg}` bağlantısı açma.
  - **Mobil & Tablet Dokunmatik Optimizasyonları**: Numpad ve sepetin mobil ekranlarda tam uyumu.

### R6. Stok Devir Hızı & Kritik Stok Uyarıları
- **Mevcut Durum**:
  - `Stock` ve `ProductItem` stok miktarlarını saklamakta; ancak kritik eşik uyarısı ve devir analitiği bulunmamaktadır.
- **Gereken Geliştirme & Entegrasyon Noktaları**:
  - **Kritik Stok Eşiği**: Ürün veya kategori bazında minimum stok tanımlama (Örn: Çeyrek < 5 adet, 22 Ayar < 50 gr).
  - **Otomatik Görsel Uyarılar**: Stok tablosunda ve Dashboard'da sarı/kırmızı kritik stok rozetleri ve bildirim kartı.
  - **Devir Hızı Analitiği (Stock Turnover)**: Son 7/30/90 günlük satış verilerini inceleyerek en hızlı tükenen ve rafta uzun süre bekleyen (ölü stok) ürün gruplarını hesaplayan raporlama paneli.
  - **Otomatik Sipariş Taslağı**: Kritik seviyenin altına düşen ürünleri otomatik toplayıp toptancıya verilecek sipariş/alım taslağına dönüştüren mekanizma.

---

## 6. Güvenlik, Performans ve Mimari Standartlar

1. **Magic String / Number Kontrolü (Kullanıcı Kuralı)**:
   - Tüm yeni rotalar `ROUTES`, mesajlar `MESSAGES`, roller `USER_ROLES`, temalar `THEME`, ürün tipleri `constants/` altında toplanmalı, sihirli dizgilerden kaçınılmalıdır.
2. **Çoklu Bayi İzolasyonu (Multi-Tenant Isolation)**:
   - Tüm API sorgularında `dealerId` filtresi zorunlu tutulmalı; `SUPER_ADMIN` hariç hiçbir kullanıcı diğer bayinin verisine erişememelidir.
3. **Audit Logging (Denetim Kaydı)**:
   - Kasa kapatma, stok eşiği güncelleme, etiket basımı ve WhatsApp ekstre gönderimleri `logActivity` ile kayıt altına alınmalıdır.
4. **Offline & Kiosk Dayanıklılığı**:
   - TV Vitrin ve Kiosk ekranlarında soket kopmalarında otomatik yeniden bağlanma (`auto-reconnect`) ve hata durumunda son bilinen fiyatı önbellekten gösterme mimarisi uygulanmalıdır.
