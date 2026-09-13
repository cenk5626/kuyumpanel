import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import DashboardClient from './DashboardClient';
import { USER_ROLES } from '@/constants/roles';
import { COIN_WEIGHTS_GR, GRAM_STOCK_PRODUCT_KEYS } from '@/constants/stocks';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  let session = null;
  try {
    session = await auth();
  } catch (e) {
    console.error('Dashboard auth error:', e);
  }

  const userRole = (session?.user as any)?.role || USER_ROLES.USER;
  const isSuperAdmin = userRole === USER_ROLES.SUPER_ADMIN;
  const dealerId = (session?.user as any)?.dealerId || 'merkez';

  const dealerFilter = isSuperAdmin ? {} : { dealerId };
  const productFilter = isSuperAdmin ? { status: 'IN_STOCK' } : { status: 'IN_STOCK', dealerId };

  try {
    const [
      totalUsers,
      adminCount,
      staffCount,
      totalProductItemCount,
      stockWeightAgg,
      suppliers,
      supplierAgg,
      recentTransactions,
      hasPrice,
      dealerStocks
    ] = await Promise.all([
      prisma.user.count({ where: dealerFilter }).catch(() => 0),
      prisma.user.count({
        where: {
          role: { in: [USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN] },
          ...dealerFilter,
        },
      }).catch(() => 0),
      prisma.user.count({
        where: {
          role: { in: [USER_ROLES.USER, USER_ROLES.TABLET, USER_ROLES.PC] },
          ...dealerFilter,
        },
      }).catch(() => 0),
      prisma.productItem.count({ where: productFilter }).catch(() => 0),
      prisma.productItem.aggregate({
        where: productFilter,
        _sum: { weight: true },
      }).catch(() => ({ _sum: { weight: 0 } })),
      prisma.supplier.findMany({
        where: dealerFilter,
        orderBy: { hasBalance: 'desc' },
        take: 5,
      }).catch(() => []),
      prisma.supplier.aggregate({
        where: dealerFilter,
        _sum: { hasBalance: true, tlBalance: true },
      }).catch(() => ({ _sum: { hasBalance: 0, tlBalance: 0 } })),
      prisma.transaction.findMany({
        where: dealerFilter,
        orderBy: { createdAt: 'desc' },
        take: 6,
      }).catch(() => []),
      prisma.hasPrice.findUnique({
        where: { id: 'singleton' },
      }).catch(() => null),
      prisma.stock.findMany({
        where: dealerFilter,
      }).catch(() => []),
    ]);

    let sarrafiyeWeight = 0;
    let sarrafiyeCount = 0;

    for (const stock of dealerStocks) {
      if (stock.type === 'sarrafiye' && stock.amount > 0) {
        if (COIN_WEIGHTS_GR[stock.product]) {
          sarrafiyeWeight += stock.amount * COIN_WEIGHTS_GR[stock.product];
          sarrafiyeCount += stock.amount;
        } else if (GRAM_STOCK_PRODUCT_KEYS.includes(stock.product as any)) {
          sarrafiyeWeight += stock.amount;
          sarrafiyeCount += 1;
        }
      }
    }

    const barcodeWeight = stockWeightAgg._sum.weight || 0;
    const barcodeCount = totalProductItemCount;
    const totalStockWeight = barcodeWeight + sarrafiyeWeight;
    const totalStockCount = barcodeCount + Math.round(sarrafiyeCount);

    const criticalStocks = dealerStocks.filter(s => s.amount <= (s.minThreshold || 5));

    return (
      <DashboardClient
        userName={session?.user?.name || 'Kullanıcı'}
        totalUsers={totalUsers}
        adminCount={adminCount}
        staffCount={staffCount}
        totalStockCount={totalStockCount}
        totalStockWeight={totalStockWeight}
        barcodeCount={barcodeCount}
        barcodeWeight={barcodeWeight}
        sarrafiyeCount={Math.round(sarrafiyeCount)}
        sarrafiyeWeight={sarrafiyeWeight}
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
          createdAt: tx.createdAt
            ? (tx.createdAt instanceof Date ? tx.createdAt.toISOString() : new Date(tx.createdAt).toISOString())
            : new Date().toISOString(),
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
        staffCount={0}
        totalStockCount={0}
        totalStockWeight={0}
        barcodeCount={0}
        barcodeWeight={0}
        sarrafiyeCount={0}
        sarrafiyeWeight={0}
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

