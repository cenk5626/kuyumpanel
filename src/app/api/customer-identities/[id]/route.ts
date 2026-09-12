import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthenticatedContext } from '@/lib/security/auth-context';
import { IDENTITY_STATUS } from '@/constants/identity-vault';
import { logActivity } from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await getAuthenticatedContext();
    const dealerId = ctx.dealerId;
    const { id } = await params;

    const existing = await prisma.customerIdentity.findFirst({
      where: { id, dealerId },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Kimlik kaydı bulunamadı.' }, { status: 404 });
    }

    const body = await req.json();
    const { status, retentionUntil, legalBasisOrConsentReference } = body;

    const updateData: any = { updatedBy: ctx.userName || ctx.userId };
    if (status !== undefined) updateData.status = status;
    if (retentionUntil !== undefined) updateData.retentionUntil = new Date(retentionUntil);
    if (legalBasisOrConsentReference !== undefined) {
      updateData.legalBasisOrConsentReference = legalBasisOrConsentReference;
    }

    const updated = await prisma.customerIdentity.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        maskedTcNo: true,
        purpose: true,
        status: true,
        retentionUntil: true,
        updatedAt: true,
      },
    });

    await logActivity({
      dealerId,
      userId: ctx.userId,
      action: 'CUSTOMER_IDENTITY_UPDATE',
      details: `${existing.firstName} ${existing.lastName} (${existing.maskedTcNo}) kimlik kaydı güncellendi (Durum: ${updated.status}).`,
    });

    return NextResponse.json({ success: true, identity: updated });
  } catch (error: any) {
    if (error.statusCode === 401 || error.statusCode === 403) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error('[API Customer Identity Detail] PATCH Error:', error);
    return NextResponse.json({ error: 'Kimlik kaydı güncellenemedi.' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await getAuthenticatedContext();
    const dealerId = ctx.dealerId;
    const { id } = await params;

    const existing = await prisma.customerIdentity.findFirst({
      where: { id, dealerId },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Kimlik kaydı bulunamadı.' }, { status: 404 });
    }

    let destroyReason = 'KVKK / Süre Aşımı İmhası';
    try {
      const body = await req.json();
      if (body.reason) destroyReason = body.reason;
    } catch {}

    // Güvenli imha: Statüyü DESTROYED yap veya tamamen sil
    await prisma.customerIdentity.update({
      where: { id },
      data: {
        status: IDENTITY_STATUS.DESTROYED,
        updatedBy: ctx.userName || ctx.userId,
      },
    });

    await logActivity({
      dealerId,
      userId: ctx.userId,
      action: 'CUSTOMER_IDENTITY_DESTROYED',
      details: `${existing.firstName} ${existing.lastName} (${existing.maskedTcNo}) kimlik kaydı imha edildi. Gerekçe: ${destroyReason}`,
    });

    return NextResponse.json({ success: true, status: IDENTITY_STATUS.DESTROYED });
  } catch (error: any) {
    if (error.statusCode === 401 || error.statusCode === 403) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error('[API Customer Identity Detail] DELETE Error:', error);
    return NextResponse.json({ error: 'Kimlik kaydı silinemedi.' }, { status: 500 });
  }
}
