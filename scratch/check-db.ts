import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const hasPrices = await prisma.hasPrice.findMany();
  const ziynetPrices = await prisma.ziynetPrice.findMany();
  const stocks = await prisma.stock.findMany();
  console.log('--- HAS PRICES ---');
  console.log(hasPrices);
  console.log('--- ZIYNET PRICES ---');
  console.log(ziynetPrices);
  console.log('--- STOCKS ---');
  console.log(stocks);
}

main().catch(console.error);
