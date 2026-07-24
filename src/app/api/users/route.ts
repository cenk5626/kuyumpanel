import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hash } from 'bcryptjs';
import { auth } from '@/lib/auth';
import { USER_ROLES } from '@/constants/roles';

const SALT_ROUNDS = 12;

// GET — Kullanıcıları getir (Bayi kısıtlamalı)
export async function GET() {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userRole = (session.user as any).role;
  const userDealerId = (session.user as any).dealerId;

  let whereClause = {};
  if (userRole === USER_ROLES.SUPER_ADMIN) {
    whereClause = {};
  } else if (userRole === USER_ROLES.ADMIN) {
    whereClause = { dealerId: userDealerId };
  } else {
    return NextResponse.json({ error: 'Bu sayfa için yetkiniz yok.' }, { status: 403 });
  }

  const users = await prisma.user.findMany({
    where: whereClause,
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      permissions: true,
      dealerId: true,
      dealer: {
        select: {
          name: true,
        },
      },
      createdAt: true,
    },
    orderBy: { createdAt: 'asc' },
  });

  return NextResponse.json(users);
}

// POST — Yeni kullanıcı oluştur
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const currentUserRole = (session.user as any).role;
  const currentUserDealerId = (session.user as any).dealerId;

  if (currentUserRole !== USER_ROLES.SUPER_ADMIN && currentUserRole !== USER_ROLES.ADMIN) {
    return NextResponse.json({ error: 'Kullanıcı ekleme yetkiniz yok.' }, { status: 403 });
  }

  const body = await req.json();
  const { name, email, password, role, dealerId, permissions } = body;

  if (!name || !email || !password) {
    return NextResponse.json({ error: 'Tüm alanlar zorunludur.' }, { status: 400 });
  }

  // Yetki sınırlarını kontrol et
  let targetDealerId = dealerId;
  let targetRole = role || USER_ROLES.USER;

  if (currentUserRole === USER_ROLES.ADMIN) {
    // Admin sadece kendi bayisine kullanıcı ekleyebilir ve SUPER_ADMIN yetkisi veremez
    targetDealerId = currentUserDealerId;
    if (targetRole === USER_ROLES.SUPER_ADMIN) {
      targetRole = USER_ROLES.ADMIN;
    }
  }

  // Check duplicate email
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: 'Bu e-posta zaten kullanılıyor.' }, { status: 409 });
  }

  const hashedPassword = await hash(password, SALT_ROUNDS);

  const defaultPerms = '["dashboard","prices","stocks","transactions","suppliers","price-check","users"]';

  const user = await prisma.user.create({
    data: {
      name,
      email,
      password: hashedPassword,
      role: targetRole,
      permissions: Array.isArray(permissions) ? JSON.stringify(permissions) : defaultPerms,
      dealerId: targetDealerId || null,
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      permissions: true,
      dealerId: true,
      createdAt: true,
    },
  });

  return NextResponse.json(user, { status: 201 });
}

// PUT — Kullanıcı güncelle
export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const currentUserRole = (session.user as any).role;
  const currentUserDealerId = (session.user as any).dealerId;

  if (currentUserRole !== USER_ROLES.SUPER_ADMIN && currentUserRole !== USER_ROLES.ADMIN) {
    return NextResponse.json({ error: 'Kullanıcı düzenleme yetkiniz yok.' }, { status: 403 });
  }

  const body = await req.json();
  const { id, name, email, password, role, dealerId, permissions } = body;

  if (!id) {
    return NextResponse.json({ error: 'Kullanıcı ID gerekli.' }, { status: 400 });
  }

  // Düzenlenecek kullanıcıyı bul
  const targetUser = await prisma.user.findUnique({ where: { id } });
  if (!targetUser) {
    return NextResponse.json({ error: 'Kullanıcı bulunamadı.' }, { status: 404 });
  }

  // Admin sadece kendi bayisinin kullanıcılarını düzenleyebilir
  if (currentUserRole === USER_ROLES.ADMIN && targetUser.dealerId !== currentUserDealerId) {
    return NextResponse.json({ error: 'Bu kullanıcıyı düzenleme yetkiniz yok.' }, { status: 403 });
  }

  // Check if email is taken by another user
  if (email) {
    const existing = await prisma.user.findFirst({
      where: { email, NOT: { id } },
    });
    if (existing) {
      return NextResponse.json({ error: 'Bu e-posta zaten kullanılıyor.' }, { status: 409 });
    }
  }

  const updateData: Record<string, any> = {};
  if (name) updateData.name = name;
  if (email) updateData.email = email;
  if (Array.isArray(permissions)) updateData.permissions = JSON.stringify(permissions);
  
  if (currentUserRole === USER_ROLES.SUPER_ADMIN) {
    if (role) updateData.role = role;
    if (dealerId !== undefined) updateData.dealerId = dealerId || null;
  } else if (currentUserRole === USER_ROLES.ADMIN) {
    // Admin yetki veya bayi değiştiremez
    if (role && role !== USER_ROLES.SUPER_ADMIN) {
      updateData.role = role;
    }
  }

  if (password) {
    updateData.password = await hash(password, SALT_ROUNDS);
  }

  const user = await prisma.user.update({
    where: { id },
    data: updateData,
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      permissions: true,
      dealerId: true,
      createdAt: true,
    },
  });

  return NextResponse.json(user);
}

// DELETE — Kullanıcı sil
export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const currentUserRole = (session.user as any).role;
  const currentUserDealerId = (session.user as any).dealerId;

  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'Kullanıcı ID gerekli.' }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) {
    return NextResponse.json({ error: 'Kullanıcı bulunamadı.' }, { status: 404 });
  }

  // Prevent deleting SUPER_ADMIN
  if (user.role === USER_ROLES.SUPER_ADMIN) {
    return NextResponse.json({ error: 'Super Admin silinemez.' }, { status: 403 });
  }

  // Admin limits
  if (currentUserRole === USER_ROLES.ADMIN && user.dealerId !== currentUserDealerId) {
    return NextResponse.json({ error: 'Bu kullanıcıyı silme yetkiniz yok.' }, { status: 403 });
  }

  if (currentUserRole !== USER_ROLES.SUPER_ADMIN && currentUserRole !== USER_ROLES.ADMIN) {
    return NextResponse.json({ error: 'Kullanıcı silme yetkiniz yok.' }, { status: 403 });
  }

  await prisma.user.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
