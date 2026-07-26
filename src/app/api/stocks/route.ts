import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';

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
 * Eğer varsayılan takip edilen ürünler bayi için yoksa, otomatik olarak oluşturur (auto-seeding).
 */
export async function GET() {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const dealerId = (session.user as any).dealerId || 'merkez';

    // Bayinin veritabanında var olduğunu garanti et (Foreign Key kısıtlaması için)
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
      defItem => !existingStocks.some(dbItem => dbItem.product === defItem.id)
    );

    // Eğer eksik kalemler varsa, bayi için veritabanına ekle
    if (missingStocks.length > 0) {
      await prisma.$transaction(
        missingStocks.map(item =>
          prisma.stock.create({
            data: {
              product: item.id,
              label: item.label,
              type: item.type,
              amount: 0,
              dealerId,
            },
          })
        )
      );
      // Güncel halini tekrar çek
      const reloadedStocks = await prisma.stock.findMany({
        where: { dealerId },
        orderBy: { type: 'asc' },
      });

      // Ön yüzle tam uyumluluk için "product" alanını "id" olarak map edelim
      const mapped = reloadedStocks.map(s => ({
        id: s.product,
        label: s.label,
        type: s.type,
        amount: s.amount,
      }));

      return NextResponse.json(mapped);
    }

    const mapped = existingStocks.map(s => ({
      id: s.product,
      label: s.label,
      type: s.type,
      amount: s.amount,
    }));

    return NextResponse.json(mapped);
  } catch (error) {
    console.error(`${LOG_PREFIX} GET Error:`, error);
    return NextResponse.json({ error: 'Stok bilgileri okunamadı.' }, { status: 500 });
  }
}

/**
 * PUT /api/stocks — Manuel stok düzeltmesi yapar (Giriş yapan kullanıcının bayisi için)
 */
export async function PUT(req: Request) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const dealerId = (session.user as any).dealerId || 'merkez';

    await prisma.dealer.upsert({
      where: { id: dealerId },
      create: { id: dealerId, name: dealerId === 'merkez' ? 'Merkez Mağaza' : dealerId },
      update: {},
    });
    const { id: product, amount } = await req.json() as { id: string; amount: number };

    if (!product || amount == null || isNaN(amount)) {
      return NextResponse.json({ error: 'Geçersiz parametreler.' }, { status: 400 });
    }

    const updated = await prisma.stock.upsert({
      where: {
        product_dealerId: {
          product,
          dealerId,
        },
      },
      update: { amount },
      create: {
        product,
        label: DEFAULT_STOCKS.find(s => s.id === product)?.label ?? product,
        type: DEFAULT_STOCKS.find(s => s.id === product)?.type ?? 'sarrafiye',
        amount,
        dealerId,
      },
    });

    return NextResponse.json({
      id: updated.product,
      label: updated.label,
      type: updated.type,
      amount: updated.amount,
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
