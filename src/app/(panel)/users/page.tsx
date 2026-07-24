import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { USER_ROLES } from '@/constants/roles';
import UsersClient from './UsersClient';

export default async function UsersPage() {
  const session = await auth();
  if (!session) {
    redirect('/login');
  }

  const currentUserRole = (session.user as any).role;
  const currentUserDealerId = (session.user as any).dealerId;

  // USER rolü bu sayfaya erişemez
  if (currentUserRole !== USER_ROLES.SUPER_ADMIN && currentUserRole !== USER_ROLES.ADMIN) {
    return (
      <div className="p-8 text-center text-red-400 font-semibold bg-red-500/10 border border-red-500/20 rounded-xl max-w-md mx-auto mt-20">
        Bu sayfayı görüntülemek için yetkiniz bulunmamaktadır.
      </div>
    );
  }

  let whereClause = {};
  if (currentUserRole === USER_ROLES.ADMIN) {
    whereClause = { dealerId: currentUserDealerId };
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

  // Bayi listesini çek (Sadece SUPER_ADMIN yeni bayiler tanımlayabilir ve atayabilir)
  let dealers: Array<{ id: string; name: string }> = [];
  if (currentUserRole === USER_ROLES.SUPER_ADMIN) {
    dealers = await prisma.dealer.findMany({
      select: {
        id: true,
        name: true,
      },
      orderBy: { name: 'asc' },
    });
  } else if (currentUserDealerId) {
    const adminDealer = await prisma.dealer.findUnique({
      where: { id: currentUserDealerId },
      select: { id: true, name: true },
    });
    if (adminDealer) {
      dealers = [adminDealer];
    }
  }

  // Çalışanları (Employee) çek
  let employeesClause = {};
  if (currentUserRole === USER_ROLES.ADMIN) {
    employeesClause = { dealerId: currentUserDealerId || '' };
  }
  const dbEmployees = await prisma.employee.findMany({
    where: employeesClause,
    include: {
      dealer: {
        select: { name: true },
      },
    },
    orderBy: { createdAt: 'asc' },
  });

  const serializedEmployees = dbEmployees.map((e) => ({
    id: e.id,
    name: e.name,
    dealerId: e.dealerId,
    dealerName: e.dealer?.name ?? 'Merkez',
    createdAt: e.createdAt.toISOString(),
  }));

  // Serialize dates for client component
  const serializedUsers = users.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    permissions: u.permissions || '["dashboard","prices","stocks","transactions","suppliers","price-check","users"]',
    dealerId: u.dealerId,
    dealerName: u.dealer?.name ?? 'Merkez',
    createdAt: u.createdAt.toISOString(),
  }));

  return (
    <UsersClient
      initialUsers={serializedUsers}
      initialEmployees={serializedEmployees}
      dealers={dealers}
      currentUserRole={currentUserRole}
      currentUserDealerId={currentUserDealerId}
    />
  );
}
