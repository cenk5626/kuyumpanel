import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { logActivity } from '@/lib/logger';
import {
  CUSTOMER_TRANSACTION_TYPES,
  ASSET_TYPES,
  calculateHasEquivalent,
} from '@/constants/cari';
import { calculateCustomerBalancesFromTransactions } from '@/lib/cari';

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
    const session = await auth().catch(() => null);
    const currentUserRole = (session?.user as any)?.role || 'ADMIN';
    const currentUserDealerId = (session?.user as any)?.dealerId || 'merkez';
    const userEmail = session?.user?.email || undefined;
    const userName = session?.user?.name || 'Patron';

    const body = await req.json();
    const { customerId, type, assetType, amount, hasEquivalent, unitPrice, description, employeeName } = body;

    if (!customerId || !type || !assetType || amount == null || isNaN(parseFloat(amount))) {
      return NextResponse.json({ error: 'Lütfen müşteri, işlem tipi, varlık türü ve miktarı giriniz.' }, { status: 400 });
    }

    const numAmount = parseFloat(amount);
    if (numAmount <= 0) {
      return NextResponse.json({ error: 'İşlem miktarı sıfırdan büyük olmalıdır.' }, { status: 400 });
    }

    const validTypes = Object.values(CUSTOMER_TRANSACTION_TYPES);
    const normalizedType = type.toUpperCase();
    if (!validTypes.includes(normalizedType as any)) {
      return NextResponse.json({ error: `Geçersiz işlem türü: ${type}` }, { status: 400 });
    }

    const normalizedAsset = assetType.toUpperCase();
    const numPrice = unitPrice != null && !isNaN(parseFloat(unitPrice)) ? parseFloat(unitPrice) : null;

    // Müşteriyi kontrol et
    let customer = await prisma.customer.findUnique({
      where: { id: customerId },
      include: { transactions: true },
    });

    if (!customer) {
      return NextResponse.json({ error: 'Müşteri bulunamadı.' }, { status: 404 });
    }

    if (currentUserRole !== 'SUPER_ADMIN' && customer.dealerId !== currentUserDealerId) {
      return NextResponse.json({ error: 'Bu müşteri üzerinde işlem yapma yetkiniz yok.' }, { status: 403 });
    }

    // Has Altın Karşılığının Otomatik Hesaplanması
    let calculatedHasEq = hasEquivalent != null && !isNaN(parseFloat(hasEquivalent)) && parseFloat(hasEquivalent) > 0
      ? parseFloat(hasEquivalent)
      : calculateHasEquivalent(normalizedAsset, numAmount, numPrice);

    // İşlem kaydı ve Müşteri bakiye senkronizasyonunu transaction içinde yap
    const result = await prisma.$transaction(async (txPrisma) => {
      const tx = await txPrisma.customerTransaction.create({
        data: {
          customerId,
          dealerId: currentUserDealerId,
          type: normalizedType,
          assetType: normalizedAsset,
          amount: numAmount,
          hasEquivalent: calculatedHasEq,
          unitPrice: numPrice,
          description: description?.trim() || null,
          employeeName: employeeName?.trim() || userName || null,
        },
        include: {
          customer: {
            select: { name: true },
          },
        },
      });

      // Güncel bakiyeleri tüm hareketlerden tekrar hesapla ve customer tablosuna yaz
      const allCustomerTxs = [...customer.transactions, tx];
      const { tlBalance, hasBalance } = calculateCustomerBalancesFromTransactions(allCustomerTxs);

      await txPrisma.customer.update({
        where: { id: customerId },
        data: {
          tlBalance,
          hasBalance,
        },
      });

      return { tx, tlBalance, hasBalance };
    });

    // Turso Veritabanına Çift Yönlü Eşitleme
    const TURSO_URL = process.env.TURSO_DATABASE_URL || 'libsql://kuyumpanel-db-cenk5626.aws-us-east-1.turso.io';
    const TURSO_TOKEN = process.env.TURSO_AUTH_TOKEN || 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3ODQ5MzUzNjcsImlkIjoiMDE5Zjk2NDMtY2EwMS03MjE4LThkYmEtZGE4YjI1MTY3MjI2Iiwia2lkIjoiNWhmQnk2WTN1NkVDazNkLTd5c3BZc3JBRlRWYW1yVFh0emtVd2dCdGtGNCIsInJpZCI6ImUxNTM3NjllLWUxNWMtNDhkNi05MzMzLTlhYjQ0MjFiNTcwOCJ9.grKQ1ZymXrHb9DWwiJ_uP7y7dZyDu5pO4e8Hem-aUB4h6jr7OIJ19FqUpJkqssm5Wdm4wm3nHR32j9inJJ3ZDA';
    try {
      const { createClient } = await import('@libsql/client');
      const turso = createClient({ url: TURSO_URL, authToken: TURSO_TOKEN });
      await turso.execute({
        sql: `INSERT INTO CustomerTransaction (id, customerId, dealerId, type, assetType, amount, hasEquivalent, unitPrice, description, employeeName, createdAt)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
        args: [
          result.tx.id,
          customerId,
          currentUserDealerId,
          normalizedType,
          normalizedAsset,
          numAmount,
          calculatedHasEq,
          numPrice,
          description?.trim() || null,
          employeeName?.trim() || userName,
          new Date().toISOString(),
        ],
      });
      await turso.execute({
        sql: `UPDATE Customer SET tlBalance = ?, hasBalance = ?, updatedAt = ? WHERE id = ?;`,
        args: [result.tlBalance, result.hasBalance, new Date().toISOString(), customerId],
      });
    } catch (e: any) {
      console.warn('[Turso Sync Warning]:', e.message);
    }

    const isDebt = normalizedType === CUSTOMER_TRANSACTION_TYPES.BORC || normalizedType === CUSTOMER_TRANSACTION_TYPES.ODEME;
    const actionName = isDebt ? 'Müşteri Borç Verme' : 'Müşteri Tahsilat Alma';
    const detailsText = `${customer.name} kişisine ${isDebt ? 'borç yazıldı' : 'tahsilat alındı'}: ${numAmount} ${normalizedAsset}` +
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

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error('[API CustomerTransactions] POST Error:', error);
    return NextResponse.json({ error: 'Müşteri işlem kaydı oluşturulamadı.' }, { status: 500 });
  }
}
