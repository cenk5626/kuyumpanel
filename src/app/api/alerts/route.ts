import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { logActivity } from '@/lib/logger';

export const dynamic = 'force-dynamic';

/**
 * GET /api/alerts — Bayiye ait fiyat alarmlarını ve tetiklenme durumlarını listeler.
 */
export async function GET() {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const currentUserRole = (session.user as any)?.role;
    const currentUserDealerId = (session.user as any)?.dealerId || 'merkez';

    let whereClause: any = {};
    if (currentUserRole !== 'SUPER_ADMIN') {
      whereClause.dealerId = currentUserDealerId;
    }

    // Alarmları ve güncel canlı fiyatları getir
    const [alerts, livePrices, hasPrice] = await Promise.all([
      prisma.priceAlert.findMany({
        where: whereClause,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.livePrice.findMany(),
      prisma.hasPrice.findUnique({ where: { id: 'singleton' } }),
    ]);

    // Anlık tetiklenme kontrolü
    const priceMap: Record<string, { bid: number; ask: number }> = {};
    if (hasPrice) {
      priceMap['HAS'] = { bid: hasPrice.bid, ask: hasPrice.ask };
      priceMap['GAUTRY'] = { bid: hasPrice.bid, ask: hasPrice.ask };
    }
    livePrices.forEach((p) => {
      priceMap[p.id] = { bid: p.bid, ask: p.ask };
    });

    const updatedAlerts = await Promise.all(
      alerts.map(async (alert) => {
        const currentPriceObj = priceMap[alert.productCode];
        if (!currentPriceObj || !alert.isActive) {
          return alert;
        }

        const currentVal = alert.priceType === 'ask' ? currentPriceObj.ask : currentPriceObj.bid;
        let isNowTriggered = false;

        if (alert.condition === 'GTE' && currentVal >= alert.targetPrice) {
          isNowTriggered = true;
        } else if (alert.condition === 'LTE' && currentVal <= alert.targetPrice) {
          isNowTriggered = true;
        }

        if (isNowTriggered && !alert.isTriggered) {
          // Tetiklendi olarak işaretle
          try {
            const updated = await prisma.priceAlert.update({
              where: { id: alert.id },
              data: {
                isTriggered: true,
                triggeredAt: new Date(),
                lastCheckedPrice: currentVal,
              },
            });
            return updated;
          } catch {
            return { ...alert, isTriggered: true, lastCheckedPrice: currentVal };
          }
        }

        return { ...alert, lastCheckedPrice: currentVal };
      })
    );

    return NextResponse.json(updatedAlerts);
  } catch (error) {
    console.error('[API Alerts] GET Error:', error);
    return NextResponse.json([], { status: 200 });
  }
}

/**
 * POST /api/alerts — Yeni fiyat alarmı oluşturur.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const currentUserDealerId = (session.user as any)?.dealerId || 'merkez';
    const body = await req.json();

    const { productCode, productLabel, targetPrice, priceType, condition, phone, notes } = body;

    if (!productCode || !targetPrice || Number(targetPrice) <= 0) {
      return NextResponse.json({ error: 'Geçerli bir ürün ve hedef fiyat giriniz.' }, { status: 400 });
    }

    const newAlert = await prisma.priceAlert.create({
      data: {
        dealerId: currentUserDealerId,
        productCode: String(productCode),
        productLabel: productLabel || String(productCode),
        targetPrice: Number(targetPrice),
        priceType: priceType === 'ask' ? 'ask' : 'bid',
        condition: condition === 'LTE' ? 'LTE' : 'GTE',
        phone: phone || null,
        notes: notes || null,
        isActive: true,
        isTriggered: false,
      },
    });

    await logActivity({
      dealerId: currentUserDealerId,
      action: 'Fiyat Alarmı Kuruldu',
      details: `${newAlert.productLabel} için ₺${newAlert.targetPrice} (${newAlert.condition === 'GTE' ? '≥' : '≤'}) alarmı oluşturuldu.`,
      userEmail: session.user?.email || '',
      userName: session.user?.name || '',
    });

    return NextResponse.json(newAlert, { status: 201 });
  } catch (error) {
    console.error('[API Alerts] POST Error:', error);
    return NextResponse.json({ error: 'Alarm oluşturulurken hata oluştu.' }, { status: 500 });
  }
}

/**
 * PUT /api/alerts — Fiyat alarmını günceller veya sıfırlar.
 */
export async function PUT(req: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { id, isActive, isTriggered, targetPrice, phone, notes } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID zorunludur.' }, { status: 400 });
    }

    const updateData: any = {};
    if (typeof isActive === 'boolean') updateData.isActive = isActive;
    if (typeof isTriggered === 'boolean') {
      updateData.isTriggered = isTriggered;
      if (!isTriggered) updateData.triggeredAt = null;
    }
    if (targetPrice) updateData.targetPrice = Number(targetPrice);
    if (phone !== undefined) updateData.phone = phone;
    if (notes !== undefined) updateData.notes = notes;

    const updated = await prisma.priceAlert.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('[API Alerts] PUT Error:', error);
    return NextResponse.json({ error: 'Alarm güncellenirken hata oluştu.' }, { status: 500 });
  }
}

/**
 * DELETE /api/alerts — Fiyat alarmını siler.
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
      return NextResponse.json({ error: 'ID zorunludur.' }, { status: 400 });
    }

    await prisma.priceAlert.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[API Alerts] DELETE Error:', error);
    return NextResponse.json({ error: 'Alarm silinirken hata oluştu.' }, { status: 500 });
  }
}
