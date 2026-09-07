import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedContext, assertTenantOwnership } from '@/lib/security/auth-context';
import { TRANSFER_STATUS, BRANCH_DEFAULTS, TRANSFER_LIMITS } from '@/constants/branch';
import { logActivity } from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const ctx = await getAuthenticatedContext();
    const dealerId = ctx.dealerId;

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const branchId = searchParams.get('branchId');

    const where: any = { dealerId };
    if (status) where.status = status;
    if (branchId) {
      where.OR = [{ fromBranchId: branchId }, { toBranchId: branchId }];
    }

    const transfers = await prisma.inventoryTransfer.findMany({
      where,
      include: {
        fromBranch: { select: { id: true, name: true, code: true } },
        toBranch: { select: { id: true, name: true, code: true } },
        lines: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    return NextResponse.json(transfers);
  } catch (error: any) {
    console.error('[API Transfers] GET Error:', error);
    return NextResponse.json(
      { error: error?.message || 'Transferler alınamadı.' },
      { status: error?.statusCode || 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const ctx = await getAuthenticatedContext();
    const dealerId = ctx.dealerId;

    const body = await req.json();
    const { fromBranchId, toBranchId, notes, lines, autoApprove } = body;

    if (!fromBranchId || !toBranchId) {
      return NextResponse.json(
        { error: 'Kaynak ve hedef şube seçilmelidir.' },
        { status: 400 }
      );
    }

    if (fromBranchId === toBranchId) {
      return NextResponse.json(
        { error: 'Kaynak ve hedef şube aynı olamaz.' },
        { status: 400 }
      );
    }

    if (!Array.isArray(lines) || lines.length === 0) {
      return NextResponse.json(
        { error: 'En az bir transfer kalemi eklemelisiniz.' },
        { status: 400 }
      );
    }

    if (lines.length > TRANSFER_LIMITS.MAX_LINES_PER_TRANSFER) {
      return NextResponse.json(
        { error: `Bir transferde azami ${TRANSFER_LIMITS.MAX_LINES_PER_TRANSFER} kalem olabilir.` },
        { status: 400 }
      );
    }

    // Şubelerin bayiye aitliğini doğrula
    const [fromBranch, toBranch] = await Promise.all([
      prisma.branch.findUnique({ where: { id: fromBranchId } }),
      prisma.branch.findUnique({ where: { id: toBranchId } }),
    ]);

    if (!fromBranch || !toBranch) {
      return NextResponse.json(
        { error: 'Seçilen şubelerden biri bulunamadı.' },
        { status: 404 }
      );
    }

    assertTenantOwnership(ctx, fromBranch.dealerId, 'Kaynak Şube');
    assertTenantOwnership(ctx, toBranch.dealerId, 'Hedef Şube');

    // Eğer münferit takı transfer ediliyorsa ürünün kaynak şubede olduğunu ve durumunu doğrula
    const productItemIds = lines
      .map((l: any) => l.productItemId)
      .filter(Boolean) as string[];

    if (productItemIds.length > 0) {
      const items = await prisma.productItem.findMany({
        where: { id: { in: productItemIds }, dealerId },
      });

      for (const item of items) {
        if (item.status === 'IN_TRANSFER') {
          return NextResponse.json(
            { error: `'${item.barcode}' barkodlu ürün zaten başka bir sevkiyatta (yolda).` },
            { status: 409 }
          );
        }
        if (item.status === 'SOLD') {
          return NextResponse.json(
            { error: `'${item.barcode}' barkodlu ürün satılmıştır, transfer edilemez.` },
            { status: 400 }
          );
        }
        if (item.branchId && item.branchId !== fromBranchId) {
          return NextResponse.json(
            { error: `'${item.barcode}' barkodlu ürün kaynak şubede bulunmuyor.` },
            { status: 400 }
          );
        }
      }
    }

    // Sıralı Transfer Numarası Üret
    const year = new Date().getFullYear();
    const count = await prisma.inventoryTransfer.count({ where: { dealerId } });
    const transferNumber = `${BRANCH_DEFAULTS.TRANSFER_PREFIX}-${year}-${String(count + 1).padStart(BRANCH_DEFAULTS.TRANSFER_PAD_LENGTH, '0')}`;

    const initialStatus = autoApprove ? TRANSFER_STATUS.APPROVED : TRANSFER_STATUS.DRAFT;

    const transfer = await prisma.inventoryTransfer.create({
      data: {
        dealerId,
        transferNumber,
        fromBranchId,
        toBranchId,
        status: initialStatus,
        requestedBy: ctx.userName,
        approvedBy: autoApprove ? ctx.userName : null,
        notes: notes ? String(notes).trim() : null,
        lines: {
          create: lines.map((l: any) => ({
            productItemId: l.productItemId || null,
            productTitle: String(l.productTitle || 'Ürün'),
            barcode: l.barcode ? String(l.barcode) : null,
            quantity: Number(l.quantity) || 1,
            weight: l.weight ? Number(l.weight) : null,
            carat: l.carat ? Number(l.carat) : null,
            notes: l.notes ? String(l.notes) : null,
          })),
        },
      },
      include: {
        fromBranch: { select: { name: true, code: true } },
        toBranch: { select: { name: true, code: true } },
        lines: true,
      },
    });

    await logActivity({
      dealerId,
      action: 'Transfer Başlatıldı',
      details: `${transfer.transferNumber}: ${transfer.fromBranch.name} -> ${transfer.toBranch.name} (${lines.length} kalem)`,
      userEmail: ctx.userEmail,
      userName: ctx.userName,
    }).catch(() => {});

    return NextResponse.json(transfer, { status: 201 });
  } catch (error: any) {
    console.error('[API Transfers] POST Error:', error);
    return NextResponse.json(
      { error: error?.message || 'Transfer oluşturulamadı.' },
      { status: error?.statusCode || 500 }
    );
  }
}
