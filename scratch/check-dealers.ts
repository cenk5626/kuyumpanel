import 'dotenv/config';
import { prisma } from '../src/lib/prisma';

async function checkDealers() {
  const dealers = await prisma.dealer.findMany();
  console.log('Dealers in DB:', JSON.stringify(dealers, null, 2));
  const users = await prisma.user.findMany({ select: { id: true, email: true, role: true, dealerId: true } });
  console.log('Users in DB:', JSON.stringify(users, null, 2));
  process.exit(0);
}

checkDealers().catch((err) => {
  console.error(err);
  process.exit(1);
});
