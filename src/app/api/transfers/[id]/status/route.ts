import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedContext, assertTenantOwnership } from '@/lib/security/auth-context';
import { TRANSFER_STATUS } from '@/constants/branch';
import { logActivity } from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function POST(
  req: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await getAuthenticatedContext();
    const dealerId = ctx.dealerId;
    const { id } = await props.params;

    const body = await req.json();
    const { action, discrepancyNotes, notes } = body;

    const transfer = await prisma.inventoryTransfer.findUnique({
      where: { id },
      include: {
        lines: true,
        fromBranch: true,
        toBranch: true,
      },
    });

    if (!transfer) {
      return NextResponse.json({ error: 'Transfer bulunamadi.' }, { status: 404 });
    }
    assertTenantOwnership(ctx, transfer.dealerId, 'Transfer');

    // 1. ONAYLAMA (APPROVE)
    if (action === 'APPROVE') {
      if (transfer.status !== TRANSFER_STATUS.DRAFT) {
        return NextResponse.json(
          { error: `Yalnizca Taslak transferler onaylanabilir. Mevcut durum: ${transfer.status}` },
          { status: 400 }
        );
      }

      const updated = await prisma.inventoryTransfer.update({
        where: { id },
        data: {
          status: TRANSFER_STATUS.APPROVED,
          approvedBy: ctx.userName,
        },
      });

      return NextResponse.json(updated);
    }

    // 2. SEVK ETME / YOLA CIKARMA (SHIP)
    if (action === 'SHIP') {
      if (transfer.status !== TRANSFER_STATUS.APPROVED && transfer.status !== TRANSFER_STATUS.DRAFT) {
        return NextResponse.json(
          { error: `Yalnizca Taslak veya Onayli transferler sevk edilebilir. Mevcut durum: ${transfer.status}` },
          { status: 400 }
        );
      }

      const updated = await prisma.$transaction(async (tx) => {
        const itemIds = transfer.lines
          .map((l) => l.productItemId)
          .filter(Boolean) as string[];

        if (itemIds.length > 0) {
          await tx.productItem.updateMany({
            where: { id: { in: itemIds }, dealerId },
            data: { status: 'IN_TRANSFER' },
          });
        }

        return tx.inventoryTransfer.update({
          where: { id },
          data: {
            status: TRANSFER_STATUS.SHIPPED,
            shippedAt: new Date(),
            approvedBy: transfer.approvedBy || ctx.userName,
            notes: notes ? String(notes).trim() : transfer.notes,
          },
          include: { lines: true, fromBranch: true, toBranch: true },
        });
      });

      await logActivity({
        dealerId,
        action: 'Transfer Sevk Edildi',
        details: `${transfer.transferNumber} nolu sevkiyat yola cikarildi.`,
        userEmail: ctx.userEmail,
        userName: ctx.userName,
      }).catch(() => {});

      return NextResponse.json(updated);
    }

    // 3. TESLIM ALMA / KABUL (RECEIVE)
    if (action === 'RECEIVE') {
      if (transfer.status !== TRANSFER_STATUS.SHIPPED) {
        return NextResponse.json(
          { error: `Yalnizca Sevk edilmis transferler teslim alinabilir. Mevcut durum: ${transfer.status}` },
          { status: 400 }
        );
      }

      const updated = await prisma.$transaction(async (tx) => {
        const itemIds = transfer.lines
          .map((l) => l.productItemId)
          .filter(Boolean) as string[];

        if (itemIds.length > 0) {
          await tx.productItem.updateMany({
            where: { id: { in: itemIds }, dealerId },
            data: {
              branchId: transfer.toBranchId,
              status: 'IN_STOCK',
            },
          });
        }

        return tx.inventoryTransfer.update({
          where: { id },
          data: {
            status: TRANSFER_STATUS.RECEIVED,
            receivedAt: new Date(),
            discrepancyNotes: discrepancyNotes ? String(discrepancyNotes).trim() : null,
          },
          include: { lines: true, fromBranch: true, toBranch: true },
        });
      });

      await logActivity({
        dealerId,
        action: 'Transfer Teslim Alindi',
        details: `${transfer.transferNumber} nolu transfer ${transfer.toBranch.name} tarafindan teslim alindi.`,
        userEmail: ctx.userEmail,
        userName: ctx.userName,
      }).catch(() => {});

      return NextResponse.json(updated);
    }

    // 4. IPTAL / RET (CANCEL veya REJECT)
    if (action === 'CANCEL' || action === 'REJECT') {
      if (transfer.status === TRANSFER_STATUS.RECEIVED) {
        return NextResponse.json(
          { error: 'Teslim alinmis transfer iptal veya reddedilemez.' },
          { status: 400 }
        );
      }

      const targetStatus = action === 'CANCEL' ? TRANSFER_STATUS.CANCELLED : TRANSFER_STATUS.REJECTED;

      const updated = await prisma.$transaction(async (tx) => {
        const itemIds = transfer.lines
          .map((l) => l.productItemId)
          .filter(Boolean) as string[];

        if (itemIds.length > 0) {
          await tx.productItem.updateMany({
            where: { id: { in: itemIds }, dealerId },
            data: {
              branchId: transfer.fromBranchId,
              status: 'IN_STOCK',
            },
          });
        }

        return tx.inventoryTransfer.update({
          where: { id },
          data: {
            status: targetStatus,
            discrepancyNotes: discrepancyNotes ? String(discrepancyNotes).trim() : transfer.discrepancyNotes,
          },
          include: { lines: true, fromBranch: true, toBranch: true },
        });
      });

      await logActivity({
        dealerId,
        action: action === 'CANCEL' ? 'Transfer Iptal Edildi' : 'Transfer Reddedildi',
        details: `${transfer.transferNumber} nolu transfer ${action === 'CANCEL' ? 'iptal edildi' : 'reddedildi'}. Urunler ${transfer.fromBranch.name} stoguna geri alindi.`,
        userEmail: ctx.userEmail,
        userName: ctx.userName,
      }).catch(() => {});

      return NextResponse.json(updated);
    }

    return NextResponse.json({ error: 'Gecersiz eylem.' }, { status: 400 });
  } catch (error: any) {
    console.error('[API Transfers Status] POST Error:', error);
    return NextResponse.json(
      { error: error?.message || 'Transfer durumu guncellenemedi.' },
      { status: error?.statusCode || 500 }
    );
  }
}
