import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

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

    // 2. MÜŞTERİ VERESİYE / BORÇ EKLEME
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

      // Bakiyeleri güncelle
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

    // 3. MÜŞTERİDEN TAHSİLAT ALMA
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

    // 4. TOPTANCI BORÇ / MAL ALIŞ KAYDI
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

    // 5. TOPTANCIYA ÖDEME YAPMA
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

    // 6. YENİ MÜŞTERİ KARTI OLUŞTURMA
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

    // 7. KRİTİK STOK EŞİĞİ GÜNCELLEME
    else if (actionType === 'UPDATE_STOCK_THRESHOLD') {
      const product = (payload.product || '').trim();
      const minThreshold = Number(payload.minThreshold) || 5;

      const stock = await prisma.stock.upsert({
        where: {
          product_dealerId: {
            product,
            dealerId,
          },
        },
        update: { minThreshold },
        create: {
          dealerId,
          product,
          label: payload.label || product,
          type: 'sarrafiye',
          amount: 0,
          minThreshold,
        },
      });

      executionResult = stock;
      successMessage = `✅ ${stock.label || stock.product} ürününün kritik stok uyarı eşiği ${minThreshold} adet olarak güncellendi!`;
    }

    // 8. KASAYA MANUEL HAREKET (Giriş/Çıkış)
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
