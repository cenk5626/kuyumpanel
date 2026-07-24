import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log('--- Checking Dealers in DB ---');
  const dealers = await prisma.dealer.findMany({
    include: {
      users: true,
      stocks: true,
      transactions: true,
    }
  });
  console.log(JSON.stringify(dealers, null, 2));

  console.log('--- Checking Users and Roles ---');
  const users = await prisma.user.findMany({
    include: {
      dealer: true
    }
  });
  console.log(users.map(u => ({
    name: u.name,
    email: u.email,
    role: u.role,
    dealerName: u.dealer?.name ?? 'None'
  })));
}

main().catch(console.error).finally(() => prisma.$disconnect());
