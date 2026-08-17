import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { logActivity } from '@/lib/logger';
import { calculateCustomerBalancesFromTransactions } from '@/lib/cari';

/**
 * GET /api/customers — Bayiye ait müşterileri bakiyeleri ile listeler.
 */
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const currentUserRole = (session.user as any).role;
    const currentUserDealerId = (session.user as any).dealerId || 'merkez';

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
      const balances = calculateCustomerBalancesFromTransactions(c.transactions);

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
        transactionCount: c.transactions.length,
        createdAt: c.createdAt.toISOString(),
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
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { name, phone, email, tcNo, address, note } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Müşteri ad soyad zorunludur.' }, { status: 400 });
    }

    if (tcNo && tcNo.trim() && tcNo.trim().length !== 11) {
      return NextResponse.json({ error: 'TC Kimlik No 11 haneli olmalıdır.' }, { status: 400 });
    }

    const currentUserDealerId = (session.user as any).dealerId || 'merkez';
    const userEmail = session.user?.email;
    const userName = session.user?.name;

    const customer = await prisma.customer.create({
      data: {
        name: name.trim(),
        phone: phone?.trim() || null,
        email: email?.trim() || null,
        tcNo: tcNo?.trim() || null,
        address: address?.trim() || null,
        note: note?.trim() || null,
        dealerId: currentUserDealerId,
      },
    });

    // Activity Log
    await logActivity({
      dealerId: currentUserDealerId,
      action: 'Müşteri Kaydı',
      details: `Yeni müşteri eklendi: ${customer.name} (Tel: ${customer.phone || 'Yok'})`,
      userEmail,
      userName,
    });

    return NextResponse.json(customer, { status: 201 });
  } catch (error) {
    console.error('[API Customers] POST Error:', error);
    return NextResponse.json({ error: 'Müşteri kaydedilemedi.' }, { status: 500 });
  }
}

/**
 * PUT /api/customers — Müşteri bilgilerini güncelle
 */
export async function PUT(req: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { id, name, phone, email, tcNo, address, note } = body;

    if (!id) {
      return NextResponse.json({ error: 'Müşteri ID gereklidir.' }, { status: 400 });
    }

    if (tcNo && tcNo.trim() && tcNo.trim().length !== 11) {
      return NextResponse.json({ error: 'TC Kimlik No 11 haneli olmalıdır.' }, { status: 400 });
    }

    const currentUserRole = (session.user as any).role;
    const currentUserDealerId = (session.user as any).dealerId || 'merkez';
    const userEmail = session.user?.email;
    const userName = session.user?.name;

    const existing = await prisma.customer.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Müşteri bulunamadı.' }, { status: 404 });
    }

    if (currentUserRole !== 'SUPER_ADMIN' && existing.dealerId !== currentUserDealerId) {
      return NextResponse.json({ error: 'Bu müşteriyi düzenleme yetkiniz yok.' }, { status: 403 });
    }

    const updated = await prisma.customer.update({
      where: { id },
      data: {
        name: name ? name.trim() : existing.name,
        phone: phone !== undefined ? (phone?.trim() || null) : existing.phone,
        email: email !== undefined ? (email?.trim() || null) : existing.email,
        tcNo: tcNo !== undefined ? (tcNo?.trim() || null) : existing.tcNo,
        address: address !== undefined ? (address?.trim() || null) : existing.address,
        note: note !== undefined ? (note?.trim() || null) : existing.note,
      },
    });

    // Activity Log
    await logActivity({
      dealerId: currentUserDealerId,
      action: 'Müşteri Güncelleme',
      details: `Müşteri bilgileri güncellendi: ${updated.name}`,
      userEmail,
      userName,
    });

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

    const currentUserRole = (session.user as any).role;
    const currentUserDealerId = (session.user as any).dealerId || 'merkez';
    const userEmail = session.user?.email;
    const userName = session.user?.name;

    const existing = await prisma.customer.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Müşteri bulunamadı.' }, { status: 404 });
    }

    if (currentUserRole !== 'SUPER_ADMIN' && existing.dealerId !== currentUserDealerId) {
      return NextResponse.json({ error: 'Bu müşteriyi silme yetkiniz yok.' }, { status: 403 });
    }

    await prisma.customer.delete({ where: { id } });

    // Activity Log
    await logActivity({
      dealerId: currentUserDealerId,
      action: 'Müşteri Silme',
      details: `Müşteri silindi: ${existing.name}`,
      userEmail,
      userName,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[API Customers] DELETE Error:', error);
    return NextResponse.json({ error: 'Müşteri silinemedi.' }, { status: 500 });
  }
}
