import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { logActivity } from '@/lib/logger';

// API log başlığı
const LOG_PREFIX = '[API Stocks]';

// Takip edilen stoklu ürün tanımları (Magic String kontrolü)
const DEFAULT_STOCKS = [
  { id: 'USD', label: 'Amerikan Doları (USD)', type: 'döviz' },
  { id: 'EUR', label: 'Euro (EUR)', type: 'döviz' },
  { id: 'ECEYREKTL', label: 'Çeyrek Altın', type: 'sarrafiye' },
  { id: 'EYARIMTL', label: 'Yarım Altın', type: 'sarrafiye' },
  { id: 'ETAMTL', label: 'Tam Altın', type: 'sarrafiye' },
  { id: 'EATATL', label: 'Ata Altın', type: 'sarrafiye' },
  { id: 'EGREMSETL', label: 'Gremse Altın', type: 'sarrafiye' },
  { id: 'mil24Ayar', label: '24 Ayar Gram', type: 'sarrafiye' },
  { id: 'mil22Ayar', label: '22 Ayar Gram', type: 'sarrafiye' },
  { id: 'milAdanaBurma', label: 'Adana-Burma Bilezik', type: 'sarrafiye' },
  { id: 'milAjda', label: 'Ajda Bilezik', type: 'sarrafiye' },
  { id: 'mil14Ayar', label: '14 Ayar Gram', type: 'sarrafiye' },
] as const;

/**
 * GET /api/stocks — Giriş yapan kullanıcının bayisine ait stok seviyelerini döner.
 */
export async function GET() {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const dealerId = (session.user as any)?.dealerId || 'merkez';

    // Bayinin veritabanında var olduğunu garanti et
    await prisma.dealer.upsert({
      where: { id: dealerId },
      create: { id: dealerId, name: dealerId === 'merkez' ? 'Merkez Mağaza' : dealerId },
      update: {},
    });

    // Bayinin mevcut stok kayıtlarını getir
    const existingStocks = await prisma.stock.findMany({
      where: { dealerId },
    });

    // Eksik olan varsayılan stok kalemlerini tespit et
    const missingStocks = DEFAULT_STOCKS.filter(
      (defItem) => !existingStocks.some((dbItem) => dbItem.product === defItem.id)
    );

    // Eğer eksik kalemler varsa, bayi için veritabanına ekle
    if (missingStocks.length > 0) {
      await prisma.$transaction(
        missingStocks.map((item) =>
          prisma.stock.create({
            data: {
              product: item.id,
              label: item.label,
              type: item.type,
              amount: 0,
              minThreshold: 5,
              dealerId,
            },
          })
        )
      );
    }

    const reloadedStocks = await prisma.stock.findMany({
      where: { dealerId },
      orderBy: { type: 'asc' },
    });

    const mapped = reloadedStocks.map((s) => ({
      id: s.product,
      product: s.product,
      label: s.label,
      type: s.type,
      amount: s.amount,
      minThreshold: s.minThreshold ?? 5,
    }));

    return NextResponse.json(mapped);
  } catch (error) {
    console.error(`${LOG_PREFIX} GET Error:`, error);
    return NextResponse.json({ error: 'Stok bilgileri okunamadı.' }, { status: 500 });
  }
}

/**
 * PUT /api/stocks — Manuel stok düzeltmesi, artırma/azaltma veya kritik eşik güncellemesi
 */
