import { prisma } from '../src/lib/prisma';

async function testPrismaStock() {
  console.log('Testing prisma.stock.upsert on Turso...');
  const res = await prisma.stock.upsert({
    where: {
      product_dealerId: {
        product: 'TEST_STOCK_1',
        dealerId: 'merkez',
      },
    },
    update: {
      label: 'Test Altın',
      type: 'sarrafiye',
      amount: 10,
      minThreshold: 5,
    },
    create: {
      product: 'TEST_STOCK_1',
      label: 'Test Altın',
      type: 'sarrafiye',
      amount: 10,
      minThreshold: 5,
      dealerId: 'merkez',
    },
  });

  console.log('✓ Successfully upserted stock:', res);

  // Clean up test stock
  await prisma.stock.delete({
    where: {
      product_dealerId: {
        product: 'TEST_STOCK_1',
        dealerId: 'merkez',
      },
    },
  });
  console.log('✓ Test cleanup complete!');
}

testPrismaStock().catch(console.error);
