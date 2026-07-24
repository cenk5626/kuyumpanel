const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const ziynetPrices = await prisma.ziynetPrice.findMany();
  console.log('--- DB ZiynetPrice Records ---');
  console.log(ziynetPrices);
  
  const hasPrice = await prisma.hasPrice.findUnique({ where: { id: 'singleton' } });
  console.log('--- DB HasPrice Record ---');
  console.log(hasPrice);
  
  const settings = await prisma.priceSettings.findUnique({ where: { id: 'singleton' } });
  console.log('--- DB PriceSettings Record ---');
  console.log(settings);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
