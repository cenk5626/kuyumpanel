import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

function resolveStockProduct(input: string): { id: string; label: string; type: string } {
  const norm = (input || '').toLowerCase().replace(/[\s\-_]/g, '');
  if (norm.includes('ceyrek') || norm.includes('çeyrek')) return { id: 'ECEYREKTL', label: 'Çeyrek Altın', type: 'sarrafiye' };
  if (norm.includes('yarim') || norm.includes('yarım')) return { id: 'EYARIMTL', label: 'Yarım Altın', type: 'sarrafiye' };
  if (norm.includes('tam')) return { id: 'ETAMTL', label: 'Tam Altın', type: 'sarrafiye' };
  if (norm.includes('ata') || norm.includes('cumhuriyet')) return { id: 'EATATL', label: 'Ata Altın', type: 'sarrafiye' };
  if (norm.includes('gremse')) return { id: 'EGREMSETL', label: 'Gremse Altın', type: 'sarrafiye' };
  if (norm.includes('24') || norm.includes('has')) return { id: 'mil24Ayar', label: '24 Ayar Gram', type: 'sarrafiye' };
  if (norm.includes('adanaburma') || norm.includes('burma')) return { id: 'milAdanaBurma', label: 'Adana-Burma Bilezik', type: 'sarrafiye' };
  if (norm.includes('ajda')) return { id: 'milAjda', label: 'Ajda Bilezik', type: 'sarrafiye' };
  if (norm.includes('22') || norm.includes('bilezik')) return { id: 'mil22Ayar', label: '22 Ayar Gram', type: 'sarrafiye' };
  if (norm.includes('14')) return { id: 'mil14Ayar', label: '14 Ayar Gram', type: 'sarrafiye' };
  if (norm.includes('dolar') || norm.includes('usd')) return { id: 'USD', label: 'Amerikan Doları (USD)', type: 'döviz' };
  if (norm.includes('euro') || norm.includes('eur')) return { id: 'EUR', label: 'Euro (EUR)', type: 'döviz' };
  return { id: input || 'ECEYREKTL', label: input || 'Çeyrek Altın', type: 'sarrafiye' };
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const dealerId = (session.user as any)?.dealerId || 'merkez';
    const userName = session.user?.name || 'Patron';
    const userEmail = session.user?.email || undefined;

    const body = await req.json();
    const { actionType, payload } = body;

    if (!actionType || !payload) {
      return NextResponse.json({ error: 'Geçersiz eylem veya eksik parametre.' }, { status: 400 });
    }

    let executionResult: any = null;
    let successMessage = '';

    // 1. FİYAT ALARMI KURULUMU
    if (actionType === 'CREATE_PRICE_ALERT') {
      const alert = await prisma.priceAlert.create({
        data: {
          dealerId,
          productCode: payload.productCode || 'HAS',
          productLabel: payload.productLabel || 'Has Altın',
          targetPrice: Number(payload.targetPrice),
          priceType: payload.priceType || 'bid',
          condition: payload.condition || 'GTE',
          phone: payload.phone || null,
          isActive: true,
          isTriggered: false,
          notes: payload.notes || 'Yapay Zeka Asistanı tarafından kuruldu',
        },
      });

      executionResult = alert;
      successMessage = `👑 ${alert.productLabel} için ₺${alert.targetPrice.toLocaleString('tr-TR')} seviyesine ${alert.condition === 'GTE' ? '≥ (Eşit veya Üstü)' : '≤ (Eşit veya Altı)'} fiyat alarmı başarıyla kuruldu!`;
    }

    // 2. STOK ADEDİ GÜNCELLEME (Sarrafiye / Döviz / Genel Stok Miktarı)
    else if (actionType === 'UPDATE_STOCK_QUANTITY' || actionType === 'UPDATE_STOCK') {
      const targetProductRaw = payload.product || payload.productCode || payload.label || 'ECEYREKTL';
      const resolved = resolveStockProduct(targetProductRaw);

      const currentStock = await prisma.stock.findUnique({
        where: {
          product_dealerId: {
            product: resolved.id,
            dealerId,
          },
        },
      });

      let newAmount = Number(payload.amount);
      if (payload.operation === 'ADD' || payload.delta !== undefined) {
        const delta = Number(payload.delta || payload.amount || 0);
        newAmount = (currentStock?.amount || 0) + delta;
      } else if (payload.operation === 'SUBTRACT') {
        const delta = Number(payload.delta || payload.amount || 0);
        newAmount = Math.max(0, (currentStock?.amount || 0) - delta);
      }

      if (isNaN(newAmount) || newAmount < 0) {
        newAmount = 0;
      }

      const updatedStock = await prisma.stock.upsert({
        where: {
          product_dealerId: {
            product: resolved.id,
            dealerId,
          },
        },
        update: {
          amount: newAmount,
          label: resolved.label,
          type: resolved.type,
          minThreshold: payload.minThreshold !== undefined ? Number(payload.minThreshold) : currentStock?.minThreshold ?? 5,
        },
        create: {
          dealerId,
          product: resolved.id,
          label: resolved.label,
          type: resolved.type,
          amount: newAmount,
          minThreshold: payload.minThreshold !== undefined ? Number(payload.minThreshold) : 5,
        },
      });

      executionResult = updatedStock;
      successMessage = `📦 ${updatedStock.label} stoğu başarıyla güncellendi: Mevcut miktar ${newAmount} adet yapıldı!`;
    }

    // 3. VİTRİNE YENİ BARKODLU TAKI / PIRLANTA ÜRÜNÜ EKLEME
    else if (actionType === 'CREATE_PRODUCT_ITEM' || actionType === 'ADD_PRODUCT_ITEM') {
      const caratNum = parseInt(payload.carat || '22', 10);
      const categoryName = (payload.category || payload.title || 'Bilezik').trim();
      const weightNum = parseFloat(payload.weight || payload.weightGr || '10.0');
      const qtyNum = parseInt(payload.quantity || '1', 10);

      // Kategori kodu belirle
      let catCode = 'BLZ';
      const catNorm = categoryName.toLowerCase();
      if (catNorm.includes('yüzük') || catNorm.includes('yuzuk')) catCode = 'YZK';
      else if (catNorm.includes('küpe') || catNorm.includes('kupe')) catCode = 'KPE';
      else if (catNorm.includes('kolye')) catCode = 'KLY';
      else if (catNorm.includes('bileklik')) catCode = 'BLK';
      else if (catNorm.includes('zincir')) catCode = 'ZNC';
      else if (catNorm.includes('set') || catNorm.includes('takım')) catCode = 'SET';
      else if (catNorm.includes('tektaş') || catNorm.includes('pırlanta')) catCode = 'PRL';

      let finalBarcode = payload.customBarcode || payload.barcode;
      if (!finalBarcode) {
        const prefix = `${caratNum}${catCode}`;
        const lastItem = await prisma.productItem.findFirst({
          where: { barcode: { startsWith: prefix }, dealerId },
          orderBy: { barcode: 'desc' },
        });

        let nextNum = 1;
        if (lastItem) {
          const numPart = lastItem.barcode.substring(prefix.length);
          const parsed = parseInt(numPart, 10);
          if (!isNaN(parsed)) nextNum = parsed + 1;
        }
        finalBarcode = `${prefix}${String(nextNum).padStart(5, '0')}`;
      }

      const isDiamond = Boolean(payload.isDiamond || catNorm.includes('pırlanta') || payload.diamondCarat);

      const newItem = await prisma.productItem.create({
        data: {
          dealerId,
          barcode: finalBarcode,
          title: categoryName,
          category: categoryName,
          carat: caratNum,
          weight: weightNum,
          quantity: qtyNum,
          description: payload.description || 'AI Asistan tarafından vitrine eklendi',
          status: 'IN_STOCK',
          isDiamond,
          diamondCarat: isDiamond ? parseFloat(payload.diamondCarat || '0.30') : null,
          diamondColor: payload.diamondColor || (isDiamond ? 'G' : null),
          diamondClarity: payload.diamondClarity || (isDiamond ? 'VS1' : null),
          diamondCut: payload.diamondCut || (isDiamond ? 'Excellent' : null),
          certificateNo: payload.certificateNo || payload.diamondCertificate || null,
          costMilyem: parseFloat(payload.costMilyem || '0'),
          laborMilyem: parseFloat(payload.laborMilyem || '0'),
          profitMargin: parseFloat(payload.profitMargin || '15'),
        },
      });

      executionResult = newItem;
      successMessage = `💎 Yeni ${newItem.carat} Ayar ${newItem.title} (${newItem.weight.toFixed(2)} gr) vitrin stoğuna başarıyla eklendi! (Barkod: ${newItem.barcode})`;
    }

    // 4. MEVCUT BARKODLU ÜRÜN GÜNCELLEME
    else if (actionType === 'UPDATE_PRODUCT_ITEM') {
      const barcode = (payload.barcode || '').trim();
      const existing = await prisma.productItem.findUnique({
        where: { barcode },
      });

      if (!existing) {
        return NextResponse.json({ error: `"${barcode}" barkodlu ürün veritabanında bulunamadı.` }, { status: 404 });
      }

      const updateData: any = {};
      if (payload.weight !== undefined) updateData.weight = parseFloat(payload.weight);
      if (payload.status) updateData.status = payload.status;
      if (payload.title) updateData.title = payload.title;
      if (payload.description) updateData.description = payload.description;
      if (payload.laborMilyem !== undefined) updateData.laborMilyem = parseFloat(payload.laborMilyem);

      const updated = await prisma.productItem.update({
        where: { barcode },
        data: updateData,
      });

      executionResult = updated;
      successMessage = `✅ ${updated.barcode} barkodlu ürünün bilgileri başarıyla güncellendi!`;
    }

    // 5. MÜŞTERİ VERESİYE / BORÇ EKLEME
    else if (actionType === 'ADD_CUSTOMER_DEBT') {
      const customerName = (payload.customerName || 'Müşteri').trim();
      let customer = await prisma.customer.findFirst({
        where: { dealerId, name: customerName },
      });

      if (!customer) {
        customer = await prisma.customer.create({
          data: {
            dealerId,
            name: customerName,
            phone: payload.phone || null,
          },
        });
      }

      const amount = Number(payload.amount) || 0;
      const assetType = (payload.assetType || 'HAS').toUpperCase();
      const hasEquivalent = Number(payload.hasEquivalent) || (assetType === 'HAS' ? amount : 0);

      const updateData: any = {};
      if (assetType === 'HAS') {
        updateData.hasBalance = { increment: amount };
      } else if (assetType === 'TL') {
        updateData.tlBalance = { increment: amount };
      } else {
        updateData.hasBalance = { increment: hasEquivalent };
      }

      const [updatedCustomer, tx] = await prisma.$transaction([
        prisma.customer.update({
          where: { id: customer.id },
          data: updateData,
        }),
        prisma.customerTransaction.create({
          data: {
            dealerId,
            customerId: customer.id,
            type: 'BORC',
            assetType,
            amount,
            hasEquivalent,
            unitPrice: payload.unitPrice ? Number(payload.unitPrice) : null,
            description: payload.description || 'AI Asistan aracılığıyla veresiye borç kaydedildi',
            employeeName: `AI (${userName})`,
          },
        }),
      ]);

      executionResult = { customer: updatedCustomer, transaction: tx };
      successMessage = `✅ ${customer.name} adlı müşteriye ${amount} ${assetType} veresiye borcu başarıyla kaydedildi!`;
    }

    // 6. MÜŞTERİDEN TAHSİLAT ALMA
    else if (actionType === 'COLLECT_CUSTOMER_PAYMENT') {
      const customerName = (payload.customerName || '').trim();
      const customer = await prisma.customer.findFirst({
        where: { dealerId, name: customerName },
      });

      if (!customer) {
        return NextResponse.json({ error: `"${customerName}" adlı müşteri rehberde bulunamadı.` }, { status: 404 });
      }

      const amount = Number(payload.amount) || 0;
      const assetType = (payload.assetType || 'HAS').toUpperCase();
      const hasEquivalent = Number(payload.hasEquivalent) || (assetType === 'HAS' ? amount : 0);

      const updateData: any = {};
      if (assetType === 'HAS') {
        updateData.hasBalance = { decrement: amount };
      } else if (assetType === 'TL') {
        updateData.tlBalance = { decrement: amount };
      } else {
        updateData.hasBalance = { decrement: hasEquivalent };
      }

      const [updatedCustomer, tx] = await prisma.$transaction([
        prisma.customer.update({
          where: { id: customer.id },
          data: updateData,
        }),
        prisma.customerTransaction.create({
          data: {
            dealerId,
            customerId: customer.id,
            type: 'TAHSILAT',
            assetType,
            amount,
            hasEquivalent,
            description: payload.description || 'AI Asistan aracılığıyla tahsilat yapıldı',
            employeeName: `AI (${userName})`,
          },
        }),
      ]);

      executionResult = { customer: updatedCustomer, transaction: tx };
      successMessage = `✅ ${customer.name} adlı müşteriden ${amount} ${assetType} tahsilat başarıyla alındı ve borcundan düşüldü!`;
    }

    // 7. TOPTANCI BORÇ / MAL ALIŞ KAYDI
    else if (actionType === 'ADD_SUPPLIER_DEBT') {
      const supplierName = (payload.supplierName || 'Toptancı').trim();
      let supplier = await prisma.supplier.findFirst({
        where: { dealerId, name: supplierName },
      });

      if (!supplier) {
        supplier = await prisma.supplier.create({
          data: { dealerId, name: supplierName },
        });
      }

      const hasAmount = Number(payload.hasAmount) || 0;
      const tlAmount = Number(payload.tlAmount) || 0;

      const [updatedSupplier, tx] = await prisma.$transaction([
        prisma.supplier.update({
          where: { id: supplier.id },
          data: {
            hasBalance: { increment: hasAmount },
            tlBalance: { increment: tlAmount },
          },
        }),
        prisma.supplierTransaction.create({
          data: {
            dealerId,
            supplierId: supplier.id,
            type: 'PURCHASE',
            hasAmount,
            tlAmount,
            description: payload.description || 'AI Asistan ile toptancı mal alışı borcu eklendi',
            employeeName: `AI (${userName})`,
          },
        }),
      ]);

      executionResult = { supplier: updatedSupplier, transaction: tx };
      successMessage = `✅ ${supplier.name} toptancısına ${hasAmount} gr Has / ₺${tlAmount} borç hareketi başarıyla işlendi!`;
    }

    // 8. TOPTANCIYA ÖDEME YAPMA
    else if (actionType === 'PAY_SUPPLIER') {
      const supplierName = (payload.supplierName || '').trim();
      const supplier = await prisma.supplier.findFirst({
        where: { dealerId, name: supplierName },
      });

      if (!supplier) {
        return NextResponse.json({ error: `"${supplierName}" toptancısı bulunamadı.` }, { status: 404 });
      }

      const hasAmount = Number(payload.hasAmount) || 0;
      const tlAmount = Number(payload.tlAmount) || 0;

      const [updatedSupplier, tx] = await prisma.$transaction([
        prisma.supplier.update({
          where: { id: supplier.id },
          data: {
            hasBalance: { decrement: hasAmount },
            tlBalance: { decrement: tlAmount },
          },
        }),
        prisma.supplierTransaction.create({
          data: {
            dealerId,
            supplierId: supplier.id,
            type: hasAmount > 0 ? 'HAS_PAYMENT' : 'TL_PAYMENT',
            hasAmount,
            tlAmount,
            description: payload.description || 'AI Asistan ile toptancıya ödeme yapıldı',
            employeeName: `AI (${userName})`,
          },
        }),
      ]);

      executionResult = { supplier: updatedSupplier, transaction: tx };
      successMessage = `✅ ${supplier.name} toptancısına ${hasAmount ? hasAmount + ' gr Has' : ''} ${tlAmount ? '₺' + tlAmount : ''} ödeme başarıyla düşüldü!`;
    }

    // 9. YENİ MÜŞTERİ KARTI OLUŞTURMA
    else if (actionType === 'CREATE_CUSTOMER') {
      const customer = await prisma.customer.create({
        data: {
          dealerId,
          name: payload.name.trim(),
          phone: payload.phone || null,
          note: payload.note || 'AI Asistan tarafından oluşturuldu',
        },
      });

      executionResult = customer;
      successMessage = `✅ "${customer.name}" adlı yeni müşteri rehbere başarıyla eklendi!`;
    }

    // 10. KRİTİK STOK EŞİĞİ GÜNCELLEME
    else if (actionType === 'UPDATE_STOCK_THRESHOLD') {
      const targetProductRaw = payload.product || payload.productCode || payload.label || 'ECEYREKTL';
      const resolved = resolveStockProduct(targetProductRaw);
      const minThreshold = Number(payload.minThreshold) || 5;

      const stock = await prisma.stock.upsert({
        where: {
          product_dealerId: {
            product: resolved.id,
            dealerId,
          },
        },
        update: { minThreshold, label: resolved.label, type: resolved.type },
        create: {
          dealerId,
          product: resolved.id,
          label: resolved.label,
          type: resolved.type,
          amount: 0,
          minThreshold,
        },
      });

      executionResult = stock;
      successMessage = `✅ ${stock.label || stock.product} ürününün kritik stok uyarı eşiği ${minThreshold} adet olarak güncellendi!`;
    }

    // 11. KASAYA MANUEL HAREKET (Giriş/Çıkış)
    else if (actionType === 'ADD_CASH_MOVEMENT') {
      const openSession = await prisma.cashRegisterSession.findFirst({
        where: { dealerId, status: 'OPEN' },
      });

      const amount = Number(payload.amount) || 0;
      const type = (payload.type || 'INFLOW').toUpperCase();
      const currency = (payload.currency || 'TL').toUpperCase();

      const movement = await prisma.cashMovement.create({
        data: {
          dealerId,
          sessionId: openSession?.id || 'manual',
          type,
          category: payload.category || 'CAPITAL',
          paymentMethod: 'CASH',
          amount,
          currency,
          description: payload.description || 'AI Asistan ile kasa hareketi işlendi',
          employeeName: `AI (${userName})`,
        },
      });

      executionResult = movement;
      successMessage = `✅ Kasaya ₺${amount.toLocaleString('tr-TR')} ${type === 'INFLOW' ? 'giriş' : 'çıkış'} hareketi başarıyla işlendi!`;
    } else {
      return NextResponse.json({ error: `Desteklenmeyen eylem türü: ${actionType}` }, { status: 400 });
    }

    // Audit Log Kaydı
    await prisma.auditLog.create({
      data: {
        dealerId,
        action: `AI_ACTION: ${actionType}`,
        details: `${userName} teyidi ile yapay zeka işlemi tamamlandı: ${successMessage}`,
        userEmail,
        userName,
      },
    });

    return NextResponse.json({
      success: true,
      message: successMessage,
      actionType,
      result: executionResult,
    });
  } catch (error: any) {
    console.error('[AI Execute Action Error]:', error);
    return NextResponse.json(
      { error: error.message || 'Eylem gerçekleştirilirken bir hata oluştu.' },
      { status: 500 }
    );
  }
}
