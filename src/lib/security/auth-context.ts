import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { USER_ROLES, UserRole } from '@/constants/roles';
import { PERMISSIONS, PermissionKey, ROLE_PERMISSIONS_MAP } from '@/constants/permissions';

export class AuthenticationError extends Error {
  statusCode: number;
  constructor(message: string = 'Oturum açmanız gerekiyor.', statusCode: number = 401) {
    super(message);
    this.name = 'AuthenticationError';
    this.statusCode = statusCode;
  }
}

export class AuthorizationError extends Error {
  statusCode: number;
  constructor(message: string = 'Bu işlem için yetkiniz bulunmamaktadır.', statusCode: number = 403) {
    super(message);
    this.name = 'AuthorizationError';
    this.statusCode = statusCode;
  }
}

export interface AuthenticatedContext {
  userId: string;
  userName: string;
  userEmail: string;
  role: UserRole;
  dealerId: string;
  permissions: PermissionKey[];
  branchId?: string | null;
}

/**
 * Tüm korumalı API rotalarında çağrılan merkezi sunucu tarafı oturum ve bayi doğrulama helper'ı.
 * İstemciden gelen dealerId'ye ASLA güvenmez; session ve DB'den doğrulanmış kiracı bağlamını döner.
 * Kesinlikle varsayılan fallback (örn: 'merkez') KULLANMAZ.
 */
export async function getAuthenticatedContext(
  _req?: Request
): Promise<AuthenticatedContext> {
  const session = await auth();

  if (!session || !session.user || !session.user.id) {
    throw new AuthenticationError('Oturum açmanız gerekiyor.', 401);
  }

  // Veritabanından kullanıcının en güncel durumunu doğrula (Rol ve Bayi manipülasyonu engeli)
  const dbUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      dealerId: true,
      permissions: true,
      lockedUntil: true,
    },
  });

  if (!dbUser) {
    throw new AuthenticationError('Kullanıcı hesabı bulunamadı.', 401);
  }

  // Hesap kilitli mi kontrolü
  if (dbUser.lockedUntil && dbUser.lockedUntil > new Date()) {
    const remainingMinutes = Math.ceil((dbUser.lockedUntil.getTime() - Date.now()) / 60000);
    throw new AuthenticationError(
      `Hesabınız güvenlik sebebiyle geçici olarak kilitlenmiştir. Lütfen ${remainingMinutes} dakika sonra tekrar deneyiniz.`,
      401
    );
  }

  const role = (dbUser.role as UserRole) || USER_ROLES.USER;

  // SUPER_ADMIN dışındaki tüm kullanıcıların geçerli bir bayi (dealerId) kaydı ZORUNLUDUR
  if (role !== USER_ROLES.SUPER_ADMIN && !dbUser.dealerId) {
    throw new AuthorizationError('Yetkili bir bayi (dealer) hesabına bağlı değilsiniz.', 403);
  }

  const dealerId = dbUser.dealerId || 'super_admin';

  // İzinleri çözümle
  let permissions: PermissionKey[] = ROLE_PERMISSIONS_MAP[role] || [];
  if (dbUser.permissions) {
    try {
      const customPerms = JSON.parse(dbUser.permissions);
      if (Array.isArray(customPerms)) {
        permissions = customPerms as PermissionKey[];
      }
    } catch {
      // JSON parse hatasında rolün varsayılan izinlerini koru
    }
  }

  return {
    userId: dbUser.id,
    userName: dbUser.name,
    userEmail: dbUser.email,
    role,
    dealerId,
    permissions,
  };
}

/**
 * Kullanıcının belirli bir işlemi yapmaya yetkili olduğunu doğrular.
 */
export function requirePermission(
  ctx: AuthenticatedContext,
  permission: PermissionKey
): void {
  if (ctx.role === USER_ROLES.SUPER_ADMIN) {
    return;
  }

  if (!ctx.permissions.includes(permission)) {
    throw new AuthorizationError(`Bu işlem için '${permission}' yetkisine sahip olmalısınız.`, 403);
  }
}

/**
 * Kaydın aktif bayiye (tenant) ait olduğunu kesin olarak doğrular (IDOR Koruması).
 * Farklı bir bayiye ait kayda erişilmeye çalışıldığında 403 fırlatır.
 */
export function assertTenantOwnership(
  ctx: AuthenticatedContext,
  resourceDealerId: string | null | undefined,
  resourceName: string = 'Kayıt'
): void {
  if (ctx.role === USER_ROLES.SUPER_ADMIN) {
    return;
  }

  if (!resourceDealerId || resourceDealerId !== ctx.dealerId) {
    throw new AuthorizationError(
      `Erişim reddedildi: Bu ${resourceName} başka bir bayiye aittir.`,
      403
    );
  }
}

/**
 * Şube erişim doğrulaması (Faz 1 için hazır altyapı).
 */
export function assertBranchAccess(
  ctx: AuthenticatedContext,
  resourceBranchId?: string | null
): void {
  if (ctx.role === USER_ROLES.SUPER_ADMIN || ctx.role === USER_ROLES.ADMIN) {
    return;
  }

  if (ctx.branchId && resourceBranchId && ctx.branchId !== resourceBranchId) {
    throw new AuthorizationError('Bu şube verisine erişim yetkiniz bulunmamaktadır.', 403);
  }
}
