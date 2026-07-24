import { PrismaClient } from '@prisma/client';
import { hash } from 'bcryptjs';

const prisma = new PrismaClient();

const SALT_ROUNDS = 12;

const SEED_ADMIN = {
  name: 'Super Admin',
  email: 'admin@kuyumpanel.com',
  password: 'admin123',
  role: 'SUPER_ADMIN',
} as const;

async function main() {
  console.log('Veritabanı seed başlatılıyor...');

  const existingAdmin = await prisma.user.findUnique({
    where: { email: SEED_ADMIN.email },
  });

  if (!existingAdmin) {
    const hashedPassword = await hash(SEED_ADMIN.password, SALT_ROUNDS);
    await prisma.user.create({
      data: {
        name: SEED_ADMIN.name,
        email: SEED_ADMIN.email,
        password: hashedPassword,
        role: SEED_ADMIN.role,
      },
    });
    console.log(`Super Admin oluşturuldu: ${SEED_ADMIN.email}`);
  } else {
    console.log('Super Admin zaten mevcut, atlanıyor.');
  }

  console.log('Seed tamamlandı!');
}

main()
  .catch((e) => {
    console.error('Seed hatası:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
