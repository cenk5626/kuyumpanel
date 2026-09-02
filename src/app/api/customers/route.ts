import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { logActivity } from '@/lib/logger';
import { calculateCustomerBalancesFromTransactions } from '@/lib/cari';

/**
 * GET /api/customers — Bayiye ait müşterileri bakiyeleri ve limitleri ile listeler.
 */
export async function GET() {
  try {
    const session = await auth().catch(() => null);
    const currentUserRole = (session?.user as any)?.role || 'ADMIN';
    const currentUserDealerId = (session?.user as any)?.dealerId || 'merkez';

    let whereClause: any = {};
    if (currentUserRole !== 'SUPER_ADMIN') {
      whereClause.dealerId = currentUserDealerId;
    }

    const customers = await prisma.customer.findMany({
      where: whereClause,
      include: {
        transactions: true,
      },
      orderBy: { name: 'asc' },
    });

    // Her müşteri için öz bakiye özetlerini cari motoruyla hesapla
    const formatted = customers.map((c) => {
      const balances = calculateCustomerBalancesFromTransactions(c.transactions || []);

      return {
        id: c.id,
        name: c.name,
        phone: c.phone,
        email: c.email,
        tcNo: c.tcNo,
        address: c.address,
        note: c.note,
        dealerId: c.dealerId,
        tlBalance: balances.tlBalance,
        usdBalance: balances.usdBalance,
        eurBalance: balances.eurBalance,
        hasBalance: balances.hasBalance,
        totalHasEquivalent: balances.totalHasEquivalent,
        creditLimitTL: c.creditLimitTL ?? 0,
        creditLimitHas: c.creditLimitHas ?? 0,
        transactionCount: c.transactions ? c.transactions.length : 0,
        createdAt: c.createdAt ? new Date(c.createdAt).toISOString() : new Date().toISOString(),
      };
    });

    return NextResponse.json(formatted);
  } catch (error) {
    console.error('[API Customers] GET Error:', error);
    return NextResponse.json({ error: 'Müşteriler okunamadı.' }, { status: 500 });
  }
}

/**
 * POST /api/customers — Yeni müşteri ekle
 */
