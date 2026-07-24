import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// API log başlığı
const LOG_PREFIX = '[API Prices Live]';

/**
 * GET /api/prices/live — Nihai fiyat listesini döner
 */
export async function GET() {
  try {
    const prices = await prisma.livePrice.findMany({
      orderBy: { id: 'asc' },
    });
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

    // SQLite kilitlemesini önlemek için tüm upsert'leri tek transaction altında yapıyoruz
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
