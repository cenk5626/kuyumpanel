# Original User Request

## Initial Request — 2026-08-17T21:51:06+03:00

Enterprise kuyumculuk yönetim paneline (kuyumpanel) Has cinsinden cari/veresiye, Kasa Z-Raporu, termal etiket yazdırma, TV vitrin modu, PWA/mobil kamera barkod ve stok devir analitiği modüllerinin entegrasyonu.

Working directory: c:\xampp\htdocs\kuyumpanel
Integrity mode: development

## Requirements

### R1. Has / Altın Cinsinden Cari Hesap & Veresiye Takibi
Müşteri ve toptancı hesaplarında borç/alacak bakiyelerinin TL'nin yanında fiziki Gram Has Altın ve Ziynet Adedi cinsinden kaydedilmesi, anlık altın kuruyla değerlenmesi ve detaylı ekstre dökümü.

### R2. Gün Sonu & Kasa Kapatma (Z-Raporu)
Günlük Nakit (TL/USD/EUR), POS/Kredi Kartı, Hurda Alış ve Has Altın giriş-çıkış hareketlerini konsolide eden, devir kasası ve fiili sayım mutabakatı sağlayan Z-Raporu modülü ve raporlama ekranı.

### R3. Termal Kuyumcu Barkod & Kelebek Etiket Yazıcı Desteği
Stoktaki ürünler için kuyumcu standartlarında (ipli/kelebek etiket) doğrudan tarayıcıdan termal barkod etiket çıktısı (baskı şablonu, ZPL / HTML-Canvas) oluşturma ve yazdırma desteği.

### R4. Müşteri Bilgilendirme & TV Vitrin Ekranı (Digital Signage)
Mağaza içi veya vitrin TV'leri için canlı altın/döviz kurlarını, özel duyuruları/kampanyaları ve alt kayan bandı (ticker) gösteren tam ekran duyarlı vitrin modu (/showcase veya TV modu).

### R5. Mobil, PWA & Çevrimdışı / Kamera Barkod & İletişim
Uygulamanın PWA olarak mobil/tablete yüklenebilmesi, cihaz kamerasıyla doğrudan barkod okutma ve müşteriye işlem fişi / ekstresini WhatsApp formatında tek tıkla iletebilme altyapısı.

### R6. Stok Devir Hızı & Kritik Stok Uyarıları
Hangi ürün gruplarının hızlı/yavaş devrettiğini gösteren sirkülasyon analizi ve kritik seviyenin altına düşen sarrafiye/bilezik stokları için otomatik görsel uyarılar ve sipariş taslağı.

## Acceptance Criteria

### Has Cari & Borçlanma
- [ ] Müşteri ve toptancı bakiyelerinde Gram Has ve TL alanları bağımsız ve tutarlı şekilde güncellenir.
- [ ] İşlem geçmişinde borcun hangi kur veya Has gramajı ile açıldığı kayıt altında tutulur.

### Kasa Kapatma & Z-Raporu
- [ ] Günün tüm satış, alış, ödeme ve tahsilatları ödeme tipine (Nakit, Kart, Has, Hurda) göre ayrıştırılır.
- [ ] Kasa açılış, gün içi hareketler ve kasa kapanış devri hesaplanıp Z-Raporu çıktısı alınabilir.

### Etiket Baskı & TV Vitrin
- [ ] Seçilen ürünlerin barkod, ayar, gram ve fiyat bilgileri kelebek etiket formatına uygun önizlenir ve yazdırılır.
- [ ] Vitrin TV ekranı canlı soket fiyatlarıyla senkronize tam ekran çalışır.

### Mobil & PWA & Kamera
- [ ] Kamera izniyle çalışan kamera barkod okuyucu barkodu yakalayıp işlem ekranına aktarır.
- [ ] Satış ve müşteri detaylarından tek tıkla WhatsApp formatlı mesaj oluşturulur.

### Analitik & Uyarılar
- [ ] Kritik stok eşiği belirlenen ürünler stok tablosunda ve gösterge panelinde vurgulanır.
- [ ] Satış hızına göre devir raporu listelenir.
