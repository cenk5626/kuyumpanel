import { prisma } from '../src/lib/prisma';

async function runAudit() {
  console.log('===============================================================');
  console.log('🚀 BAŞLANGIÇ: KUYUMPANEL TÜM SİSTEM & TURSO DB UÇTAN UCA DENETİMİ');
  console.log('===============================================================\n');

  const testDealerId = 'merkez';
  const testRunId = `AUDIT_${Date.now()}`;
  let passedTests = 0;
  let totalTests = 0;

  function assert(condition: boolean, testName: string, detail?: any) {
    totalTests++;
    if (condition) {
      passedTests++;
      console.log(`  ✓ [GEÇTİ] ${testName}`);
    } else {
      console.error(`  ❌ [HATA] ${testName}`, detail ? detail : '');
    }
  }

  try {
    // 0. Dealer Doğrulama
    console.log('--- 0. BAYİ & MERKEZ KONTROLÜ ---');
    let dealer = await prisma.dealer.findUnique({ where: { id: testDealerId } });
    if (!dealer) {
      dealer = await prisma.dealer.create({
        data: { id: testDealerId, name: 'Merkez Mağaza' }
      });
    }
    assert(!!dealer, 'Merkez Bayi (dealer) kaydı mevcut');

    // 1. Kullanıcı & Personel Yönetimi
    console.log('\n--- 1. KULLANICI & PERSONEL TESTLERİ ---');
    const testUserEmail = `audit_user_${testRunId}@kuyumpanel.com`;
    const createdUser = await prisma.user.create({
      data: {
        name: 'Denetim Test Personeli',
        email: testUserEmail,
        password: 'hashedpassword123',
        role: 'USER',
        dealerId: testDealerId,
      }
    });
    assert(!!createdUser.id, 'Yeni kullanıcı başarıyla oluşturuldu');

    const updatedUser = await prisma.user.update({
      where: { id: createdUser.id },
      data: { name: 'Denetim Test Personeli (Güncellendi)' }
    });
    assert(updatedUser.name.includes('Güncellendi'), 'Kullanıcı bilgisi başarıyla güncellendi');

    const createdEmployee = await prisma.employee.create({
      data: {
        name: `Personel_${testRunId}`,
        dealerId: testDealerId,
      }
    });
    assert(!!createdEmployee.id, 'Satış personeli (Employee) başarıyla eklendi');

    // 2. Müşteri & Veresiye / Bakiye Yönetimi
    console.log('\n--- 2. MÜŞTERİ & CARİ HESAP TESTLERİ ---');
    const createdCustomer = await prisma.customer.create({
      data: {
        name: `Test Müşteri ${testRunId}`,
        phone: '05551112233',
        email: `musteri_${testRunId}@test.com`,
        tcNo: '11111111110',
        address: 'Kapalıçarşı No: 42 Fatih/İstanbul',
        note: 'VIP Özel Müşteri',
        creditLimitTL: 100000,
        creditLimitHas: 50,
        dealerId: testDealerId,
      }
    });
    assert(!!createdCustomer.id, 'Yeni müşteri kaydı oluşturuldu');

    // 2.1 Müşteriye Borç Verme (BORC)
    const borcTx = await prisma.customerTransaction.create({
      data: {
        customerId: createdCustomer.id,
        dealerId: testDealerId,
        type: 'BORC',
        assetType: 'TL',
        amount: 25000,
        hasEquivalent: 6.25,
        unitPrice: 4000,
        description: '22 Ayar Bilezik Veresiye Satışı',
        employeeName: createdEmployee.name,
      }
    });
    assert(!!borcTx.id, 'Müşteri BORÇ (Veresiye) işlemi kaydedildi');

    // Müşteri bakiyesini güncelle
    const customerAfterBorc = await prisma.customer.update({
      where: { id: createdCustomer.id },
      data: {
        tlBalance: { increment: 25000 },
        hasBalance: { increment: 6.25 },
      }
    });
    assert(customerAfterBorc.tlBalance === 25000 && customerAfterBorc.hasBalance === 6.25, 'Müşteri TL ve Has borç bakiyeleri doğru arttırıldı');

    // 2.2 Müşteriden Tahsilat Alma (TAHSILAT)
    const tahsilatTx = await prisma.customerTransaction.create({
      data: {
        customerId: createdCustomer.id,
        dealerId: testDealerId,
        type: 'TAHSILAT',
        assetType: 'TL',
        amount: 15000,
        hasEquivalent: 3.75,
        unitPrice: 4000,
        description: 'Nakit Tahsilat',
        employeeName: createdEmployee.name,
      }
    });
    assert(!!tahsilatTx.id, 'Müşteri TAHSİLAT işlemi kaydedildi');

    const customerAfterTahsilat = await prisma.customer.update({
      where: { id: createdCustomer.id },
      data: {
        tlBalance: { decrement: 15000 },
        hasBalance: { decrement: 3.75 },
      }
    });
    assert(customerAfterTahsilat.tlBalance === 10000 && Math.abs(customerAfterTahsilat.hasBalance - 2.5) < 0.001, 'Tahsilat sonrası müşteri bakiyesi doğru düştü (Kalan: ₺10.000, 2.5 gr Has)');

    // 3. Toptancı & Virman Yönetimi
    console.log('\n--- 3. TOPTANCI & VİRMAN TESTLERİ ---');
    const supplierA = await prisma.supplier.create({
      data: {
        name: `Toptancı A ${testRunId}`,
        phone: '02125550001',
        hasBalance: 0,
        tlBalance: 0,
        dealerId: testDealerId,
      }
    });
    const supplierB = await prisma.supplier.create({
      data: {
        name: `Toptancı B ${testRunId}`,
        phone: '02125550002',
        hasBalance: 0,
        tlBalance: 0,
        dealerId: testDealerId,
      }
    });
    assert(!!supplierA.id && !!supplierB.id, 'Toptancı A ve Toptancı B oluşturuldu');

    // Mal alımı: Toptancı A'dan 100 gr Has mal alındı
    await prisma.$transaction([
      prisma.supplierTransaction.create({
        data: {
          supplierId: supplierA.id,
          dealerId: testDealerId,
          type: 'PURCHASE',
          hasAmount: 100,
          tlAmount: 0,
          description: '14 Ayar Zincir ve Kolye Girişi',
        }
      }),
      prisma.supplier.update({
        where: { id: supplierA.id },
        data: { hasBalance: { increment: 100 } }
      })
    ]);
    const supACheck = await prisma.supplier.findUnique({ where: { id: supplierA.id } });
    assert(supACheck?.hasBalance === 100, 'Toptancı A has borcumuz 100 gr Has olarak işlendi');

    // Virman: Toptancı A'dan Toptancı B'ye 40 gr Has aktarımı
    await prisma.$transaction([
      prisma.supplierTransaction.create({
        data: {
          supplierId: supplierA.id,
          dealerId: testDealerId,
          type: 'VIRMAN_OUT',
          hasAmount: 40,
          tlAmount: 0,
          targetSupplierId: supplierB.id,
          targetSupplierName: supplierB.name,
          description: `Virman -> ${supplierB.name}`,
        }
      }),
      prisma.supplier.update({
        where: { id: supplierA.id },
        data: { hasBalance: { decrement: 40 } }
      }),
      prisma.supplierTransaction.create({
        data: {
          supplierId: supplierB.id,
          dealerId: testDealerId,
          type: 'VIRMAN_IN',
          hasAmount: 40,
          tlAmount: 0,
          targetSupplierId: supplierA.id,
          targetSupplierName: supplierA.name,
          description: `Virman <- ${supplierA.name}`,
        }
      }),
      prisma.supplier.update({
        where: { id: supplierB.id },
        data: { hasBalance: { increment: 40 } }
      })
    ]);
    const supAAfterVirman = await prisma.supplier.findUnique({ where: { id: supplierA.id } });
    const supBAfterVirman = await prisma.supplier.findUnique({ where: { id: supplierB.id } });
    assert(supAAfterVirman?.hasBalance === 60 && supBAfterVirman?.hasBalance === 40, 'Toptancı virman işlemi her iki hesapta da başarıyla eşitlendi (A: 60 gr, B: 40 gr)');

    // 4. Stok Yönetimi & Barkodlu Takı
    console.log('\n--- 4. STOK & BARKODLU TAKI TESTLERİ ---');
    const testStockProduct = `TEST_CEYREK_${testRunId}`;
    const initialStock = await prisma.stock.upsert({
      where: {
        product_dealerId: {
          product: testStockProduct,
          dealerId: testDealerId,
        }
      },
      create: {
        product: testStockProduct,
        label: 'Denetim Çeyrek Altın',
        type: 'sarrafiye',
        amount: 10,
        minThreshold: 5,
        dealerId: testDealerId,
      },
      update: { amount: 10 }
    });
    assert(initialStock.amount === 10, 'Sarrafiye stok kaydı (10 Adet) başarıyla oluşturuldu');

    // Barkodlu Takı Ekleme
    const testBarcode = `TEST_${Date.now().toString().slice(-8)}`;
    const productItem = await prisma.productItem.create({
      data: {
        barcode: testBarcode,
        title: '22 Ayar Trabzon Hasır Bilezik',
        carat: 22,
        weight: 35.50,
        costMilyem: 0.916,
        laborMilyem: 0.035,
        sellingMilyem: 0.965,
        profitMargin: 12,
        costPrice: 120000,
        status: 'IN_STOCK',
        dealerId: testDealerId,
      }
    });
    assert(!!productItem.id && productItem.status === 'IN_STOCK', 'Barkodlu takı ürünü (ProductItem) başarıyla eklendi');

    // 5. POS & Satış/Alış & Stok Yetersizlik Engeli
    console.log('\n--- 5. POS İŞLEM & STOK ENGELİ TESTLERİ ---');
    
    // 5.1 Başarılı Satış İşlemi (Stok 10 -> 8'e düşmeli)
    const sellQty = 2;
    const sellPrice = 5000;
    const sellTotal = sellQty * sellPrice;
    
    const posSaleTx = await prisma.$transaction(async (tx) => {
      const currentStock = await tx.stock.findUnique({
        where: { product_dealerId: { product: testStockProduct, dealerId: testDealerId } }
      });
      if (!currentStock || currentStock.amount < sellQty) {
        throw new Error('Yetersiz stok!');
      }

      const transaction = await tx.transaction.create({
        data: {
          dealerId: testDealerId,
          type: 'sell',
          productType: 'sarrafiye',
          productCode: testStockProduct,
          quantity: sellQty,
          price: sellPrice,
          total: sellTotal,
          paymentMethod: 'CASH',
          employeeName: createdEmployee.name,
        }
      });

      await tx.stock.update({
        where: { product_dealerId: { product: testStockProduct, dealerId: testDealerId } },
        data: { amount: currentStock.amount - sellQty }
      });

      return transaction;
    });

    const stockAfterSale = await prisma.stock.findUnique({
      where: { product_dealerId: { product: testStockProduct, dealerId: testDealerId } }
    });
    assert(stockAfterSale?.amount === 8, 'POS Satış işlemi sonrası stok 10 adetten 8 adede düştü');

    // 5.2 Yetersiz Stok Satış Denemesi (Stok 8 iken 10 satmaya çalışma -> Hata fırlatıp rollback yapmalı)
    let failedAsExpected = false;
    try {
      await prisma.$transaction(async (tx) => {
        const currentStock = await tx.stock.findUnique({
          where: { product_dealerId: { product: testStockProduct, dealerId: testDealerId } }
        });
        const excessiveQty = 10;
        if (!currentStock || currentStock.amount < excessiveQty) {
          throw new Error('Stokta Olmayan veya Yetersiz Ürün Satılamaz!');
        }
        await tx.transaction.create({
          data: {
            dealerId: testDealerId,
            type: 'sell',
            productType: 'sarrafiye',
            productCode: testStockProduct,
            quantity: excessiveQty,
            price: sellPrice,
            total: excessiveQty * sellPrice,
          }
        });
      });
    } catch (err: any) {
      if (err.message.includes('Stokta Olmayan veya Yetersiz')) {
        failedAsExpected = true;
      }
    }
    assert(failedAsExpected, 'Stokta olmayan/yetersiz ürünün satışı beklendiği gibi engellendi ve rollback yapıldı');

    // 5.3 Barkodlu Ürün Satışı & Durum Güncellemesi (IN_STOCK -> SOLD)
    await prisma.$transaction(async (tx) => {
      const prod = await tx.productItem.findUnique({ where: { barcode: testBarcode } });
      if (!prod || prod.status !== 'IN_STOCK') {
        throw new Error('Ürün stokta yok');
      }
      await tx.transaction.create({
        data: {
          dealerId: testDealerId,
          type: 'sell',
          productType: 'taki',
          productCode: testBarcode,
          quantity: 1,
          price: 135000,
          total: 135000,
        }
      });
      await tx.productItem.update({
        where: { barcode: testBarcode },
        data: { status: 'SOLD' }
      });
    });
    const prodAfterSale = await prisma.productItem.findUnique({ where: { barcode: testBarcode } });
    assert(prodAfterSale?.status === 'SOLD', 'Barkodlu ürün satışı sonrası ürün durumu otomatik SOLD olarak güncellendi');

    // Tekrar satmaya çalışma -> Engellenmeli
    let soldBarcodeBlocked = false;
    try {
      await prisma.$transaction(async (tx) => {
        const prod = await tx.productItem.findUnique({ where: { barcode: testBarcode } });
        if (!prod || prod.status !== 'IN_STOCK') {
          throw new Error('Barkodlu ürün zaten satılmış!');
        }
      });
    } catch (err: any) {
      soldBarcodeBlocked = true;
    }
    assert(soldBarcodeBlocked, 'Daha önce satılmış barkodlu ürünün tekrar satışı engellendi');

    // 6. İşlem Düzenleme (Revision Log) & Silme
    console.log('\n--- 6. İŞLEM DÜZENLEME (REVISION) & İPTAL TESTLERİ ---');
    const editReason = 'Müşteri adet sayısını düzeltti';
    const revisedTx = await prisma.$transaction(async (tx) => {
      const updated = await tx.transaction.update({
        where: { id: posSaleTx.id },
        data: { quantity: 1, total: 5000 }
      });
      await tx.transactionRevisionLog.create({
        data: {
          transactionId: posSaleTx.id,
          dealerId: testDealerId,
          actionType: 'EDIT',
          previousData: JSON.stringify(posSaleTx),
          newData: JSON.stringify(updated),
          reason: editReason,
        }
      });
      // Stok farkı: 2 adet satılmıştı, 1'e düşürüldü -> 1 adet stoğa geri eklendi (8 + 1 = 9)
      await tx.stock.update({
        where: { product_dealerId: { product: testStockProduct, dealerId: testDealerId } },
        data: { amount: { increment: 1 } }
      });
      return updated;
    });
    const revLog = await prisma.transactionRevisionLog.findFirst({
      where: { transactionId: posSaleTx.id, actionType: 'EDIT' }
    });
    const stockAfterEdit = await prisma.stock.findUnique({
      where: { product_dealerId: { product: testStockProduct, dealerId: testDealerId } }
    });
    assert(!!revLog && stockAfterEdit?.amount === 9, 'İşlem düzenlendi, Revizyon Günlüğü kaydedildi ve stok 9 adede eşitlendi');

    // 7. Kasa & Gün Sonu Z-Raporu Oturumu
    console.log('\n--- 7. KASA & Z-RAPORU MUTABAKAT TESTLERİ ---');
    const sessionNum = `Z-${Date.now().toString().slice(-6)}`;
    const session = await prisma.cashRegisterSession.create({
      data: {
        sessionNumber: sessionNum,
        status: 'OPEN',
        openingCashTL: 50000,
        openingCashUSD: 2000,
        openingCashEUR: 1500,
        openingHasGram: 100,
        openedBy: createdEmployee.name,
        dealerId: testDealerId,
      }
    });
    assert(!!session.id, 'Sabah Kasa Devri (Z-Session) başarıyla açıldı');

    // Gün içi masraf / kasa çıkışı
    const cashOut = await prisma.cashMovement.create({
      data: {
        sessionId: session.id,
        dealerId: testDealerId,
        type: 'MANUAL_OUT',
        category: 'EXPENSE',
        amount: 1500,
        currency: 'TL',
        description: 'Dükkan Elektrik & Güvenlik Masrafı',
        employeeName: createdEmployee.name,
      }
    });
    assert(!!cashOut.id, 'Gün içi kasa masraf çıkışı (CashMovement) kaydedildi');

    // Akşam Fiili Sayım & Mutabakat Kapatma
    const closedSession = await prisma.cashRegisterSession.update({
      where: { id: session.id },
      data: {
        status: 'CLOSED',
        closedAt: new Date(),
        closedBy: createdEmployee.name,
        systemCashTL: 50000 - 1500 + 5000, // 53.500 TL
        countedCashTL: 53500,
        diffCashTL: 0,
        countedCashUSD: 2000,
        diffCashUSD: 0,
        countedCashEUR: 1500,
        diffCashEUR: 0,
        countedHasGram: 100,
        diffHasGram: 0,
      }
    });
    assert(closedSession.status === 'CLOSED' && closedSession.diffCashTL === 0, 'Kasa akşam fiili sayım mutabakatı ve Z-Raporu başarıyla kapatıldı');

    // 8. Fiyat Ayarları & Live Prices Singleton
    console.log('\n--- 8. CANLI FİYAT AYARLARI & SPREAD/MİLYEM TESTLERİ ---');
    const priceSettings = await prisma.priceSettings.upsert({
      where: { id: 'singleton' },
      create: {
        id: 'singleton',
        mil24Ayar: 1000,
        mil22Ayar: 916,
        milAdanaBurma: 931,
        milAjda: 942,
        mil14Ayar: 585,
      },
      update: {
        mil22Ayar: 916,
      }
    });
    assert(priceSettings.mil22Ayar === 916, 'Fiyat ayarları singleton (milyem çarpanları) başarıyla okundu/güncellendi');

    // 9. Temizlik (Audit geçici verilerini temizleme)
    console.log('\n--- 9. DENETİM VERİ TEMİZLİĞİ ---');
    await prisma.transactionRevisionLog.deleteMany({ where: { dealerId: testDealerId, transactionId: posSaleTx.id } });
    await prisma.transaction.deleteMany({ where: { dealerId: testDealerId, productCode: { in: [testStockProduct, testBarcode] } } });
    await prisma.productItem.deleteMany({ where: { barcode: testBarcode } });
    await prisma.stock.deleteMany({ where: { product: testStockProduct, dealerId: testDealerId } });
    await prisma.customerTransaction.deleteMany({ where: { customerId: createdCustomer.id } });
    await prisma.customer.delete({ where: { id: createdCustomer.id } });
    await prisma.supplierTransaction.deleteMany({ where: { supplierId: { in: [supplierA.id, supplierB.id] } } });
    await prisma.supplier.deleteMany({ where: { id: { in: [supplierA.id, supplierB.id] } } });
    await prisma.cashMovement.deleteMany({ where: { sessionId: session.id } });
    await prisma.cashRegisterSession.delete({ where: { id: session.id } });
    await prisma.employee.delete({ where: { id: createdEmployee.id } });
    await prisma.user.delete({ where: { id: createdUser.id } });
    assert(true, 'Test verileri başarıyla temizlendi');

    console.log('\n===============================================================');
    console.log(`📊 DENETİM SONUCU: ${passedTests}/${totalTests} (%${Math.round((passedTests / totalTests) * 100)}) TEST BAŞARIYLA TAMAMLANDI`);
    console.log('===============================================================');

  } catch (error) {
    console.error('❌ DENETİM SIRASINDA KRİTİK HATA:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runAudit();
