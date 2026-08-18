import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { USER_ROLES } from '@/constants/roles';
import LogsClient from './LogsClient';

export const dynamic = 'force-dynamic';

export default async function LogsPage() {
  let session = null;
  try {
    session = await auth();
  } catch (e) {
    console.error('LogsPage auth error:', e);
  }

  if (!session) {
    redirect('/login');
  }

  const currentUserRole = (session.user as any)?.role;
  const currentUserDealerId = (session.user as any)?.dealerId || 'merkez';

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

  try {
    const dbLogs = await prisma.auditLog.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      take: 200,
    }).catch(() => []);

    const serializedLogs = dbLogs.map(l => ({
      id: l.id,
      dealerId: l.dealerId,
      action: l.action,
      details: l.details,
      userEmail: l.userEmail,
      userName: l.userName,
      createdAt: l.createdAt ? new Date(l.createdAt).toISOString() : new Date().toISOString(),
    }));

    return (
      <LogsClient
        initialLogs={serializedLogs}
        currentUserRole={currentUserRole}
      />
    );
  } catch (err) {
    console.error('Error in LogsPage:', err);
    return (
      <LogsClient
        initialLogs={[]}
        currentUserRole={currentUserRole}
      />
    );
  }
}
