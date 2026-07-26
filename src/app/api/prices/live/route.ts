import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { fetchAltisPricesServer } from '@/lib/altis-server';

const LOG_PREFIX = '[API Prices Live]';

/**
 * GET /api/prices/live — Nihai fiyat listesini döner.
 * Eğer veritabanında fiyat yoksa, sunucu tarafında Altis WebSocket'e bağlanıp canlı çeker ve kaydeder.
 */
export async function GET() {
  try {
    let prices = await prisma.livePrice.findMany({
      orderBy: { id: 'asc' },
    });

    // Veritabanında canlı fiyat yoksa sunucu tarafında Altis WS'den çek
    if (prices.length === 0) {
      const altisMap = await fetchAltisPricesServer();
      const gautry = altisMap['GAUTRY'];

      if (gautry) {
        const itemsToSave = [
          { id: 'GAUTRY', label: 'Has Altın', bid: gautry.bid, ask: gautry.ask },
          { id: 'mil24Ayar', label: '24 Ayar Gram', bid: gautry.bid, ask: gautry.ask },
          { id: 'mil22Ayar', label: '22 Ayar Gram', bid: gautry.bid * 0.916, ask: gautry.ask * 0.916 },
          { id: 'milAdanaBurma', label: 'Adana-Burma Bilezik', bid: gautry.bid * 0.931, ask: gautry.ask * 0.931 },
          { id: 'milAjda', label: 'Ajda Bilezik', bid: gautry.bid * 0.942, ask: gautry.ask * 0.942 },
          { id: 'mil14Ayar', label: '14 Ayar Gram', bid: gautry.bid * 0.583, ask: gautry.ask * 0.583 },
        ];

        // ECEYREKTL vb. var ise ekle
        if (altisMap['ECEYREKTL']) {
          itemsToSave.push({ id: 'ECEYREKTL', label: 'Çeyrek Altın', bid: altisMap['ECEYREKTL'].bid, ask: altisMap['ECEYREKTL'].ask });
        }

        await prisma.$transaction(
          itemsToSave.map(item =>
            prisma.livePrice.upsert({
              where: { id: item.id },
              update: { label: item.label, bid: item.bid, ask: item.ask },
              create: { id: item.id, label: item.label, bid: item.bid, ask: item.ask },
            })
          )
        );

        prices = await prisma.livePrice.findMany({ orderBy: { id: 'asc' } });
      }
    }

    return NextResponse.json(prices);
  } catch (error) {
    console.error(`${LOG_PREFIX} GET Error:`, error);
    return NextResponse.json({ error: 'Fiyatlar okunamadı.' }, { status: 500 });
  }
}

interface PriceItem {
  id: string;
  label: string;
  bid: number;
  ask: number;
}

/**
 * POST /api/prices/live — Nihai fiyatları toplu olarak günceller
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();

    if (!Array.isArray(body)) {
      return NextResponse.json({ error: 'Geçersiz veri formatı. Dizi bekleniyor.' }, { status: 400 });
    }

    const items = body as PriceItem[];

    await prisma.$transaction(
      items.map(item =>
        prisma.livePrice.upsert({
          where: { id: item.id },
          update: {
            label: item.label,
            bid: item.bid,
            ask: item.ask,
          },
          create: {
            id: item.id,
            label: item.label,
            bid: item.bid,
            ask: item.ask,
          },
        })
      )
    );

    return NextResponse.json({ success: true, count: items.length });
  } catch (error) {
    console.error(`${LOG_PREFIX} POST Error:`, error);
    return NextResponse.json(
      {
        error: 'Fiyatlar güncellenemedi.',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
