import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ZIYNET_OLD_CODES } from '@/constants/prices';

const ALLOWED_CODES = new Set<string>(ZIYNET_OLD_CODES);

/** GET /api/prices/ziynet — Tüm kayıtlı ziynet fiyatlarını döner */
export async function GET() {
  try {
    const records = await prisma.ziynetPrice.findMany();
    return NextResponse.json(records);
  } catch {
    return NextResponse.json({ error: 'DB okuma hatası' }, { status: 500 });
  }
}

/** POST /api/prices/ziynet — Ziynet fiyatlarını upsert eder (tek veya toplu) */
export async function POST(req: Request) {
  try {
    const body = await req.json();

    if (Array.isArray(body)) {
      const updates = body.filter(item => 
        item && typeof item.id === 'string' && ALLOWED_CODES.has(item.id) &&
        typeof item.bid === 'number' && typeof item.ask === 'number'
      );

      if (updates.length === 0) {
        return NextResponse.json({ error: 'Geçersiz veri' }, { status: 400 });
      }

      // SQLite kilitlemesini önlemek için tek bir Prisma transaction'ı
      const results = await prisma.$transaction(
        updates.map(item => 
          prisma.ziynetPrice.upsert({
            where:  { id: item.id },
            create: { id: item.id, bid: item.bid, ask: item.ask },
            update: { bid: item.bid, ask: item.ask },
          })
        )
      );

      return NextResponse.json(results);
    } else {
      const { id, bid, ask } = body as { id: string; bid: number; ask: number };

      if (!ALLOWED_CODES.has(id)) {
        return NextResponse.json({ error: 'Geçersiz ziynet kodu' }, { status: 400 });
      }
      if (typeof bid !== 'number' || typeof ask !== 'number') {
        return NextResponse.json({ error: 'Geçersiz veri' }, { status: 400 });
      }

      const record = await prisma.ziynetPrice.upsert({
        where:  { id },
        create: { id, bid, ask },
        update: { bid, ask },
      });

      return NextResponse.json(record);
    }
  } catch (error) {
    console.error('[POST Ziynet Error]', error);
    return NextResponse.json({
      error: 'DB yazma hatası',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
