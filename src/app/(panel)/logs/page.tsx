import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { USER_ROLES } from '@/constants/roles';
import LogsClient from './LogsClient';

export default async function LogsPage() {
  const session = await auth();
  if (!session) {
    redirect('/login');
  }

  const currentUserRole = (session.user as any).role;
  const currentUserDealerId = (session.user as any).dealerId || 'merkez';

  // Sadece Admin ve Super Admin erişebilir
  if (currentUserRole !== USER_ROLES.SUPER_ADMIN && currentUserRole !== USER_ROLES.ADMIN) {
    return (
      <div className="p-8 text-center text-red-400 font-semibold bg-red-500/10 border border-red-500/20 rounded-xl max-w-md mx-auto mt-20">
        Bu sayfayı görüntülemek için yetkiniz bulunmamaktadır. Sadece Bayi Yetkilisi erişebilir.
      </div>
    );
  }

  let whereClause: any = {};
  if (currentUserRole !== USER_ROLES.SUPER_ADMIN) {
    whereClause.dealerId = currentUserDealerId;
  }

  const dbLogs = await prisma.auditLog.findMany({
    where: whereClause,
    orderBy: { createdAt: 'desc' },
    take: 200,
  });

  const serializedLogs = dbLogs.map(l => ({
    id: l.id,
    dealerId: l.dealerId,
    action: l.action,
    details: l.details,
    userEmail: l.userEmail,
    userName: l.userName,
    createdAt: l.createdAt.toISOString(),
  }));

  return (
    <LogsClient
      initialLogs={serializedLogs}
      currentUserRole={currentUserRole}
    />
  );
}
