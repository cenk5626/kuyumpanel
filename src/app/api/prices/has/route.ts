import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { HAS_SINGLETON_ID } from '@/constants/prices';

/** GET /api/prices/has — Son kaydedilen has fiyatını döner */
export async function GET() {
  try {
    const record = await prisma.hasPrice.findUnique({
      where: { id: HAS_SINGLETON_ID },
    });
    return NextResponse.json(record ?? null);
  } catch {
    return NextResponse.json({ error: 'DB okuma hatası' }, { status: 500 });
  }
}

/** POST /api/prices/has — Has fiyatını upsert eder (geçmiş silinir, tek kayıt kalır) */
export async function POST(req: Request) {
  try {
    const { bid, ask, source } = await req.json() as {
      bid: number;
      ask: number;
      source: string;
    };

    if (typeof bid !== 'number' || typeof ask !== 'number') {
      return NextResponse.json({ error: 'Geçersiz veri' }, { status: 400 });
    }

    const record = await prisma.hasPrice.upsert({
      where:  { id: HAS_SINGLETON_ID },
      create: { id: HAS_SINGLETON_ID, bid, ask, source: source ?? 'altis' },
      update: { bid, ask, source: source ?? 'altis' },
    });

    return NextResponse.json(record);
  } catch {
    return NextResponse.json({ error: 'DB yazma hatası' }, { status: 500 });
  }
}
