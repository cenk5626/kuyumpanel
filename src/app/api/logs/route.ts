import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedContext, requirePermission } from '@/lib/security/auth-context';
import { PERMISSIONS } from '@/constants/permissions';
import { USER_ROLES } from '@/constants/roles';

export const dynamic = 'force-dynamic';

/**
 * GET /api/logs — Bayiye ait işlem loglarını listeler.
 * SADECE Bayi Yetkilisi (ADMIN) veya SUPER_ADMIN tarafından görüntülenebilir.
 */
export async function GET(req: NextRequest) {
  try {
    const ctx = await getAuthenticatedContext();
    requirePermission(ctx, PERMISSIONS.AUDIT_READ);

    const currentUserRole = ctx.role;
    const currentUserDealerId = ctx.dealerId;

    let whereClause: any = {};
    if (currentUserRole !== USER_ROLES.SUPER_ADMIN) {
      whereClause.dealerId = currentUserDealerId;
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search');
    if (search) {
      whereClause.OR = [
        { action: { contains: search } },
        { details: { contains: search } },
        { userEmail: { contains: search } },
        { userName: { contains: search } },
      ];
    }

    const logs = await prisma.auditLog.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      take: 200, // Son 200 işlem kaydı
    });

    return NextResponse.json(logs);
  } catch (error: any) {
    console.error('[API Logs] GET Error:', error);
    return NextResponse.json(
      { error: error?.message || 'Log kayıtları okunamadı.' },
      { status: error?.statusCode || 500 }
    );
  }
}

