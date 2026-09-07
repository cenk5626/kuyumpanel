import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedContext, assertTenantOwnership } from '@/lib/security/auth-context';
import { DISCREPANCY_STATUS } from '@/constants/forex';
import { logActivity } from '@/lib/logger';
import { sanitizeBody } from '@/lib/security/validation';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const ctx = await getAuthenticatedContext();
    const dealerId = ctx.dealerId;

    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get('sessionId');
    const status = searchParams.get('status');

    const whereClause: any = { dealerId };
    if (sessionId) whereClause.sessionId = sessionId;
    if (status && status !== 'ALL') whereClause.status = status;

    const logs = await prisma.cashDiscrepancyLog.findMany({
      where: whereClause,
      include: {
        session: {
          select: { id: true, sessionNumber: true, status: true, openedAt: true, closedAt: true },
        },
        branch: {
          select: { id: true, name: true, code: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    return NextResponse.json({ logs });
  } catch (error: any) {
    if (error.statusCode === 401 || error.statusCode === 403) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error('[API Discrepancies] GET Error:', error);
    return NextResponse.json({ error: 'Kasa farkı kayıtları alınamadı.' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const ctx = await getAuthenticatedContext();
    const dealerId = ctx.dealerId;

    const rawBody = await req.json();
    const body = sanitizeBody(rawBody, [
      'id',
      'action',
      'sessionId',
      'currency',
      'systemAmount',
      'countedAmount',
      'diffAmount',
      'explanation',
      'branchId',
    ] as const);

    const { id, action, explanation } = body;

    // Eğer var olan bir fark logunun onayı/reddi isteniyorsa
    if (id && (action === 'APPROVE' || action === 'REJECT' || action === 'RESOLVE')) {
      const existing = await prisma.cashDiscrepancyLog.findUnique({
        where: { id },
      });
      if (!existing) {
        return NextResponse.json({ error: 'Kasa farkı kaydı bulunamadı.' }, { status: 404 });
      }
      assertTenantOwnership(ctx, existing.dealerId, 'CashDiscrepancyLog');

      const targetStatus =
        action === 'APPROVE'
          ? DISCREPANCY_STATUS.APPROVED
          : action === 'REJECT'
          ? DISCREPANCY_STATUS.REJECTED
          : DISCREPANCY_STATUS.RESOLVED;

      const updated = await prisma.cashDiscrepancyLog.update({
        where: { id },
        data: {
          status: targetStatus,
          explanation: explanation !== undefined ? explanation : existing.explanation,
          reviewedBy: ctx.userName,
          approvedBy: action === 'APPROVE' ? ctx.userName : existing.approvedBy,
        },
      });

      await logActivity({
        dealerId,
        userId: ctx.userId,
        action: 'CASH_DISCREPANCY_REVIEW',
        details: `${existing.currency} para birimindeki ${existing.diffAmount} tutarındaki sayım farkı "${targetStatus}" olarak güncellendi.`,
      });

      return NextResponse.json({ success: true, log: updated });
    }

    // Yeni Fark Kaydı Oluşturma
    const { sessionId, currency, systemAmount, countedAmount, diffAmount, branchId } = body;

    if (!sessionId || !currency) {
      return NextResponse.json({ error: 'Oturum ve para birimi bilgisi zorunludur.' }, { status: 400 });
    }

    const newLog = await prisma.cashDiscrepancyLog.create({
      data: {
        dealerId,
        branchId: branchId || null,
        sessionId,
        currency,
        systemAmount: Number(systemAmount) || 0,
        countedAmount: Number(countedAmount) || 0,
        diffAmount: Number(diffAmount) || 0,
        status: DISCREPANCY_STATUS.PENDING,
        explanation: explanation ? String(explanation).trim() : null,
      },
    });

    await logActivity({
      dealerId,
      userId: ctx.userId,
      action: 'CASH_DISCREPANCY_LOGGED',
      details: `${currency} için ${diffAmount} sayım farkı izahatı kaydedildi: "${explanation || 'İzahat belirtilmedi'}".`,
    });

    return NextResponse.json({ success: true, log: newLog }, { status: 201 });
  } catch (error: any) {
    if (error.statusCode === 401 || error.statusCode === 403) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error('[API Discrepancies] POST Error:', error);
    return NextResponse.json(
      { error: error?.message || 'Kasa farkı kaydı işlenemedi.' },
      { status: 500 }
    );
  }
}
