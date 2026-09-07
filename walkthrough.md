# KuyumPanel — 4 Yeni Modül, Donanım Terazi Entegrasyonu ve Cetasoft Karşılaştırması

## Genel Bakış

Bu sürümde, geleneksel masaüstü kuyumcu yazılımlarının (özellikle **Cetasoft**) hantal ve eski Delphi/WinForms mimarisinin ötesine geçen, modern web teknolojileri ve Web Serial API donanım entegrasyonuyla donatılmış **4 ana kuyumculuk operasyon modülü** sisteme kazandırılmıştır.

Tüm geliştirmeler, projenin temel prensiplerine tam uyumlu olarak gerçekleştirilmiştir:
- **Sıfır Sihirli Sayı / String (Zero Magic Numbers/Strings):** Tüm iş kuralları, oranlar, süreler ve metinler `src/constants/` altında toplanmıştır.
- **Vercel & Next.js Server Components Dayanıklılığı:** `export const dynamic = 'force-dynamic'`, hata toleranslı `try-catch` blokları, güvenli Date serileştirmeleri.
- **İkili Tema Desteği:** Alabaster Light & Obsidian Gold Dark (Tailwind CSS v4 & dark: uyumu).

---

## 1. Modül 1: Kuyumcu Özel Matrahlı Fatura & E-Arşiv (KDV Kanunu 23/e)

- **Rota:** `/invoices`
- **İş Mantığı:** `src/lib/invoice/special-matrix.ts`
- **Sabitler:** `src/constants/invoice.ts`
- **API:** `src/app/api/invoices/route.ts`
- **Özellikler:**
  - **Yasal Meşruat:** 3065 sayılı KDV Kanunu Madde 23/e gereği külçe altın bedeli KDV matrahına dahil edilmez; yalnızca işçilik / kâr bedeli üzerinden %20 KDV tahakkuk ettirilir.
  - **Canlı Hesaplama:** Her takı kalemi için `Has Altın Miktarı (gr)`, `Külçe İstisna Bedeli (TL)`, `İşçilik Matrahı (TL)`, `KDV Tutarı (%20)` ve `Genel Toplam` anlık hesaplanır.
  - **Matbu A4 e-Arşiv / Fatura Şablonu:** Resmi GİB e-Arşiv ve e-Fatura formatında, kanuni 23/e meşruat ibaresi (`INVOICE_DEFAULTS.NOTE_23E`), alıcı/mükellef bilgileri, kalem dökümü ve kaşe/imza alanlarıyla tam yazdırma (`window.print`) desteği.

---

## 2. Modül 2: Taksitli Satış, Senet & Vade Hatırlatıcı

- **Rota:** `/installments`
- **Sabitler:** `src/constants/installment.ts`
- **API:** `src/app/api/installments/route.ts` & `src/app/api/installments/[id]/pay/route.ts`
- **Özellikler:**
  - **Taksit Planlama:** Peşinat düşümü sonrası kalan tutarı 2 ila 24 aya kadar eşit taksitlendirir; son taksitte 1 kuruşluk yuvarlama farkını otomatik denkleştirir.
  - **Matbu Senet (Bono) Şablonu:** Türk Ticaret Kanunu (TTK) Madde 776 uyumlu resmi bono metni ("İşbu emrühavaleme tanzim olunan bonodur...", muacceliyet şartı, tanzim yeri/tarihi, borçlu bilgileri ve imza alanı).
  - **Tek Tıkla WhatsApp Vade Hatırlatıcı:** Müşterinin GSM numarasına formatlanmış mesaj metniyle doğrudan WhatsApp Web/App üzerinden hatırlatma gönderir.
  - **Taksit Tahsilatı:** Kısmi veya tam tahsilatları kasaya nakit/kart/banka girişi olarak kaydeder ve müşteri cari bakiyesinden anında düşer.

---

## 3. Modül 3: Hurda Sandığı, Takoz & Atölye Ramat Takibi

- **Rota:** `/workshop`
- **İş Mantığı:** `src/lib/workshop/takoz-calculator.ts`
- **Sabitler:** `src/constants/workshop.ts`
- **API:** `src/app/api/workshop/route.ts`
- **Özellikler:**
  - **Hurda Sandığı:** 8K, 14K, 18K, 22K ve 24K hurda altınların sandık gramajları ve standart milyem çarpanları ile anlık Has Altın karşılıkları.
  - **Pota Eritme Takoz Milyem Hesaplayıcı:** Farklı ayarlardaki hurdalar potada eritilirken ağırlıklı ortalama milyem formülü: `Ortalama Milyem = Toplam Has (gr) / Toplam Gram`.
  - **Hedef Milyem Reçetesi:** İstenen ayara (örneğin 14K / 0.585 veya 22K / 0.916) ulaşmak için potaya kaç gram 24K Has Altın veya kaç gram Bakır/Gümüş alaşım eklenmesi gerektiğini tam gramajla hesaplar.
  - **Atölye İş Emirleri & Ramat Takibi:** Atölyeye verilen hurda/has altın, teslim alınan mamul takı ve astar/fire dönüşü hesabı. %3.5 üstü fire uyarıları ve %5.0 üstü şüpheli kritik fire ikaz bayrağı.

---

## 4. Modül 4: Hassas Kuyumcu Terazisi Donanım Entegrasyonu (Web Serial API)