export async function POST(req: NextRequest) {
  try {
    const session = await auth().catch(() => null);
    const currentUserDealerId = (session?.user as any)?.dealerId || 'merkez';
    const userEmail = session?.user?.email;
    const userName = session?.user?.name || 'Patron';

    const body = await req.json();
    const {
      name,
      phone,
      email,
      tcNo,
      address,
      note,
      creditLimitTL,
      creditLimitHas,
      initialHasDebt,
      initialTlDebt,
      initialUsdDebt,
      initialEurDebt,
    } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Müşteri ad soyad zorunludur.' }, { status: 400 });
    }

    if (tcNo && tcNo.trim() && tcNo.trim().length !== 11) {
      return NextResponse.json({ error: 'TC Kimlik No 11 haneli olmalıdır.' }, { status: 400 });
    }

    // Bayinin varlığını garanti et
    await prisma.dealer.upsert({
      where: { id: currentUserDealerId },
      create: { id: currentUserDealerId, name: currentUserDealerId === 'merkez' ? 'Merkez Mağaza' : currentUserDealerId },
      update: {},
    });

    const initHas = parseFloat(initialHasDebt) || 0;
    const initTl = parseFloat(initialTlDebt) || 0;
    const initUsd = parseFloat(initialUsdDebt) || 0;
    const initEur = parseFloat(initialEurDebt) || 0;

    const customer = await prisma.customer.create({
      data: {
        name: name.trim(),
        phone: phone?.trim() || null,
        email: email?.trim() || null,
        tcNo: tcNo?.trim() || null,
        address: address?.trim() || null,
        note: note?.trim() || null,
        creditLimitTL: creditLimitTL != null && !isNaN(Number(creditLimitTL)) ? Number(creditLimitTL) : 0,
        creditLimitHas: creditLimitHas != null && !isNaN(Number(creditLimitHas)) ? Number(creditLimitHas) : 0,
        dealerId: currentUserDealerId,
        hasBalance: initHas,
        tlBalance: initTl,
      },
    });

    // Açılış Borç Hareketleri (Varsa)
    const initialTxs: any[] = [];
    if (initHas > 0) {
      initialTxs.push({
        customerId: customer.id,
        dealerId: currentUserDealerId,
        type: 'BORC',
        assetType: 'HAS',
        amount: initHas,
        hasEquivalent: initHas,
        description: 'Açılış / Devir Has Borcu',
        employeeName: userName,
      });
    }
    if (initTl > 0) {
      initialTxs.push({
        customerId: customer.id,
        dealerId: currentUserDealerId,
        type: 'BORC',
        assetType: 'TL',
        amount: initTl,
        hasEquivalent: 0,
        description: 'Açılış / Devir TL Borcu',
        employeeName: userName,
      });
    }
    if (initUsd > 0) {
      initialTxs.push({
        customerId: customer.id,
        dealerId: currentUserDealerId,
        type: 'BORC',
        assetType: 'USD',
        amount: initUsd,
        hasEquivalent: 0,
        description: 'Açılış / Devir Dolar Borcu',
        employeeName: userName,
      });
    }
    if (initEur > 0) {
      initialTxs.push({
        customerId: customer.id,
        dealerId: currentUserDealerId,
        type: 'BORC',
        assetType: 'EUR',
        amount: initEur,
        hasEquivalent: 0,
        description: 'Açılış / Devir Euro Borcu',
        employeeName: userName,
      });
    }

    for (const txData of initialTxs) {
      await prisma.customerTransaction.create({ data: txData });
    }

    // Turso Çift Yönlü Senkronizasyon
    const TURSO_URL = process.env.TURSO_DATABASE_URL || 'libsql://kuyumpanel-db-cenk5626.aws-us-east-1.turso.io';
    const TURSO_TOKEN = process.env.TURSO_AUTH_TOKEN || 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3ODQ5MzUzNjcsImlkIjoiMDE5Zjk2NDMtY2EwMS03MjE4LThkYmEtZGE4YjI1MTY3MjI2Iiwia2lkIjoiNWhmQnk2WTN1NkVDazNkLTd5c3BZc3JBRlRWYW1yVFh0emtVd2dCdGtGNCIsInJpZCI6ImUxNTM3NjllLWUxNWMtNDhkNi05MzMzLTlhYjQ0MjFiNTcwOCJ9.grKQ1ZymXrHb9DWwiJ_uP7y7dZyDu5pO4e8Hem-aUB4h6jr7OIJ19FqUpJkqssm5Wdm4wm3nHR32j9inJJ3ZDA';
    try {
      const { createClient } = await import('@libsql/client');
      const turso = createClient({ url: TURSO_URL, authToken: TURSO_TOKEN });
      await turso.execute({
        sql: `INSERT INTO Customer (id, name, phone, email, tcNo, address, note, hasBalance, tlBalance, creditLimitTL, creditLimitHas, dealerId, createdAt, updatedAt)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
        args: [
          customer.id,
          customer.name,
          customer.phone,
          customer.email,
          customer.tcNo,
          customer.address,
          customer.note,
          customer.hasBalance,
          customer.tlBalance,
          customer.creditLimitTL,
          customer.creditLimitHas,
          currentUserDealerId,
          new Date().toISOString(),
          new Date().toISOString(),
        ],
      });
      for (const txData of initialTxs) {
        await turso.execute({
          sql: `INSERT INTO CustomerTransaction (id, customerId, dealerId, type, assetType, amount, hasEquivalent, description, employeeName, createdAt)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
          args: [
            'tx_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
            customer.id,
            currentUserDealerId,
            txData.type,
            txData.assetType,
            txData.amount,
            txData.hasEquivalent,
            txData.description,
            txData.employeeName,
            new Date().toISOString(),
          ],
        });
      }
    } catch (e: any) {
      console.warn('[Turso Sync Warning]:', e.message);
    }

    // Activity Log
    await logActivity({
      dealerId: currentUserDealerId,
      action: 'Müşteri Kaydı',
      details: `Yeni müşteri eklendi: ${customer.name} (Has: ${initHas} gr, TL: ₺${initTl})`,
      userEmail,
      userName,
    }).catch(() => {});

    return NextResponse.json(customer, { status: 201 });
  } catch (error) {
    console.error('[API Customers] POST Error:', error);
    return NextResponse.json({ error: 'Müşteri kaydedilemedi.' }, { status: 500 });
  }
}

/**
 * PUT /api/customers — Müşteri bilgilerini ve limitlerini güncelle
 */
