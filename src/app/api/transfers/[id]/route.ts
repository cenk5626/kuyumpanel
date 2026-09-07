import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedContext, assertTenantOwnership } from '@/lib/security/auth-context';
import { TRANSFER_STATUS } from '@/constants/branch';
import { logActivity } from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function GET(
  _req: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await getAuthenticatedContext();
    const { id } = await props.params;

    const transfer = await prisma.inventoryTransfer.findUnique({
      where: { id },
      include: {
        fromBranch: true,
        toBranch: true,
        lines: true,
      },
    });

    if (!transfer) {
      return NextResponse.json({ error: 'Transfer bulunamadı.' }, { status: 404 });
    }

    assertTenantOwnership(ctx, transfer.dealerId, 'Transfer');

    return NextResponse.json({ transfer });
  } catch (error: any) {
    if (error.message?.includes('Erişim reddedildi')) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json({ error: 'Transfer detayları alınamadı.' }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await getAuthenticatedContext();
    const { id } = await props.params;

    const transfer = await prisma.inventoryTransfer.findUnique({
      where: { id },
      include: { lines: true },
    });

    if (!transfer) {
      return NextResponse.json({ error: 'Transfer bulunamadı.' }, { status: 404 });
    }

    assertTenantOwnership(ctx, transfer.dealerId, 'Transfer');

    if (transfer.status !== TRANSFER_STATUS.DRAFT) {
      return NextResponse.json(
        { error: 'Yalnızca taslak durumundaki transferler silinebilir.' },
        { status: 400 }
      );
    }

    await prisma.$transaction([
      prisma.inventoryTransferLine.deleteMany({ where: { transferId: id } }),
      prisma.inventoryTransfer.delete({ where: { id } }),
    ]);

    await logActivity({
      dealerId: ctx.dealerId,
      userId: ctx.userId,
      action: 'TRANSFER_DELETE',
      details: `${transfer.transferNumber} numaralı taslak transfer silindi.`,
    });

    return NextResponse.json({ success: true, message: 'Transfer silindi.' });
  } catch (error: any) {
    if (error.message?.includes('Erişim reddedildi')) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json({ error: 'Transfer silinirken bir hata oluştu.' }, { status: 500 });
  }
}
