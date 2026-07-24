import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { logActivity } from '@/lib/logger';

/**
 * GET /api/customer-transactions?customerId=... — Müşteriye ait veresiye ekstresini döner
 */
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const customerId = searchParams.get('customerId');

    const currentUserRole = (session.user as any).role;
    const currentUserDealerId = (session.user as any).dealerId || 'merkez';

    let whereClause: any = {};
    if (currentUserRole !== 'SUPER_ADMIN') {
      whereClause.dealerId = currentUserDealerId;
    }
    if (customerId) {
      whereClause.customerId = customerId;
    }

    const transactions = await prisma.customerTransaction.findMany({
      where: whereClause,
      include: {
        customer: {
          select: { name: true, phone: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(transactions);
  } catch (error) {
    console.error('[API CustomerTransactions] GET Error:', error);
    return NextResponse.json({ error: 'Müşteri ekstre verileri okunamadı.' }, { status: 500 });
  }
}

/**
 * POST /api/customer-transactions — Müşteriye Borç Verme veya Tahsilat Alma kaydı oluşturur
 */
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { customerId, type, assetType, amount, hasEquivalent, unitPrice, description, employeeName } = body;

    if (!customerId || !type || !assetType || amount == null || isNaN(parseFloat(amount))) {
      return NextResponse.json({ error: 'Lütfen müşteri, işlem tipi, varlık türü ve miktarı giriniz.' }, { status: 400 });
    }

    const numAmount = parseFloat(amount);
    if (numAmount <= 0) {
      return NextResponse.json({ error: 'İşlem miktarı sıfırdan büyük olmalıdır.' }, { status: 400 });
    }

    const currentUserDealerId = (session.user as any).dealerId || 'merkez';
    const userEmail = session.user?.email;
    const userName = session.user?.name;

    // Müşteriyi kontrol et
    const customer = await prisma.customer.findUnique({ where: { id: customerId } });
    if (!customer) {
      return NextResponse.json({ error: 'Müşteri bulunamadı.' }, { status: 404 });
    }

    // Has Altın Karşılığının Otomatik Hesaplanması
    let calculatedHasEq = parseFloat(hasEquivalent) || 0;
    const numPrice = parseFloat(unitPrice) || 0;

    if (calculatedHasEq <= 0) {
      if (assetType === 'TL' && numPrice > 0) {
        // 10.000 TL borç verildiğinde: 10.000 / HasFiyatı = Has Altın Karşılığı
        calculatedHasEq = numAmount / numPrice;
      } else if (assetType === 'HAS') {
        calculatedHasEq = numAmount;
      } else if (assetType === '22K' || assetType === '22_AYAR') {
        calculatedHasEq = numAmount * 0.916;
      } else if (assetType === 'CEYREK') {
        // Çeyrek Altın ~1.605 gr Has kabul edilir
        calculatedHasEq = numAmount * 1.605;
      } else if (assetType === 'YARIM') {
        calculatedHasEq = numAmount * 3.21;
      } else if (assetType === 'TAM') {
        calculatedHasEq = numAmount * 6.42;
      } else if (assetType === 'ATA') {
        calculatedHasEq = numAmount * 6.60;
      } else if (assetType === '14K' || assetType === '14_AYAR') {
        calculatedHasEq = numAmount * 0.585;
      }
    }

    const tx = await prisma.customerTransaction.create({
      data: {
        customerId,
        dealerId: currentUserDealerId,
        type: type === 'BORC' ? 'BORC' : 'TAHSILAT',
        assetType: assetType.toUpperCase(),
        amount: numAmount,
        hasEquivalent: calculatedHasEq,
        unitPrice: numPrice || null,
        description: description?.trim() || null,
        employeeName: employeeName?.trim() || userName || null,
      },
      include: {
        customer: {
          select: { name: true },
        },
      },
    });

    const isDebt = type === 'BORC';
    const actionName = isDebt ? 'Müşteri Borç Verme' : 'Müşteri Tahsilat Alma';
    const detailsText = `${customer.name} kişisine ${isDebt ? 'borç yazıldı' : 'tahsilat alındı'}: ${numAmount} ${assetType}` + 
      (calculatedHasEq > 0 ? ` (${calculatedHasEq.toFixed(3)} gr Has)` : '') +
      (description ? ` - Not: ${description}` : '');

    // Log Activity
    await logActivity({
      dealerId: currentUserDealerId,
      action: actionName,
      details: detailsText,
      userEmail,
      userName,
    });

    return NextResponse.json(tx, { status: 201 });
  } catch (error) {
    console.error('[API CustomerTransactions] POST Error:', error);
    return NextResponse.json({ error: 'Müşteri işlem kaydı oluşturulamadı.' }, { status: 500 });
  }
}
