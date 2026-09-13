import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { ROLE_DEFAULT_PRESETS, PERMISSION_PRESETS } from '@/constants/page-permissions';
import { USER_ROLES } from '@/constants/roles';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized: Lütfen giriş yapınız.' }, { status: 401 });
    }

    const dbUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        dealerId: true,
        permissions: true,
      },
    });

    if (!dbUser) {
      return NextResponse.json({ error: 'Kullanıcı bulunamadı.' }, { status: 404 });
    }

    let parsedPermissions: string[] = [];
    if (dbUser.permissions) {
      try {
        const perms = JSON.parse(dbUser.permissions);
        if (Array.isArray(perms)) {
          parsedPermissions = perms;
        }
      } catch {
        parsedPermissions = [];
      }
    }

    if (parsedPermissions.length === 0) {
      const fallbackPreset = ROLE_DEFAULT_PRESETS[dbUser.role] || PERMISSION_PRESETS.CASHIER.pages;
      parsedPermissions = [...fallbackPreset];
    }

    return NextResponse.json({
      id: dbUser.id,
      name: dbUser.name,
      email: dbUser.email,
      role: dbUser.role || USER_ROLES.USER,
      dealerId: dbUser.dealerId || 'merkez',
      permissions: parsedPermissions,
    });
  } catch (error: any) {
    console.error('[API /api/me Error]:', error);
    return NextResponse.json(
      { error: error?.message || 'Kullanıcı bilgisi alınamadı.' },
      { status: 500 }
    );
  }
}
