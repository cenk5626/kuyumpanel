import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';

const LOG_PREFIX = '[API Suppliers]';

// Varsayılan toptancı tohumlama
const DEFAULT_SUPPLIERS = [
  { name: 'Kuyumcukent Sarrafiye A.Ş.', phone: '0212 555 0101', note: 'Sarrafiye ve Has Altın Tedarikçisi' },
  { name: 'Ahlatcı Metal & Has Altın', phone: '0212 555 0202', note: 'Has Altın Tedarikçisi' },
  { name: 'Nadir Metal Rafineri', phone: '0212 555 0303', note: 'Külçe & Gram Has' },
  { name: 'Gülşah Takı & Atölye', phone: '0212 555 0404', note: '14 Ayar & 22 Ayar Bilezik Atölyesi' },
];

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const currentUserRole = (session.user as any).role;
    const currentUserDealerId = (session.user as any).dealerId || 'merkez';

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (id) {
      const supplier = await prisma.supplier.findUnique({
        where: { id },
        include: {
          transactions: {
            orderBy: { createdAt: 'desc' },
            take: 50,
          },
        },
      });
      if (!supplier) {
        return NextResponse.json({ error: 'Toptancı bulunamadı.' }, { status: 404 });
      }
      return NextResponse.json(supplier);
    }

    let whereClause: any = {};
    if (currentUserRole !== 'SUPER_ADMIN') {
      whereClause.dealerId = currentUserDealerId;
    }

    let suppliers = await prisma.supplier.findMany({
      where: whereClause,
      include: {
        _count: {
          select: { transactions: true }
        }
      },
      orderBy: { name: 'asc' },
    });

    // Otomatik Seed (Hiç toptancı yoksa)
    if (suppliers.length === 0) {
      for (const s of DEFAULT_SUPPLIERS) {
        await prisma.supplier.create({
          data: {
            name: s.name,
            phone: s.phone,
            note: s.note,
            dealerId: currentUserDealerId,
          },
        });
      }
      suppliers = await prisma.supplier.findMany({
        where: whereClause,
        include: {
          _count: {
            select: { transactions: true }
          }
        },
        orderBy: { name: 'asc' },
      });
    }

    return NextResponse.json(suppliers);
  } catch (error) {
    console.error(`${LOG_PREFIX} GET Error:`, error);
    return NextResponse.json({ error: 'Toptancılar listelenemedi.' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const currentUserDealerId = (session.user as any).dealerId || 'merkez';
    const body = await req.json();
    const { name, phone, address, note, hasBalance, tlBalance } = body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json({ error: 'Toptancı adı zorunludur.' }, { status: 400 });
    }

    const newSupplier = await prisma.supplier.create({
      data: {
        name: name.trim(),
        phone: phone ? String(phone).trim() : null,
        address: address ? String(address).trim() : null,
        note: note ? String(note).trim() : null,
        hasBalance: parseFloat(hasBalance) || 0,
        tlBalance: parseFloat(tlBalance) || 0,
        dealerId: currentUserDealerId,
      },
    });

    return NextResponse.json(newSupplier, { status: 201 });
  } catch (error) {
    console.error(`${LOG_PREFIX} POST Error:`, error);
    return NextResponse.json({ error: 'Toptancı eklenemedi.' }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { id, name, phone, address, note } = body;

    if (!id) {
      return NextResponse.json({ error: 'Toptancı ID gerekli.' }, { status: 400 });
    }

    const existing = await prisma.supplier.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Toptancı bulunamadı.' }, { status: 404 });
    }

    const updated = await prisma.supplier.update({
      where: { id },
      data: {
        name: name ? String(name).trim() : existing.name,
        phone: phone !== undefined ? (phone ? String(phone).trim() : null) : existing.phone,
        address: address !== undefined ? (address ? String(address).trim() : null) : existing.address,
        note: note !== undefined ? (note ? String(note).trim() : null) : existing.note,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error(`${LOG_PREFIX} PUT Error:`, error);
    return NextResponse.json({ error: 'Toptancı güncellenemedi.' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID gerekli.' }, { status: 400 });
    }

    const count = await prisma.supplierTransaction.count({
      where: { supplierId: id },
    });

    if (count > 0) {
      return NextResponse.json({ error: 'İşlem geçmişi olan toptancı silinemez.' }, { status: 400 });
    }

    await prisma.supplier.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(`${LOG_PREFIX} DELETE Error:`, error);
    return NextResponse.json({ error: 'Toptancı silinemedi.' }, { status: 500 });
  }
}
