import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedContext, assertTenantOwnership, requirePermission } from '@/lib/security/auth-context';
import { PERMISSIONS } from '@/constants/permissions';
import { ensureDefaultBranch } from '@/lib/branch/bootstrap';
import { logActivity } from '@/lib/logger';
import { TRANSFER_LIMITS } from '@/constants/branch';
import { validateStringLength } from '@/lib/security/validation';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const ctx = await getAuthenticatedContext();
    const dealerId = ctx.dealerId;

    // Varsayılan Merkez şubenin varlığını garanti et
    await ensureDefaultBranch(dealerId);

    const { searchParams } = new URL(req.url);
    const includeCounts = searchParams.get('includeCounts') === 'true';

    let branches = await prisma.branch.findMany({
      where: { dealerId },
      orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
      include: includeCounts
        ? {
            _count: {
              select: {
                productItems: true,
                stocks: true,
                employees: true,
                transfersFrom: true,
                transfersTo: true,
              },
            },
          }
        : undefined,
    });

    return NextResponse.json(branches);
  } catch (error: any) {
    console.error('[API Branches] GET Error:', error);
    return NextResponse.json(
      { error: error?.message || 'Şubeler alınamadı.' },
      { status: error?.statusCode || 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const ctx = await getAuthenticatedContext();
    requirePermission(ctx, PERMISSIONS.BRANCHES_MANAGE);
    const dealerId = ctx.dealerId;

    const body = await req.json();
    const { name, code, address, phone, isDefault } = body;

    const validatedName = validateStringLength(
      name,
      'Şube Adı',
      TRANSFER_LIMITS.MIN_NAME_LENGTH,
      TRANSFER_LIMITS.MAX_NAME_LENGTH
    );
    const validatedCode = validateStringLength(
      code,
      'Şube Kodu',
      TRANSFER_LIMITS.MIN_CODE_LENGTH,
      TRANSFER_LIMITS.MAX_CODE_LENGTH
    ).toUpperCase();

    // Kod mükerrerlik kontrolü
    const existing = await prisma.branch.findFirst({
      where: { dealerId, code: validatedCode },
    });
    if (existing) {
      return NextResponse.json(
        { error: `'${validatedCode}' kodlu bir şube zaten mevcut.` },
        { status: 409 }
      );
    }

    // Eğer varsayılan olarak işaretlendiyse diğerlerini false yap
    if (isDefault) {
      await prisma.branch.updateMany({
        where: { dealerId, isDefault: true },
        data: { isDefault: false },
      });
    }

    const branch = await prisma.branch.create({
      data: {
        dealerId,
        name: validatedName,
        code: validatedCode,
        address: address ? String(address).trim() : null,
        phone: phone ? String(phone).trim() : null,
        isDefault: Boolean(isDefault),
        isActive: true,
      },
    });

    await logActivity({
      dealerId,
      action: 'Yeni Şube Açılışı',
      details: `${branch.name} (${branch.code}) şubesi oluşturuldu.`,
      userEmail: ctx.userEmail,
      userName: ctx.userName,
    }).catch(() => {});

    return NextResponse.json(branch, { status: 201 });
  } catch (error: any) {
    console.error('[API Branches] POST Error:', error);
    return NextResponse.json(
      { error: error?.message || 'Şube oluşturulamadı.' },
      { status: error?.statusCode || 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const ctx = await getAuthenticatedContext();
    requirePermission(ctx, PERMISSIONS.BRANCHES_MANAGE);
    const dealerId = ctx.dealerId;

    const body = await req.json();
    const { id, name, code, address, phone, isActive, isDefault } = body;

    if (!id) {
      return NextResponse.json({ error: 'Şube ID zorunludur.' }, { status: 400 });
    }

    const branch = await prisma.branch.findUnique({ where: { id } });
    if (!branch) {
      return NextResponse.json({ error: 'Şube bulunamadı.' }, { status: 404 });
    }
    assertTenantOwnership(ctx, branch.dealerId, 'Şube');

    const updateData: any = {};
    if (name) {
      updateData.name = validateStringLength(
        name,
        'Şube Adı',
        TRANSFER_LIMITS.MIN_NAME_LENGTH,
        TRANSFER_LIMITS.MAX_NAME_LENGTH
      );
    }
    if (code) {
      const newCode = validateStringLength(
        code,
        'Şube Kodu',
        TRANSFER_LIMITS.MIN_CODE_LENGTH,
        TRANSFER_LIMITS.MAX_CODE_LENGTH
      ).toUpperCase();

      if (newCode !== branch.code) {
        const existing = await prisma.branch.findFirst({
          where: { dealerId, code: newCode, NOT: { id } },
        });
        if (existing) {
          return NextResponse.json(
            { error: `'${newCode}' kodlu başka bir şube zaten mevcut.` },
            { status: 409 }
          );
        }
        updateData.code = newCode;
      }
    }
    if (address !== undefined) updateData.address = address ? String(address).trim() : null;
    if (phone !== undefined) updateData.phone = phone ? String(phone).trim() : null;
    if (typeof isActive === 'boolean') updateData.isActive = isActive;

    if (isDefault) {
      await prisma.branch.updateMany({
        where: { dealerId, isDefault: true, NOT: { id } },
        data: { isDefault: false },
      });
      updateData.isDefault = true;
    }

    const updated = await prisma.branch.update({
      where: { id },
      data: updateData,
    });

    await logActivity({
      dealerId,
      action: 'Şube Güncellendi',
      details: `${updated.name} (${updated.code}) şube bilgileri güncellendi.`,
      userEmail: ctx.userEmail,
      userName: ctx.userName,
    }).catch(() => {});

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error('[API Branches] PUT Error:', error);
    return NextResponse.json(
      { error: error?.message || 'Şube güncellenemedi.' },
      { status: error?.statusCode || 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const ctx = await getAuthenticatedContext();
    requirePermission(ctx, PERMISSIONS.BRANCHES_MANAGE);
    const dealerId = ctx.dealerId;

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Şube ID zorunludur.' }, { status: 400 });
    }

    const branch = await prisma.branch.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            productItems: true,
            stocks: true,
          },
        },
      },
    });

    if (!branch) {
      return NextResponse.json({ error: 'Şube bulunamadı.' }, { status: 404 });
    }
    assertTenantOwnership(ctx, branch.dealerId, 'Şube');

    if (branch.isDefault) {
      return NextResponse.json(
        { error: 'Varsayılan Merkez şube silinemez.' },
        { status: 400 }
      );
    }

    if (branch._count.productItems > 0 || branch._count.stocks > 0) {
      return NextResponse.json(
        {
          error: `Bu şubede ${branch._count.productItems} adet takı ürünü ve ${branch._count.stocks} adet stok bulunmaktadır. Şubeyi silmeden önce ürünleri başka bir şubeye transfer ediniz.`,
        },
        { status: 400 }
      );
    }

    await prisma.branch.delete({ where: { id } });

    await logActivity({
      dealerId,
      action: 'Şube Silindi',
      details: `${branch.name} (${branch.code}) şubesi kalıcı olarak silindi.`,
      userEmail: ctx.userEmail,
      userName: ctx.userName,
    }).catch(() => {});

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[API Branches] DELETE Error:', error);
    return NextResponse.json(
      { error: error?.message || 'Şube silinemedi.' },
      { status: error?.statusCode || 500 }
    );
  }
}