export async function PUT(req: NextRequest) {
  try {
    const session = await auth().catch(() => null);
    const currentUserDealerId = (session?.user as any)?.dealerId || 'merkez';
    const userEmail = session?.user?.email;
    const userName = session?.user?.name || 'Patron';

    const body = await req.json();
    const { id, name, phone, email, tcNo, address, note, creditLimitTL, creditLimitHas } = body;

    if (!id) {
      return NextResponse.json({ error: 'Müşteri ID gereklidir.' }, { status: 400 });
    }

    if (name && !name.trim()) {
      return NextResponse.json({ error: 'Müşteri ad soyad boş bırakılamaz.' }, { status: 400 });
    }

    if (tcNo && tcNo.trim() && tcNo.trim().length !== 11) {
      return NextResponse.json({ error: 'TC Kimlik No 11 haneli olmalıdır.' }, { status: 400 });
    }

    const updated = await prisma.customer.update({
      where: { id },
      data: {
        ...(name && { name: name.trim() }),
        phone: phone !== undefined ? (phone?.trim() || null) : undefined,
        email: email !== undefined ? (email?.trim() || null) : undefined,
        tcNo: tcNo !== undefined ? (tcNo?.trim() || null) : undefined,
        address: address !== undefined ? (address?.trim() || null) : undefined,
        note: note !== undefined ? (note?.trim() || null) : undefined,
        ...(creditLimitTL !== undefined && { creditLimitTL: Number(creditLimitTL) || 0 }),
        ...(creditLimitHas !== undefined && { creditLimitHas: Number(creditLimitHas) || 0 }),
      },
    });

    // Turso Sync
    const TURSO_URL = process.env.TURSO_DATABASE_URL || 'libsql://kuyumpanel-db-cenk5626.aws-us-east-1.turso.io';
    const TURSO_TOKEN = process.env.TURSO_AUTH_TOKEN || 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3ODQ5MzUzNjcsImlkIjoiMDE5Zjk2NDMtY2EwMS03MjE4LThkYmEtZGE4YjI1MTY3MjI2Iiwia2lkIjoiNWhmQnk2WTN1NkVDazNkLTd5c3BZc3JBRlRWYW1yVFh0emtVd2dCdGtGNCIsInJpZCI6ImUxNTM3NjllLWUxNWMtNDhkNi05MzMzLTlhYjQ0MjFiNTcwOCJ9.grKQ1ZymXrHb9DWwiJ_uP7y7dZyDu5pO4e8Hem-aUB4h6jr7OIJ19FqUpJkqssm5Wdm4wm3nHR32j9inJJ3ZDA';
    try {
      const { createClient } = await import('@libsql/client');
      const turso = createClient({ url: TURSO_URL, authToken: TURSO_TOKEN });
      await turso.execute({
        sql: `UPDATE Customer SET name = ?, phone = ?, email = ?, tcNo = ?, address = ?, note = ?, creditLimitTL = ?, creditLimitHas = ?, updatedAt = ? WHERE id = ?;`,
        args: [
          updated.name,
          updated.phone,
          updated.email,
          updated.tcNo,
          updated.address,
          updated.note,
          updated.creditLimitTL,
          updated.creditLimitHas,
          new Date().toISOString(),
          id,
        ],
      });
    } catch (e: any) {
      console.warn('[Turso Sync Warning]:', e.message);
    }

    await logActivity({
      dealerId: currentUserDealerId,
      action: 'Müşteri Güncelleme',
      details: `Müşteri güncellendi: ${updated.name}`,
      userEmail,
      userName,
    }).catch(() => {});

    return NextResponse.json(updated);
  } catch (error) {
    console.error('[API Customers] PUT Error:', error);
    return NextResponse.json({ error: 'Müşteri güncellenemedi.' }, { status: 500 });
  }
}

/**
 * DELETE /api/customers — Müşteri sil
 */
export async function DELETE(req: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Müşteri ID gereklidir.' }, { status: 400 });
    }

    const currentUserDealerId = (session.user as any)?.dealerId || 'merkez';
    const userEmail = session.user?.email;
    const userName = session.user?.name;

    const customer = await prisma.customer.findUnique({
      where: { id },
      include: { transactions: true },
    });

    if (!customer) {
      return NextResponse.json({ error: 'Müşteri bulunamadı.' }, { status: 404 });
    }

    // Müşteriyi sil
    await prisma.customer.delete({
      where: { id },
    });

    await logActivity({
      dealerId: currentUserDealerId,
      action: 'Müşteri Silme',
      details: `Müşteri silindi: ${customer.name} (İşlem sayısı: ${customer.transactions.length})`,
      userEmail,
      userName,
    }).catch(() => {});

    return NextResponse.json({ success: true, message: 'Müşteri başarıyla silindi.' });
  } catch (error) {
    console.error('[API Customers] DELETE Error:', error);
    return NextResponse.json({ error: 'Müşteri silinemedi.' }, { status: 500 });
  }
}
