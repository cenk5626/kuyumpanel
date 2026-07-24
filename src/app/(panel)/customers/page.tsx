import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
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

  // Bakiyeleri hesapla ve serialize et
  const serializedCustomers = dbCustomers.map(c => {
    let tlBalance = 0;
    let usdBalance = 0;
    let eurBalance = 0;
    let totalHasEquivalent = 0;

    c.transactions.forEach(tx => {
      const isDebt = tx.type === 'BORC';
      const sign = isDebt ? 1 : -1;

      totalHasEquivalent += (tx.hasEquivalent || 0) * sign;

      if (tx.assetType === 'TL') {
        tlBalance += tx.amount * sign;
      } else if (tx.assetType === 'USD') {
        usdBalance += tx.amount * sign;
      } else if (tx.assetType === 'EUR') {
        eurBalance += tx.amount * sign;
      }
    });

    return {
      id: c.id,
      name: c.name,
      phone: c.phone,
      email: c.email,
      tcNo: c.tcNo,
      address: c.address,
      note: c.note,
      dealerId: c.dealerId,
      tlBalance,
      usdBalance,
      eurBalance,
      totalHasEquivalent,
      transactionCount: c.transactions.length,
      createdAt: c.createdAt.toISOString(),
    };
  });

  // Canlı Has ve döviz fiyatlarını al
  const livePrices = await prisma.livePrice.findMany();
  const liveHasPrice = livePrices.find(p => p.id === 'GAUTRY')?.ask || 3000;
  const liveUsdPrice = livePrices.find(p => p.id === 'USDTRY')?.ask || 35;
  const liveEurPrice = livePrices.find(p => p.id === 'EURTRY')?.ask || 38;

  return (
    <CustomersClient
      initialCustomers={serializedCustomers}
      liveHasPrice={liveHasPrice}
      liveUsdPrice={liveUsdPrice}
      liveEurPrice={liveEurPrice}
    />
  );
}
