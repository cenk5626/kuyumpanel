import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedContext } from '@/lib/security/auth-context';
import {
  AML_RISK_LEVEL,
  COMPLIANCE_CASE_STATUS,
  AML_TRIGGER_TYPE,
  COMPLIANCE_MESSAGES,
} from '@/constants/compliance';
import { generateSarDraft } from '@/lib/compliance/aml-engine';

export const dynamic = 'force-dynamic';

/**
 * GET /api/compliance/cases
 * Bayiye ait MASAK uyum ve risk vakalarını listeler.
 */
export async function GET(request: NextRequest) {
  try {
    const ctx = await getAuthenticatedContext();
    const dealerId = ctx.dealerId;

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const riskLevel = searchParams.get('riskLevel');

    const where: any = { dealerId };
    if (status) where.status = status;
    if (riskLevel) where.riskLevel = riskLevel;

    const cases = await prisma.complianceCase.findMany({
      where,
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            phone: true,
            tcNo: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ success: true, cases });
  } catch (error: any) {
    console.error('[API Compliance Cases GET Error]:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Uyum vakaları listelenemedi' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/compliance/cases
 * Yeni bir şüpheli işlem veya uyum vakası kaydeder.
 */
export async function POST(request: NextRequest) {
  try {
    const ctx = await getAuthenticatedContext();
    const dealerId = ctx.dealerId;

    const body = await request.json();
    const {
      customerId,
      customerName,
      customerTcNo,
      customerPhone,
      riskLevel = AML_RISK_LEVEL.HIGH,
      triggerType = AML_TRIGGER_TYPE.MANUAL_SUSPICION,
      detectedAmount = 0,
      description,
      investigationNotes,
    } = body;

    if (!customerName || !description) {
      return NextResponse.json(
        { success: false, error: 'Müşteri adı ve şüphe açıklaması zorunludur' },
        { status: 400 }
      );
    }

    // Yıl ve sayaç bazlı vaka takip numarası üret (Örn: MASAK-2026-0001)
    const currentYear = new Date().getFullYear();
    const caseCount = await prisma.complianceCase.count({ where: { dealerId } });
    const caseNumber = `MASAK-${currentYear}-${String(caseCount + 1).padStart(4, '0')}`;

    // Otomatik ŞİB Taslağı hazırla
    const sarDraft = generateSarDraft({
      caseNumber,
      customerName,
      customerTcNo,
      customerPhone,
      detectedAmount,
      triggerType,
      description,
      createdAt: new Date(),
    });

    const newCase = await prisma.complianceCase.create({
      data: {
        dealerId,
        caseNumber,
        customerId: customerId || null,
        customerName,
        customerTcNo: customerTcNo || null,
        customerPhone: customerPhone || null,
        riskLevel,
        status: COMPLIANCE_CASE_STATUS.OPEN,
        triggerType,
        detectedAmount: Number(detectedAmount) || 0,
        description,
        investigationNotes: investigationNotes || null,
        sarDraft,
      },
    });

    return NextResponse.json({
      success: true,
      case: newCase,
      message: COMPLIANCE_MESSAGES.CASE_CREATED,
    });
  } catch (error: any) {
    console.error('[API Compliance Cases POST Error]:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Uyum vakası oluşturulamadı' },
      { status: 500 }
    );
  }
}
