import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import DashboardClient from './DashboardClient';
import { USER_ROLES } from '@/constants/roles';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  let session = null;
  try {
    session = await auth();
  } catch (e) {
    console.error('Dashboard auth error:', e);
  }

  const dealerId = (session?.user as any)?.dealerId || 'merkez';

  try {
    const [
      totalUsers,
      adminCount,
      totalStockCount,
      stockWeightAgg,
      suppliers,
      supplierAgg,
      recentTransactions,
      hasPrice,
      dealerStocks
    ] = await Promise.all([
      prisma.user.count().catch(() => 0),
      prisma.user.count({
        where: {
          role: { in: [USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN] },
        },
      }).catch(() => 0),
      prisma.productItem.count({ where: { status: 'IN_STOCK' } }).catch(() => 0),
      prisma.productItem.aggregate({
        where: { status: 'IN_STOCK' },
        _sum: { weight: true },
      }).catch(() => ({ _sum: { weight: 0 } })),
      prisma.supplier.findMany({
        orderBy: { hasBalance: 'desc' },
        take: 5,
      }).catch(() => []),
      prisma.supplier.aggregate({
        _sum: { hasBalance: true, tlBalance: true },
      }).catch(() => ({ _sum: { hasBalance: 0, tlBalance: 0 } })),
      prisma.transaction.findMany({
        where: { dealerId },
        orderBy: { createdAt: 'desc' },
        take: 6,
      }).catch(() => []),
      prisma.hasPrice.findUnique({
        where: { id: 'singleton' },
      }).catch(() => null),
      prisma.stock.findMany({
        where: { dealerId },
      }).catch(() => []),
    ]);

    const criticalStocks = dealerStocks.filter(s => s.amount <= (s.minThreshold || 5));

    return (
      <DashboardClient
        userName={session?.user?.name || 'Kullanıcı'}
        totalUsers={totalUsers}
        adminCount={adminCount}
        totalStockCount={totalStockCount}
        totalStockWeight={stockWeightAgg._sum.weight || 0}
        suppliers={suppliers.map(s => ({
          id: s.id,
          name: s.name,
          phone: s.phone,
          hasBalance: s.hasBalance,
          tlBalance: s.tlBalance,
        }))}
        totalSupplierHasBalance={supplierAgg._sum.hasBalance || 0}
        totalSupplierTlBalance={supplierAgg._sum.tlBalance || 0}
        recentTransactions={recentTransactions.map(tx => ({
          id: tx.id,
          type: tx.type,
          productCode: tx.productCode,
          quantity: tx.quantity,
          price: tx.price,
          total: tx.total,
          employeeName: tx.employeeName,
          createdAt: tx.createdAt ? new Date(tx.createdAt).toISOString() : new Date().toISOString(),
        }))}
        hasPrice={hasPrice ? { bid: hasPrice.bid, ask: hasPrice.ask } : null}
        criticalStockCount={criticalStocks.length}
        criticalStockItems={criticalStocks.map(s => ({
          id: s.id,
          label: s.label,
          amount: s.amount,
          minThreshold: s.minThreshold || 5,
        }))}
      />
    );
  } catch (err) {
    console.error('Error rendering DashboardPage:', err);
    return (
      <DashboardClient
        userName={session?.user?.name || 'Kullanıcı'}
        totalUsers={0}
        adminCount={0}
        totalStockCount={0}
        totalStockWeight={0}
        suppliers={[]}
        totalSupplierHasBalance={0}
        totalSupplierTlBalance={0}
        recentTransactions={[]}
        hasPrice={null}
        criticalStockCount={0}
        criticalStockItems={[]}
      />
    );
  }
}
