import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hash } from 'bcryptjs';

const SALT_ROUNDS = 12;

/**
 * GET /api/seed — Veritabanına varsayılan Super Admin kullanıcısını ekler
 */
export async function GET() {
  try {
    const email = 'admin@kuyumpanel.com';
    const password = 'admin123';

    const existingAdmin = await prisma.user.findUnique({
      where: { email },
    });

    if (!existingAdmin) {
      const hashedPassword = await hash(password, SALT_ROUNDS);
      const user = await prisma.user.create({
        data: {
          name: 'Super Admin',
          email,
          password: hashedPassword,
          role: 'SUPER_ADMIN',
          permissions: '["dashboard","prices","stocks","transactions","suppliers","customers","logs","price-check","users"]',
        },
      });

      return NextResponse.json({
        success: true,
        message: 'Super Admin kullanıcısı veritabanına başarıyla eklendi!',
        user: { email: user.email, role: user.role },
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Super Admin kullanıcısı veritabanında zaten mevcut.',
      user: { email: existingAdmin.email, role: existingAdmin.role },
    });
  } catch (error: any) {
    console.error('[API Seed Error]:', error);
    return NextResponse.json(
      { success: false, error: error?.message || String(error) },
      { status: 500 }
    );
  }
}
