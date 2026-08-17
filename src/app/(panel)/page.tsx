import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import DashboardClient from './DashboardClient';
import { USER_ROLES } from '@/constants/roles';

export default async function DashboardPage() {
  const session = await auth();
  const dealerId = (session?.user as any)?.dealerId || 'merkez';

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
    prisma.user.count(),
    prisma.user.count({
      where: {
        role: { in: [USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN] },
      },
    }),
    prisma.productItem.count({ where: { status: 'IN_STOCK' } }),
    prisma.productItem.aggregate({
      where: { status: 'IN_STOCK' },
      _sum: { weight: true },
    }),
    prisma.supplier.findMany({
      orderBy: { hasBalance: 'desc' },
      take: 5,
    }),
    prisma.supplier.aggregate({
      _sum: { hasBalance: true, tlBalance: true },
    }),
    prisma.transaction.findMany({
      where: { dealerId },
      orderBy: { createdAt: 'desc' },
      take: 6,
    }),
    prisma.hasPrice.findUnique({
      where: { id: 'singleton' },
    }),
    prisma.stock.findMany({
      where: { dealerId },
    }),
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
        createdAt: tx.createdAt.toISOString(),
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
}

