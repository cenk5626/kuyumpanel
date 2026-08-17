import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { calculateCustomerBalancesFromTransactions } from '@/lib/cari';
import CustomersClient from './CustomersClient';

export default async function CustomersPage() {
  const session = await auth();
  if (!session) {
    redirect('/login');
  }

  const currentUserRole = (session.user as any).role;
  const currentUserDealerId = (session.user as any).dealerId || 'merkez';

  let whereClause: any = {};
  if (currentUserRole !== 'SUPER_ADMIN') {
    whereClause.dealerId = currentUserDealerId;
  }

  // Müşterileri çek
  const dbCustomers = await prisma.customer.findMany({
    where: whereClause,
    include: {
      transactions: true,
    },
    orderBy: { name: 'asc' },
  });

  // Bakiyeleri cari motoru ile hesapla ve serialize et
  const serializedCustomers = dbCustomers.map((c) => {
    const balances = calculateCustomerBalancesFromTransactions(c.transactions);

    return {
      id: c.id,
      name: c.name,
      phone: c.phone,
      email: c.email,
      tcNo: c.tcNo,
      address: c.address,
      note: c.note,
      dealerId: c.dealerId,
      tlBalance: balances.tlBalance,
      usdBalance: balances.usdBalance,
      eurBalance: balances.eurBalance,
      hasBalance: balances.hasBalance,
      totalHasEquivalent: balances.totalHasEquivalent,
      transactionCount: c.transactions.length,
      createdAt: c.createdAt.toISOString(),
    };
  });

  // Canlı Has ve döviz fiyatlarını al
  const livePrices = await prisma.livePrice.findMany();
  const liveHasPrice = livePrices.find((p) => p.id === 'GAUTRY')?.ask || 3000;
  const liveUsdPrice = livePrices.find((p) => p.id === 'USDTRY')?.ask || 35;
  const liveEurPrice = livePrices.find((p) => p.id === 'EURTRY')?.ask || 38;

  return (
    <CustomersClient
      initialCustomers={serializedCustomers}
      liveHasPrice={liveHasPrice}
      liveUsdPrice={liveUsdPrice}
      liveEurPrice={liveEurPrice}
    />
  );
}
