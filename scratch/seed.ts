import { PrismaClient } from '@prisma/client';
import { hash } from 'bcryptjs';

const prisma = new PrismaClient();
const SALT_ROUNDS = 12;

async function main() {
  // 1. "merkez" bayisini oluştur veya güncelle
  const defaultDealer = await prisma.dealer.upsert({
    where: { id: 'merkez' },
    update: {},
    create: {
      id: 'merkez',
      name: 'Merkez Grup',
    },
  });
  console.log('Default dealer seeded:', defaultDealer);

  // 2. Eğer hiç kullanıcı yoksa, varsayılan bir admin oluştur ve "merkez" bayisine bağla
  const userCount = await prisma.user.count();
  if (userCount === 0) {
    const hashedPassword = await hash('admin123', SALT_ROUNDS);
    const defaultAdmin = await prisma.user.create({
      data: {
        name: 'Super Admin',
        email: 'admin@kuyumpanel.com',
        password: hashedPassword,
        role: 'SUPER_ADMIN',
        dealerId: 'merkez',
      },
    });
    console.log('Default super admin created:', defaultAdmin.email);
  } else {
    // Mevcut tüm kullanıcıları "merkez" bayisine bağla (null olanları)
    const updatedUsers = await prisma.user.updateMany({
      where: { dealerId: null },
      data: { dealerId: 'merkez' },
    });
    console.log(`Associated ${updatedUsers.count} existing users to center dealer.`);
  }
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
