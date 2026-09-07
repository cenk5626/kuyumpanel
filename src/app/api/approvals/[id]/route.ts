import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedContext } from '@/lib/security/auth-context';
import {
  APPROVAL_STATUS,
  APPROVAL_ERRORS,
} from '@/constants/approval';
import {
  validateApprovalAction,
  calculateNextApprovalState,
} from '@/lib/approval/approval-engine';

export const dynamic = 'force-dynamic';

/**
 * GET /api/approvals/[id]
 * Onay talebinin detayını ve tüm adımlarını getirir.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await getAuthenticatedContext();
    const dealerId = ctx.dealerId;
    const { id } = await params;

    const approval = await prisma.approvalRequest.findFirst({
      where: { id, dealerId },
      include: {
        steps: {
          orderBy: { stepLevel: 'asc' },
        },
      },
    });

    if (!approval) {
      return NextResponse.json(
        { success: false, error: APPROVAL_ERRORS.REQUEST_NOT_FOUND },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      approval,
    });
  } catch (error: any) {
    console.error('[API Approvals Detail GET Error]:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Onay talebi detayı alınamadı' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/approvals/[id]
 * Onay veya Red işlemini gerçekleştirir.
 * Body: { action: 'APPROVE' | 'REJECT' | 'CANCEL', note?: string, rejectionReason?: string }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await getAuthenticatedContext();
    const dealerId = ctx.dealerId;
    const { id } = await params;

    const body = await request.json();
    const { action, note, rejectionReason } = body;

    const approval = await prisma.approvalRequest.findFirst({
      where: { id, dealerId },
      include: {
        steps: {
          orderBy: { stepLevel: 'asc' },
        },
      },
    });

    if (!approval) {
      return NextResponse.json(
        { success: false, error: APPROVAL_ERRORS.REQUEST_NOT_FOUND },
        { status: 404 }
      );
    }

    // İptal eylemi (Talebi oluşturan veya ADMIN/SUPER_ADMIN iptal edebilir)
    if (action === 'CANCEL') {
      if (approval.status !== APPROVAL_STATUS.PENDING) {
        return NextResponse.json(
          { success: false, error: APPROVAL_ERRORS.ALREADY_RESOLVED },
          { status: 400 }
        );
      }

      const updated = await prisma.approvalRequest.update({
        where: { id },
        data: {
          status: APPROVAL_STATUS.CANCELLED,
          resolvedAt: new Date(),
        },
      });

      return NextResponse.json({ success: true, approval: updated });
    }

    if (action !== 'APPROVE' && action !== 'REJECT') {
      return NextResponse.json(
        { success: false, error: 'Geçersiz işlem türü (APPROVE veya REJECT olmalı)' },
        { status: 400 }
      );
    }

    // Doğrulama & 4-Göz Prensibi & Rol Kontrolü
    const validation = validateApprovalAction(
      {
        status: approval.status,
        requesterId: approval.requesterId,
        requesterEmail: approval.requesterEmail,
        currentLevel: approval.currentLevel,
        requiredLevel: approval.requiredLevel,
      },
      {
        id: ctx.userId || ctx.userEmail,
        name: ctx.userName,
        email: ctx.userEmail,
        role: ctx.role,
      },
      action,
      rejectionReason
    );

    if (!validation.valid) {
      return NextResponse.json(
        { success: false, error: validation.error },
        { status: 400 }
      );
    }

    // Mevcut aktif adımı bul
    const activeStep = approval.steps.find((s) => s.stepLevel === approval.currentLevel);
    if (!activeStep) {
      return NextResponse.json(
        { success: false, error: APPROVAL_ERRORS.INVALID_STEP },
        { status: 400 }
      );
    }

    // Sonraki durumu hesapla
    const nextState = calculateNextApprovalState(
      approval.currentLevel,
      approval.requiredLevel,
      action
    );

    // Veritabanı güncellemesi (Transaction içinde)
    const result = await prisma.$transaction(async (tx) => {
      // 1. Aktif adımı güncelle
      await tx.approvalStep.update({
        where: { id: activeStep.id },
        data: {
          status: action === 'APPROVE' ? APPROVAL_STATUS.APPROVED : APPROVAL_STATUS.REJECTED,
          approverId: ctx.userId || ctx.userEmail,
          approverName: ctx.userName || ctx.userEmail.split('@')[0],
          approverEmail: ctx.userEmail,
          note: note || rejectionReason || null,
          actionAt: new Date(),
        },
      });

      // 2. Talebi güncelle
      const updatedRequest = await tx.approvalRequest.update({
        where: { id },
        data: {
          status: nextState.newStatus,
          currentLevel: nextState.nextLevel,
          rejectionReason: action === 'REJECT' ? rejectionReason : null,
          resolvedAt: nextState.newStatus !== APPROVAL_STATUS.PENDING ? new Date() : null,
        },
        include: {
          steps: {
            orderBy: { stepLevel: 'asc' },
          },
        },
      });

      return updatedRequest;
    });

    return NextResponse.json({
      success: true,
      approval: result,
      isFullyApproved: nextState.isFullyApproved,
    });
  } catch (error: any) {
    console.error('[API Approvals Action POST Error]:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Onay işlemi tamamlanamadı' },
      { status: 500 }
    );
  }
}
