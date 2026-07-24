import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { USER_ROLES } from '@/constants/roles';

/**
 * GET /api/logs — Bayiye ait işlem loglarını listeler.
 * SADECE Bayi Yetkilisi (ADMIN) veya SUPER_ADMIN tarafından görüntülenebilir.
 */
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const currentUserRole = (session.user as any).role;
    const currentUserDealerId = (session.user as any).dealerId || 'merkez';

    // Güvenlik Kontrolü: Sadece Admin veya Super Admin erişebilir
    if (currentUserRole !== USER_ROLES.SUPER_ADMIN && currentUserRole !== USER_ROLES.ADMIN) {
      return NextResponse.json(
        { error: 'İşlem loglarını görüntüleme yetkiniz yok. Bu alan sadece yetkili yöneticilere açıktır.' },
        { status: 403 }
      );
    }

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
  } catch (error) {
    console.error('[API Logs] GET Error:', error);
    return NextResponse.json({ error: 'Log kayıtları okunamadı.' }, { status: 500 });
  }
}