- **Kütüphane:** `src/lib/hardware/scale.ts`
- **Bileşen:** `src/components/ScaleButton.tsx`
- **Entegre Edilen Sayfalar:**
  - `/transactions` (Hızlı POS Satış ve Alış Ekranı)
  - `/stocks` (Yeni Ürün / Stok Kartı Kartela Girişi)
  - `/invoices` (Fatura Kalemi Gramajı Girişi)
  - `/workshop` (Hurda Sandığı, Atölye Teslim Alma ve Pota Takoz Girişleri)
- **Özellikler:**
  - `navigator.serial` üzerinden RS232 / USB seri portuna bağlı terazilerle (Mettler Toledo, CAS, Radwag, Ohaus, DESIS, Sartorius) doğrudan tarayıcıdan iletişim.
  - Regex tabanlı STX/ETX ve CRLF ayrıştırma ile kararlı (ST) / dinamik (US) gramaj okuma.
  - Donanım bağlı olmadığında veya tarayıcı izin vermediğinde kusursuz simülasyon ve manuel giriş desteği.

---

## 5. Cetasoft İnceleme & Karşılaştırmalı Geliştirmeler

| Özellik | Cetasoft Kuyumcu Programı | KuyumPanel (Yeni Mimari) |
| :--- | :--- | :--- |
| **Mimari & Hız** | Eski masaüstü Delphi / Paradox / Access tabanlı, aşırı kasma ve donma sorunları | Next.js 16 + React 19 + LibSQL/SQLite, 60fps akıcı bulut ve tablet uyumu |
| **Donanım Entegrasyonu** | Sadece kurulu Windows bilgisayarda COM port sürücüsü zorunlu | Web Serial API ile tüm Chromium tarayıcılarda sıfır kurulumla USB/RS232 terazi ve kamera barkod desteği |
| **KDV 23/e Fatura** | Sabit matrisli eski nokta vuruşlu formlar | Modern e-Arşiv / e-Fatura A4 önizleme, anlık işçilik matrahı ve KDV ayrımı |
| **Taksit & Senet** | Karışık cari kartları | 1-tıkla WhatsApp hatırlatma, TTK uyumlu matbu bono yazdırma |
| **Emanet Altın Kasası** | Karmaşık modül | Müşterinin mağazaya emanet bıraktığı ziynetlerin takibi ve tek tıkla teslim/iade |
| **Müşteri ParaPuan** | Basit puan alanı | Satışlardan sadakat ParaPuanı kazanımı ve indirim olarak harcanması |

---

## 6. Test ve Doğrulama Kayıtları

- **Test Motoru:** `npx tsx tests/run-all-tests.ts`
- **Yeni Test Dosyaları:**
  - `tests/tier1/f23_special_matrix_invoice.test.ts` (7 test)
  - `tests/tier1/f24_installments_workshop.test.ts` (15 test - yeni sınır & güvenlik senaryoları eklendi)
- **Toplam Test Sonucu:** **254 / 254 Test Başarılı (%100 PASS)**
  - Tier 1: 141/141
  - Tier 2: 100/100
  - Tier 3: 5/5
  - Tier 4: 8/8
- **Next.js Turbopack Üretim Derlemesi (`npm run build`):**
  - Sıfır TypeScript hatası, 35/35 rota başarıyla üretildi (`exit code 0`).

## 7. Bağımsız İnceleme Düzeltmeleri (Reviewer Pass 2 - Critical Fixes)

1. **Çok Kiracılı (Multi-Tenancy) Güvenlik ve Bayi Yalıtımı Açıklarının Giderilmesi:**
   - `POST /api/customers/deposits` (WITHDRAW & LOYALTY_POINT): Başka bayiye ait emanet altınların veya müşteri ParaPuanlarının çekilmesini/değiştirilmesini engelleyen `currentUserDealerId` güvenlik doğrulaması eklendi.
   - `POST /api/workshop` (COMPLETE_JOB): Başka bayinin atölye iş emirlerinin yetkisiz kişilerce kapatılmasını önleyen yetki denetimi eklendi.
   - `POST /api/installments` & `POST /api/invoices`: Seçilen müşterinin oturum açan bayiye ait olduğu doğrulandı.

2. **İş Kuralı ve Durum Bütünlüğü Koruyucuları (State Invariant Guards):**
   - İptal edilmiş (`CANCELLED`) veya borcu sıfırlanmış (`PAID`) taksit planlarına mükerrer veya geçersiz ödeme yapılması engellendi (`400 Bad Request`).
   - Tamamlanmış (`COMPLETED`) atölye iş emirlerinin tekrar kapatılarak fire verilerinin ezilmesi engellendi.
   - Sıfır/negatif atölye gramajı ve negatif iade gramajları doğrulandı; geçersiz hurda ayarları reddedildi.

3. **Veritabanı Atomisitesi & ACID Uyumu (Prisma `$transaction`):**
   - Taksit planı açılışı, taksit tahsilatı ve emanet işlemleri çoklu tablo güncellemelerini (`Plan`, `Customer`, `CustomerTransaction`, `CashMovement`) `prisma.$transaction` bloklarına alınarak yarım kalmış işlem (dirty state) riski sıfırlandı.

4. **Sıfır Sihirli Sayı & String Kuralı:**
   - `WorkshopClient.tsx` içerisindeki kalan inline stringler (`WORKSHOP_ACTIONS`, `CUSTOMER_DEPOSIT_STATUS`) ikame edildi.
   - Donanım terazi sabitleri `src/constants/scale.ts` ve mesajları `src/constants/messages.ts` altına taşınarak merkezi konfigürasyona bağlandı.

5. **Güvenli Tarih Serileştirmesi:**
   - `POST /api/installments` ve `POST /api/installments/[id]/pay` yanıtlarındaki Date objeleri güvenli ISO 8601 serileştirmesinden geçirildi.


