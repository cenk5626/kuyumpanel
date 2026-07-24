import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { SETTINGS_SINGLETON_ID, DEFAULT_SETTINGS } from '@/constants/prices';

/** GET /api/prices/settings — Fiyat ayarlarını döner, yoksa varsayılanları oluşturur */
export async function GET() {
  try {
    let record = await prisma.priceSettings.findUnique({
      where: { id: SETTINGS_SINGLETON_ID },
    });

    if (!record) {
      // İlk çalıştırmada varsayılanlarla oluştur
      record = await prisma.priceSettings.create({
        data: {
          id:            SETTINGS_SINGLETON_ID,
          sourceOrder:   JSON.stringify(DEFAULT_SETTINGS.sourceOrder),
          priceOffsets:  JSON.stringify(DEFAULT_SETTINGS.priceOffsets),
          mil24Ayar:     DEFAULT_SETTINGS.mil24Ayar,
          mil22Ayar:     DEFAULT_SETTINGS.mil22Ayar,
          milAdanaBurma: DEFAULT_SETTINGS.milAdanaBurma,
          milAjda:       DEFAULT_SETTINGS.milAjda,
          mil14Ayar:     DEFAULT_SETTINGS.mil14Ayar,
          gremseMil:     DEFAULT_SETTINGS.gremseMil,
        },
      });
    }

    return NextResponse.json({
      ...record,
      sourceOrder: JSON.parse(record.sourceOrder) as string[],
      priceOffsets: JSON.parse(record.priceOffsets ?? '{}') as Record<string, number>,
    });
  } catch (error) {
    console.error('[GET Settings Error]', error);
    return NextResponse.json({ error: 'DB okuma hatası' }, { status: 500 });
  }
}

/** PUT /api/prices/settings — Fiyat ayarlarını günceller */
export async function PUT(req: Request) {
  try {
    const body = await req.json() as {
      sourceOrder?:   string[];
      priceOffsets?:  Record<string, number>;
      mil24Ayar?:     number;
      mil22Ayar?:     number;
      milAdanaBurma?: number;
      milAjda?:       number;
      mil14Ayar?:     number;
      gremseMil?:     number;
    };

    const data: Record<string, unknown> = {};
    if (Array.isArray(body.sourceOrder))             data.sourceOrder   = JSON.stringify(body.sourceOrder);
    if (body.priceOffsets && typeof body.priceOffsets === 'object') data.priceOffsets = JSON.stringify(body.priceOffsets);
    if (typeof body.mil24Ayar === 'number')          data.mil24Ayar     = body.mil24Ayar;
    if (typeof body.mil22Ayar === 'number')          data.mil22Ayar     = body.mil22Ayar;
    if (typeof body.milAdanaBurma === 'number')      data.milAdanaBurma = body.milAdanaBurma;
    if (typeof body.milAjda === 'number')            data.milAjda       = body.milAjda;
    if (typeof body.mil14Ayar === 'number')          data.mil14Ayar     = body.mil14Ayar;
    if (typeof body.gremseMil === 'number')          data.gremseMil     = body.gremseMil;

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: 'Güncellenecek alan yok' }, { status: 400 });
    }

    const record = await prisma.priceSettings.upsert({
      where:  { id: SETTINGS_SINGLETON_ID },
      create: {
        id:            SETTINGS_SINGLETON_ID,
        sourceOrder:   typeof data.sourceOrder === 'string' ? data.sourceOrder : JSON.stringify(DEFAULT_SETTINGS.sourceOrder),
        priceOffsets:  typeof data.priceOffsets === 'string' ? data.priceOffsets : JSON.stringify(DEFAULT_SETTINGS.priceOffsets),
        mil24Ayar:     typeof data.mil24Ayar === 'number'     ? data.mil24Ayar     : DEFAULT_SETTINGS.mil24Ayar,
        mil22Ayar:     typeof data.mil22Ayar === 'number'     ? data.mil22Ayar     : DEFAULT_SETTINGS.mil22Ayar,
        milAdanaBurma: typeof data.milAdanaBurma === 'number' ? data.milAdanaBurma : DEFAULT_SETTINGS.milAdanaBurma,
        milAjda:       typeof data.milAjda === 'number'       ? data.milAjda       : DEFAULT_SETTINGS.milAjda,
        mil14Ayar:     typeof data.mil14Ayar === 'number'     ? data.mil14Ayar     : DEFAULT_SETTINGS.mil14Ayar,
        gremseMil:     typeof data.gremseMil === 'number'     ? data.gremseMil     : DEFAULT_SETTINGS.gremseMil,
      },
      update: data,
    });

    return NextResponse.json({
      ...record,
      sourceOrder: JSON.parse(record.sourceOrder) as string[],
      priceOffsets: JSON.parse(record.priceOffsets ?? '{}') as Record<string, number>,
    });
  } catch (error) {
    console.error('[PUT Settings Error]', error);
    return NextResponse.json({
      error: 'DB yazma hatası',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
