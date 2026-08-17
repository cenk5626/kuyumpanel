import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { logActivity } from '@/lib/logger';
import {
  SESSION_STATUS,
  CASH_MOVEMENT_TYPES,
  CASH_MOVEMENT_CATEGORIES,
  CASH_CURRENCIES,
  PAYMENT_METHODS,
  DISCREPANCY_STATUS,
} from '@/constants/kasa';
import { calculateSessionMetrics, formatThermalReceiptText } from '@/lib/z-report';

const LOG_PREFIX = '[API Z-Report Session]';

/**
 * GET /api/z-report/session — Aktif açık oturumu veya son oturumları getirir
 */
export async function GET() {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const dealerId = (session.user as any).dealerId || 'merkez';

    const activeSession = await prisma.cashRegisterSession.findFirst({
      where: {
        dealerId,
        status: SESSION_STATUS.OPEN,
      },
      include: {
        movements: {
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: { openedAt: 'desc' },
    });

    let activeMetrics = null;
    if (activeSession) {
      activeMetrics = await calculateSessionMetrics(activeSession, dealerId);
    }

    return NextResponse.json({
      activeSession: activeMetrics,
    });
  } catch (error) {
    console.error(`${LOG_PREFIX} GET Error:`, error);
    return NextResponse.json({ error: 'Kasa oturumu alınamadı.' }, { status: 500 });
  }
}

/**
 * POST /api/z-report/session — Kasa Açılışı (open), Kasa Kapanışı (close) veya Manuel Hareket (movement)
 */
export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const dealerId = (session.user as any).dealerId || 'merkez';
    const userName = (session.user as any).name || (session.user as any).email || 'Kasiyer';
    const body = await req.json();

    const action = body.action || 'open';

    // ─── 1. KASA AÇILIŞI (ACTION: OPEN) ───
    if (action === 'open') {
      const existingOpen = await prisma.cashRegisterSession.findFirst({
        where: {
          dealerId,
          status: SESSION_STATUS.OPEN,
        },
      });

      if (existingOpen) {
        return NextResponse.json(
          {
            error: 'Zaten açık bir kasa oturumu bulunmaktadır. Yeni kasa açmadan önce mevcut kasayı kapatmalısınız.',
            sessionId: existingOpen.id,
          },
          { status: 400 }
        );
      }

      const openingCashTL = parseFloat(body.openingCashTL ?? body.openingCash ?? 0) || 0;
      const openingCashUSD = parseFloat(body.openingCashUSD ?? 0) || 0;
      const openingCashEUR = parseFloat(body.openingCashEUR ?? 0) || 0;
      const openingHasGram = parseFloat(body.openingHasGram ?? 0) || 0;
      const openedBy = (body.openedBy || userName).trim();
      const notes = body.notes ? String(body.notes).trim() : null;

      if (openingCashTL < 0 || openingCashUSD < 0 || openingCashEUR < 0 || openingHasGram < 0) {
        return NextResponse.json({ error: 'Açılış tutarları negatif olamaz.' }, { status: 400 });
      }

      // Rapor / Oturum Numarası Oluşturma (Z-YYYY-XXXX)
      const currentYear = new Date().getFullYear();
      const countThisYear = await prisma.cashRegisterSession.count({
        where: {
          dealerId,
          openedAt: {
            gte: new Date(currentYear, 0, 1),
          },
        },
      });
      const sessionNumber = `Z-${currentYear}-${String(countThisYear + 1).padStart(4, '0')}`;

      const newSession = await prisma.$transaction(async (tx) => {
        const created = await tx.cashRegisterSession.create({
          data: {
            sessionNumber,
            dealerId,
            status: SESSION_STATUS.OPEN,
            openedBy,
            openingCash: openingCashTL,
            openingCashTL,
            openingCashUSD,
            openingCashEUR,
            openingHasGram,
            systemCash: openingCashTL,
            systemCashTL: openingCashTL,
            notes,
          },
        });

        // Açılış devri için ilk hareket
        if (openingCashTL > 0) {
          await tx.cashMovement.create({
            data: {
              sessionId: created.id,
              dealerId,
              type: CASH_MOVEMENT_TYPES.INFLOW,
              category: CASH_MOVEMENT_CATEGORIES.CAPITAL,
              paymentMethod: PAYMENT_METHODS.CASH,
              amount: openingCashTL,
              currency: CASH_CURRENCIES.TL,
              description: `Açılış Devir Kasası Girişi (${sessionNumber})`,
              employeeName: openedBy,
            },
          });
        }

        return created;
      });

      await logActivity({
        dealerId,
        action: 'Kasa Açılışı',
        details: `Kasa Açıldı: ${sessionNumber} - Açılış Kasası: ₺${openingCashTL.toLocaleString('tr-TR')} (Açan: ${openedBy})`,
        userEmail: session.user?.email,
        userName: session.user?.name,
      });

      const metrics = await calculateSessionMetrics(newSession, dealerId);
      return NextResponse.json({ success: true, session: metrics });
    }

    // ─── 2. KASA KAPANIŞI VE Z-RAPORU ALMA (ACTION: CLOSE) ───
    if (action === 'close') {
      let targetSession = null;
      if (body.sessionId) {
        targetSession = await prisma.cashRegisterSession.findUnique({
          where: { id: body.sessionId },
        });
      } else {
        targetSession = await prisma.cashRegisterSession.findFirst({
          where: { dealerId, status: SESSION_STATUS.OPEN },
          orderBy: { openedAt: 'desc' },
        });
      }

      if (!targetSession || targetSession.status !== SESSION_STATUS.OPEN) {
        return NextResponse.json(
          { error: 'Kapatılacak açık bir kasa oturumu bulunamadı.' },
          { status: 400 }
        );
      }

      const countedCashTL = parseFloat(body.countedCashTL ?? body.countedCash ?? 0);
      const countedCashUSD = body.countedCashUSD != null ? parseFloat(body.countedCashUSD) : null;
      const countedCashEUR = body.countedCashEUR != null ? parseFloat(body.countedCashEUR) : null;
      const countedHasGram = body.countedHasGram != null ? parseFloat(body.countedHasGram) : null;
      const closedBy = (body.closedBy || userName).trim();
      const closeNotes = body.notes ? String(body.notes).trim() : targetSession.notes;

      if (isNaN(countedCashTL) || countedCashTL < 0) {
        return NextResponse.json({ error: 'Geçersiz fiili sayılan nakit tutarı.' }, { status: 400 });
      }

      // Sistem metriklerini hesapla
      const metrics = await calculateSessionMetrics(targetSession, dealerId);
      const discrepancyTL = Number((countedCashTL - metrics.systemCashTL).toFixed(2));

      let diffUSD: number | null = null;
      if (countedCashUSD != null) diffUSD = Number((countedCashUSD - metrics.systemCashUSD).toFixed(2));

      let diffEUR: number | null = null;
      if (countedCashEUR != null) diffEUR = Number((countedCashEUR - metrics.systemCashEUR).toFixed(2));

      let diffHas: number | null = null;
      if (countedHasGram != null) diffHas = Number((countedHasGram - metrics.systemHasGram).toFixed(3));

      // Oturumu kapat
      const closedSession = await prisma.$transaction(async (tx) => {
        const updated = await tx.cashRegisterSession.update({
          where: { id: targetSession.id },
          data: {
            status: SESSION_STATUS.CLOSED,
            closedAt: new Date(),
            closedBy,
            systemCash: metrics.systemCashTL,
            systemCashTL: metrics.systemCashTL,
            systemCashUSD: metrics.systemCashUSD,
            systemCashEUR: metrics.systemCashEUR,
            systemHasGram: metrics.systemHasGram,
            systemCardTL: metrics.cardSales,
            countedCash: countedCashTL,
            countedCashTL,
            countedCashUSD,
            countedCashEUR,
            countedHasGram,
            closingCash: countedCashTL,
            discrepancy: discrepancyTL,
            diffCashTL: discrepancyTL,
            diffCashUSD: diffUSD,
            diffCashEUR: diffEUR,
            diffHasGram: diffHas,
            notes: closeNotes,
          },
        });

        // Fark varsa düzeltme hareketi oluştur
        if (Math.abs(discrepancyTL) > 0.01) {
          await tx.cashMovement.create({
            data: {
              sessionId: updated.id,
              dealerId,
              type: discrepancyTL > 0 ? CASH_MOVEMENT_TYPES.INFLOW : CASH_MOVEMENT_TYPES.OUTFLOW,
              category: CASH_MOVEMENT_CATEGORIES.CORRECTION,
              paymentMethod: PAYMENT_METHODS.CASH,
              amount: Math.abs(discrepancyTL),
              currency: CASH_CURRENCIES.TL,
              description: `Kasa Kapanış Mutabakat Farkı (${discrepancyTL > 0 ? '+' : ''}${discrepancyTL} TL) - ${
                discrepancyTL > 0 ? 'Kasa Fazlası' : 'Kasa Eksiği'
              }`,
              employeeName: closedBy,
            },
          });
        }

        return updated;
      });

      const updatedMetrics = await calculateSessionMetrics(closedSession, dealerId);
      const receiptSlip = formatThermalReceiptText(updatedMetrics, false);

      await logActivity({
        dealerId,
        action: 'Kasa Kapatma & Z-Raporu',
        details: `Kasa Kapatıldı: ${closedSession.sessionNumber} - Ciro: ₺${updatedMetrics.totalTurnover.toLocaleString(
          'tr-TR'
        )}, Beklenen: ₺${updatedMetrics.systemCashTL.toLocaleString(
          'tr-TR'
        )}, Sayılan: ₺${countedCashTL.toLocaleString('tr-TR')}, Fark: ₺${discrepancyTL.toLocaleString(
          'tr-TR'
        )} (${updatedMetrics.discrepancyStatus}) (Kapatan: ${closedBy})`,
        userEmail: session.user?.email,
        userName: session.user?.name,
      });

      return NextResponse.json({
        success: true,
        session: updatedMetrics,
        receiptSlip,
      });
    }

    // ─── 3. MANUEL KASA HAREKETİ (ACTION: MOVEMENT) ───
    if (action === 'movement') {
      const activeSession = await prisma.cashRegisterSession.findFirst({
        where: { dealerId, status: SESSION_STATUS.OPEN },
        orderBy: { openedAt: 'desc' },
      });

      if (!activeSession) {
        return NextResponse.json(
          { error: 'Kasa hareketi eklemek için önce bir kasa oturumu açmalısınız.' },
          { status: 400 }
        );
      }

      const movementType = body.type === 'INFLOW' ? CASH_MOVEMENT_TYPES.INFLOW : CASH_MOVEMENT_TYPES.OUTFLOW;
      const category = body.category || (movementType === CASH_MOVEMENT_TYPES.INFLOW ? CASH_MOVEMENT_CATEGORIES.CAPITAL : CASH_MOVEMENT_CATEGORIES.EXPENSE);
      const amount = parseFloat(body.amount);
      const currency = body.currency || CASH_CURRENCIES.TL;
      const description = String(body.description || '').trim();
      const employeeName = (body.employeeName || userName).trim();

      if (isNaN(amount) || amount <= 0) {
        return NextResponse.json({ error: 'Geçersiz hareket tutarı.' }, { status: 400 });
      }

      if (!description) {
        return NextResponse.json({ error: 'Hareket açıklaması zorunludur.' }, { status: 400 });
      }

      const movement = await prisma.cashMovement.create({
        data: {
          sessionId: activeSession.id,
          dealerId,
          type: movementType,
          category,
          paymentMethod: PAYMENT_METHODS.CASH,
          amount,
          currency,
          description,
          employeeName,
        },
      });

      await logActivity({
        dealerId,
        action: movementType === CASH_MOVEMENT_TYPES.INFLOW ? 'Kasa Manuel Giriş' : 'Kasa Manuel Çıkış',
        details: `${description} - Tutar: ${amount.toLocaleString('tr-TR')} ${currency} (Personel: ${employeeName})`,
        userEmail: session.user?.email,
        userName: session.user?.name,
      });

      const updatedMetrics = await calculateSessionMetrics(activeSession, dealerId);
      return NextResponse.json({ success: true, movement, session: updatedMetrics });
    }

    return NextResponse.json({ error: 'Geçersiz işlem tipi.' }, { status: 400 });
  } catch (error) {
    console.error(`${LOG_PREFIX} POST Error:`, error);
    return NextResponse.json(
      {
        error: 'Kasa oturum işlemi gerçekleştirilemedi.',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
