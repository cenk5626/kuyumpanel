import { prisma } from '../src/lib/prisma';

async function testTransactionCreate() {
  console.log('Testing transaction create on Turso...');

  // Ensure dealer exists
  await prisma.dealer.upsert({
    where: { id: 'merkez' },
    create: { id: 'merkez', name: 'Merkez Mağaza' },
    update: {},
  });

  const tx = await prisma.transaction.create({
    data: {
      type: 'sell',
      productType: 'sarrafiye',
      productCode: 'ECEYREKTL',
      quantity: 1,
      price: 5500,
      total: 5500,
      costPrice: 5350,
      profitAmount: 150,
      profitMargin: 2.8,
      isSuspicious: false,
      paymentMethod: 'CASH',
      dealerId: 'merkez',
      employeeName: 'Admin',
    },
  });

  console.log('✓ Successfully created test transaction:', tx);

  // Clean up
  await prisma.transaction.delete({
    where: { id: tx.id },
  });

  console.log('✓ Test cleanup complete!');
}

testTransactionCreate().catch(console.error);
