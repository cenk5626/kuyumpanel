import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedContext } from '@/lib/security/auth-context';
import {
  APPROVAL_STATUS,
  APPROVAL_DEFAULTS,
  APPROVAL_REQUEST_TYPE,
  ApprovalRequestType,
  ApprovalUnit,
} from '@/constants/approval';
import {
  determineRequiredLevel,
  buildApprovalSteps,
  formatApprovalWhatsAppNotification,
} from '@/lib/approval/approval-engine';

export const dynamic = 'force-dynamic';

/**
 * GET /api/approvals
 * Bayiye ait onay taleplerini filtreli olarak listeler.
 */
export async function GET(request: NextRequest) {
  try {
    const ctx = await getAuthenticatedContext();
    const dealerId = ctx.dealerId;

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const requestType = searchParams.get('requestType');

    const where: any = { dealerId };
    if (status && status !== 'ALL') {
      where.status = status;
    }
    if (requestType && requestType !== 'ALL') {
      where.requestType = requestType;
    }

    const approvals = await prisma.approvalRequest.findMany({
      where,
      include: {
        steps: {
          orderBy: { stepLevel: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    return NextResponse.json({
      success: true,
      approvals,
    });
  } catch (error: any) {
    console.error('[API Approvals GET Error]:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Onay talepleri listelenemedi' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/approvals
 * Yeni bir onay talebi oluşturur ve gerekli onay adımlarını başlatır.
 */
export async function POST(request: NextRequest) {
  try {
    const ctx = await getAuthenticatedContext();
    const dealerId = ctx.dealerId;

    const body = await request.json();
    const {
      requestType,
      title,
      description,
      amount,
      unit = APPROVAL_DEFAULTS.DEFAULT_UNIT,
      payload,
    } = body;

    if (!requestType || !title) {
      return NextResponse.json(
        { success: false, error: 'Talep türü ve başlık zorunludur' },
        { status: 400 }
      );
    }

    // Gerekli kademe seviyesini hesapla
    const requiredLevel = determineRequiredLevel(
      requestType as ApprovalRequestType,
      amount ? Number(amount) : undefined,
      unit as ApprovalUnit
    );

    const stepTemplates = buildApprovalSteps(requiredLevel);

    // Veritabanı kaydı
    const approval = await prisma.approvalRequest.create({
      data: {
        dealerId,
        requestType,
        status: APPROVAL_STATUS.PENDING,
        requiredLevel,
        currentLevel: APPROVAL_DEFAULTS.INITIAL_CURRENT_LEVEL,
        title,
        description: description || null,
        amount: amount !== undefined && amount !== null ? Number(amount) : null,
        unit,
        payload: payload ? (typeof payload === 'string' ? payload : JSON.stringify(payload)) : null,
        requesterId: ctx.userId || ctx.userEmail,
        requesterName: ctx.userName || ctx.userEmail.split('@')[0],
        requesterEmail: ctx.userEmail,
        steps: {
          create: stepTemplates.map((s) => ({
            stepLevel: s.stepLevel,
            requiredRole: s.requiredRole,
            status: s.status,
          })),
        },
      },
      include: {
        steps: {
          orderBy: { stepLevel: 'asc' },
        },
      },
    });

    const notificationMessage = formatApprovalWhatsAppNotification({
      id: approval.id,
      title: approval.title,
      requestType: approval.requestType as ApprovalRequestType,
      amount: approval.amount ?? undefined,
      unit: approval.unit ?? undefined,
      requesterName: approval.requesterName,
      requiredLevel: approval.requiredLevel,
    });

    return NextResponse.json({
      success: true,
      approval,
      notificationMessage,
    });
  } catch (error: any) {
    console.error('[API Approvals POST Error]:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Onay talebi oluşturulamadı' },
      { status: 500 }
    );
  }
}