export async function PUT(req: Request) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const dealerId = (session.user as any)?.dealerId || 'merkez';
    const userEmail = session.user?.email;
    const userName = session.user?.name;

    await prisma.dealer.upsert({
      where: { id: dealerId },
      create: { id: dealerId, name: dealerId === 'merkez' ? 'Merkez Mağaza' : dealerId },
      update: {},
    });

    const body = await req.json();
    const { id: product, amount, delta, minThreshold } = body as {
      id: string;
      product?: string;
      amount?: number;
      delta?: number;
      minThreshold?: number;
    };

    const targetProduct = product || body.product;
    if (!targetProduct) {
      return NextResponse.json({ error: 'Ürün kodu (id) belirtilmelidir.' }, { status: 400 });
    }

    // Mevcut kaydı bul
    const currentStock = await prisma.stock.findUnique({
      where: {
        product_dealerId: {
          product: targetProduct,
          dealerId,
        },
      },
    });

    let newAmount = currentStock ? currentStock.amount : 0;
    if (amount !== undefined && !isNaN(Number(amount))) {
      newAmount = Number(amount);
    } else if (delta !== undefined && !isNaN(Number(delta))) {
      newAmount = (currentStock ? currentStock.amount : 0) + Number(delta);
    }

    const newThreshold = minThreshold !== undefined && !isNaN(Number(minThreshold))
      ? Number(minThreshold)
      : (currentStock?.minThreshold ?? 5);

    const updated = await prisma.stock.upsert({
      where: {
        product_dealerId: {
          product: targetProduct,
          dealerId,
        },
      },
      update: {
        amount: newAmount,
        minThreshold: newThreshold,
      },
      create: {
        product: targetProduct,
        label: DEFAULT_STOCKS.find((s) => s.id === targetProduct)?.label ?? targetProduct,
        type: DEFAULT_STOCKS.find((s) => s.id === targetProduct)?.type ?? 'sarrafiye',
        amount: newAmount,
        minThreshold: newThreshold,
        dealerId,
      },
    });

    await logActivity({
      dealerId,
      action: 'Stok Güncelleme',
      details: `${updated.label} (${updated.product}) stoğu güncellendi: ${currentStock?.amount ?? 0} -> ${updated.amount} (Eşik: ${updated.minThreshold})`,
      userEmail,
      userName,
    }).catch(() => {});

    return NextResponse.json({
      id: updated.product,
      product: updated.product,
      label: updated.label,
      type: updated.type,
      amount: updated.amount,
      minThreshold: updated.minThreshold,
    });
  } catch (error) {
    console.error(`${LOG_PREFIX} PUT Error:`, error);
    return NextResponse.json(
      {
        error: 'Stok güncellenemedi.',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/stocks — Yeni özel sarrafiye/döviz stok kalemi tanımla
 */
export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const dealerId = (session.user as any)?.dealerId || 'merkez';
    const userEmail = session.user?.email;
    const userName = session.user?.name;

    const body = await req.json();
    const { product, label, type, amount, minThreshold } = body;

    if (!product || !label) {
      return NextResponse.json({ error: 'Ürün kodu ve başlığı zorunludur.' }, { status: 400 });
    }

    await prisma.dealer.upsert({
      where: { id: dealerId },
      create: { id: dealerId, name: dealerId === 'merkez' ? 'Merkez Mağaza' : dealerId },
      update: {},
    });

    const created = await prisma.stock.upsert({
      where: {
        product_dealerId: {
          product: product.trim(),
          dealerId,
        },
      },
      update: {
        label: label.trim(),
        type: type || 'sarrafiye',
        amount: Number(amount) || 0,
        minThreshold: Number(minThreshold) || 5,
      },
      create: {
        product: product.trim(),
        label: label.trim(),
        type: type || 'sarrafiye',
        amount: Number(amount) || 0,
        minThreshold: Number(minThreshold) || 5,
        dealerId,
      },
    });

    await logActivity({
      dealerId,
      action: 'Stok Tanımlama',
      details: `Yeni stok kalemi oluşturuldu: ${created.label} (${created.product})`,
      userEmail,
      userName,
    }).catch(() => {});

    return NextResponse.json({
      id: created.product,
      product: created.product,
      label: created.label,
      type: created.type,
      amount: created.amount,
      minThreshold: created.minThreshold,
    }, { status: 201 });
  } catch (error) {
    console.error(`${LOG_PREFIX} POST Error:`, error);
    return NextResponse.json({ error: 'Stok kalemi oluşturulamadı.' }, { status: 500 });
  }
}
