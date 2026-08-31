const { prisma } = require('./src/lib/prisma');

async function testRAG() {
  console.log('Testing getStoreContext with Prisma on Turso...');
  const dealer = await prisma.dealer.findFirst();
  console.log('Dealer found:', dealer?.name, dealer?.id);
  
  if (dealer) {
    const productItems = await prisma.productItem.findMany({
      where: { dealerId: dealer.id, status: 'IN_STOCK' },
    });
    console.log('Product items query success! Count:', productItems.length);

    const customers = await prisma.customer.findMany({
      where: { dealerId: dealer.id },
    });
    console.log('Customers query success! Count:', customers.length);

    const suppliers = await prisma.supplier.findMany({
      where: { dealerId: dealer.id },
    });
    console.log('Suppliers query success! Count:', suppliers.length);

    const session = await prisma.cashRegisterSession.findFirst({
      where: { dealerId: dealer.id, status: 'OPEN' },
    });
    console.log('Cash register session query success!');
  }

  console.log('ALL PRISMA QUERIES SUCCEEDED 100%!');
}

testRAG().catch(console.error);
