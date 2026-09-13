import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { USER_ROLES } from '@/constants/roles';
import { hasPagePermission } from '@/constants/page-permissions';
import { ROUTES } from '@/constants/routes';
import AccessDenied from '@/components/AccessDenied';
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
    redirect(ROUTES.LOGIN);
  }

  const currentUserRole = (session.user as any)?.role;
  const currentUserPermissions = (session.user as any)?.permissions;
  const currentUserDealerId = (session.user as any)?.dealerId || 'merkez';

  // Sayfa yetki kontrolü (Role ve Sayfa İzinleri)
  if (!hasPagePermission(currentUserRole, currentUserPermissions, '/logs')) {
    return (
      <AccessDenied
        pageTitle="İşlem Logları"
        userRole={currentUserRole}
        requiredModule="/logs"
      />
    );
  }

  let whereClause: any = {};
  if (currentUserRole !== USER_ROLES.SUPER_ADMIN) {
    whereClause.dealerId = currentUserDealerId;
  }

  try {
    const [dbLogs, dbSuspicious, dbRevisions] = await Promise.all([
      prisma.auditLog.findMany({
        where: whereClause,
        orderBy: { createdAt: 'desc' },
        take: 200,
      }).catch(() => []),
      prisma.transaction.findMany({
        where: { ...whereClause, isSuspicious: true },
        orderBy: { createdAt: 'desc' },
        take: 100,
      }).catch(() => []),
      prisma.transactionRevisionLog.findMany({
        where: whereClause,
        orderBy: { createdAt: 'desc' },
        take: 100,
      }).catch(() => []),
    ]);

    const serializedLogs = dbLogs.map(l => ({
      id: l.id,
      dealerId: l.dealerId,
      action: l.action,
      details: l.details,
      userEmail: l.userEmail,
      userName: l.userName,
      createdAt: l.createdAt ? (l.createdAt instanceof Date ? l.createdAt.toISOString() : new Date(l.createdAt).toISOString()) : new Date().toISOString(),
    }));

    const serializedSuspicious = dbSuspicious.map(tx => ({
      id: tx.id,
      type: tx.type,
      productType: tx.productType,
      productCode: tx.productCode,
      quantity: tx.quantity,
      price: tx.price,
      total: tx.total,
      profitAmount: tx.profitAmount ?? null,
      profitMargin: tx.profitMargin ?? null,
      paymentMethod: tx.paymentMethod,
      suspiciousReason: tx.suspiciousReason ?? 'Belirtilmemiş',
      employeeName: tx.employeeName ?? 'Genel',
      createdAt: tx.createdAt ? (tx.createdAt instanceof Date ? tx.createdAt.toISOString() : new Date(tx.createdAt).toISOString()) : new Date().toISOString(),
    }));

    const serializedRevisions = dbRevisions.map(r => ({
      id: r.id,
      transactionId: r.transactionId,
      actionType: r.actionType,
      previousData: r.previousData ? JSON.parse(r.previousData) : null,
      newData: r.newData ? JSON.parse(r.newData) : null,
      reason: r.reason,
      userEmail: r.userEmail,
      userName: r.userName,
      createdAt: r.createdAt ? (r.createdAt instanceof Date ? r.createdAt.toISOString() : new Date(r.createdAt).toISOString()) : new Date().toISOString(),
    }));

    return (
      <LogsClient
        initialLogs={serializedLogs}
        initialSuspicious={serializedSuspicious}
        initialRevisions={serializedRevisions}
        currentUserRole={currentUserRole}
      />
    );
  } catch (err) {
    console.error('Error in LogsPage:', err);
    return (
      <LogsClient
        initialLogs={[]}
        initialSuspicious={[]}
        initialRevisions={[]}
        currentUserRole={currentUserRole}
      />
    );
  }
}
