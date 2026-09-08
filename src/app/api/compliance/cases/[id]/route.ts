import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedContext } from '@/lib/security/auth-context';
import {
  COMPLIANCE_CASE_STATUS,
  COMPLIANCE_MESSAGES,
} from '@/constants/compliance';

export const dynamic = 'force-dynamic';

/**
 * GET /api/compliance/cases/[id]
 * Belirli bir uyum vakasının detaylarını getirir.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await getAuthenticatedContext();
    const dealerId = ctx.dealerId;
    const { id } = await params;

    const complianceCase = await prisma.complianceCase.findFirst({
      where: { id, dealerId },
      include: {
        customer: true,
      },
    });

    if (!complianceCase) {
      return NextResponse.json(
        { success: false, error: COMPLIANCE_MESSAGES.ERR_NOT_FOUND },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, case: complianceCase });
  } catch (error: any) {
    console.error('[API Compliance Case GET Error]:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Vaka detayları alınamadı' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/compliance/cases/[id]
 * Vaka durumunu günceller veya inceleme notları ekler.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await getAuthenticatedContext();
    const dealerId = ctx.dealerId;
    const { id } = await params;

    const existingCase = await prisma.complianceCase.findFirst({
      where: { id, dealerId },
    });

    if (!existingCase) {
      return NextResponse.json(
        { success: false, error: COMPLIANCE_MESSAGES.ERR_NOT_FOUND },
        { status: 404 }
      );
    }

    const body = await request.json();
    const {
      status,
      investigationNotes,
      sarDraft,
      reviewedBy,
      reportedBy,
    } = body;

    const updateData: any = {};
    if (status) {
      updateData.status = status;
      if (status === COMPLIANCE_CASE_STATUS.REPORTED_TO_MASAK) {
        updateData.reportedToMasakAt = new Date();
        updateData.reportedBy = reportedBy || ctx.userName || 'Uyum Sorumlusu';
      }
    }

    if (investigationNotes !== undefined) {
      updateData.investigationNotes = investigationNotes;
    }

    if (sarDraft !== undefined) {
      updateData.sarDraft = sarDraft;
    }

    if (reviewedBy !== undefined) {
      updateData.reviewedBy = reviewedBy;
    }

    const updatedCase = await prisma.complianceCase.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      case: updatedCase,
      message: COMPLIANCE_MESSAGES.CASE_UPDATED,
    });
  } catch (error: any) {
    console.error('[API Compliance Case PATCH Error]:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Vaka güncellenemedi' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/compliance/cases/[id]
 * Yalnızca reddedilen/kapatılan vakaları temizler.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await getAuthenticatedContext();
    const dealerId = ctx.dealerId;
    const { id } = await params;

    const existingCase = await prisma.complianceCase.findFirst({
      where: { id, dealerId },
    });

    if (!existingCase) {
      return NextResponse.json(
        { success: false, error: COMPLIANCE_MESSAGES.ERR_NOT_FOUND },
        { status: 404 }
      );
    }

    await prisma.complianceCase.delete({ where: { id } });

    return NextResponse.json({ success: true, message: 'Vaka silindi' });
  } catch (error: any) {
    console.error('[API Compliance Case DELETE Error]:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Vaka silinemedi' },
      { status: 500 }
    );
  }
}
