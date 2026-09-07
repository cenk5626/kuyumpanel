import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedContext, requirePermission } from '@/lib/security/auth-context';
import { PERMISSIONS } from '@/constants/permissions';
import { USER_ROLES } from '@/constants/roles';

export const dynamic = 'force-dynamic';

// API log başlığı
const LOG_PREFIX = '[API Dealers]';

/**
 * GET /api/dealers — Bayileri listeler.
 * - SUPER_ADMIN: Tüm bayileri görebilir.
 * - ADMIN / USER: Sadece kendi bağlı olduğu bayiyi görebilir.
 */
export async function GET() {
  try {
    const ctx = await getAuthenticatedContext();
    const userRole = ctx.role;
    const userDealerId = ctx.dealerId;

    if (userRole === USER_ROLES.SUPER_ADMIN) {
      const dealers = await prisma.dealer.findMany({
        orderBy: { name: 'asc' },
      });
      return NextResponse.json(dealers);
    }

    if (userDealerId) {
      const dealer = await prisma.dealer.findUnique({
        where: { id: userDealerId },
      });
      return NextResponse.json(dealer ? [dealer] : []);
    }

    return NextResponse.json([]);
  } catch (error: any) {
    console.error(`${LOG_PREFIX} GET Error:`, error);
    return NextResponse.json({ error: error?.message || 'Bayi bilgileri alınamadı.' }, { status: error?.statusCode || 500 });
  }
}

/**
 * POST /api/dealers — Yeni bayi oluşturur.
 * - Sadece SUPER_ADMIN yetkisine sahip kullanıcılar yeni bayi oluşturabilir.
 */
export async function POST(req: NextRequest) {
  try {
    const ctx = await getAuthenticatedContext();
    const userRole = ctx.role;

    if (userRole !== USER_ROLES.SUPER_ADMIN) {
      return NextResponse.json({ error: 'Bu işlem için yetkiniz yok.' }, { status: 403 });
    }

    const { name } = await req.json() as { name: string };
    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Bayi adı zorunludur.' }, { status: 400 });
    }

    // İsmin benzersiz olup olmadığını denetle
    const existing = await prisma.dealer.findUnique({
      where: { name: name.trim() },
    });

    if (existing) {
      return NextResponse.json({ error: 'Bu bayi adı zaten kullanılıyor.' }, { status: 409 });
    }

    const dealer = await prisma.dealer.create({
      data: { name: name.trim() },
    });

    return NextResponse.json(dealer, { status: 201 });
  } catch (error: any) {
    console.error(`${LOG_PREFIX} POST Error:`, error);
    return NextResponse.json(
      {
        error: error?.message || 'Bayi oluşturulamadı.',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: error?.statusCode || 500 }
    );
  }
}

