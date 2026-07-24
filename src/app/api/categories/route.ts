import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';

const LOG_PREFIX = '[API Categories]';

export async function GET() {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const currentUserDealerId = (session.user as any).dealerId || 'merkez';

    let categories = await prisma.category.findMany({
      where: { dealerId: currentUserDealerId },
      include: {
        subCategories: {
          include: {
            subSubCategories: true
          }
        }
      },
      orderBy: { name: 'asc' }
    });

    if (categories.length === 0) {
      const defaults = [
        { name: 'Bilezik', code: 'BLZ', subs: ['Ajda', 'Adana Burma', 'Desenli', 'Hediyelik'] },
        { name: 'Küpe', code: 'KP', subs: ['Halka', 'Sallantılı', 'Klipsli', 'Tektaş'] },
        { name: 'Kolye', code: 'KLY', subs: ['Uçlu Kolye', 'Zincir Kolye', 'Madalyon'] },
        { name: 'Yüzük', code: 'YZK', subs: ['Alyans', 'Baget', 'Tektaş', 'Beştaş', 'Tamtur'] },
        { name: 'Bileklik', code: 'BLK', subs: ['Künye', 'Şahmeran', 'Su Yolu'] },
        { name: 'Zincir', code: 'ZNC', subs: ['Halat', 'Doç', 'Singapur', 'Kral'] },
        { name: 'Gerdanlık', code: 'GRD', subs: ['Set', 'Trabzon Hasırı', 'Su Yolu'] },
        { name: 'Sarrafiye', code: 'SRF', subs: ['Gram Altın', 'Çeyrek', 'Yarım', 'Tam'] }
      ];

      for (const def of defaults) {
        await prisma.category.create({
          data: {
            name: def.name,
            code: def.code,
            dealerId: currentUserDealerId,
            subCategories: {
              create: def.subs.map(s => ({ name: s }))
            }
          }
        });
      }

      categories = await prisma.category.findMany({
        where: { dealerId: currentUserDealerId },
        include: {
          subCategories: {
            include: {
              subSubCategories: true
            }
          }
        },
        orderBy: { name: 'asc' }
      });
    }

    return NextResponse.json(categories);
  } catch (error) {
    console.error(`${LOG_PREFIX} GET Error:`, error);
    return NextResponse.json({ error: 'Kategoriler yüklenemedi.' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const currentUserDealerId = (session.user as any).dealerId || 'merkez';
    const body = await req.json();
    const { type, name, code, categoryId, subCategoryId } = body;

    if (!name) {
      return NextResponse.json({ error: 'İsim alanı zorunludur.' }, { status: 400 });
    }

    if (type === 'category') {
      if (!code) {
        return NextResponse.json({ error: 'Kategori kısaltma kodu zorunludur.' }, { status: 400 });
      }

      // Check duplicates
      const existing = await prisma.category.findFirst({
        where: { name, dealerId: currentUserDealerId }
      });
      if (existing) {
        return NextResponse.json({ error: 'Bu kategori zaten mevcut.' }, { status: 400 });
      }

      const newCategory = await prisma.category.create({
        data: {
          name,
          code: code.toUpperCase(),
          dealerId: currentUserDealerId
        }
      });
      return NextResponse.json(newCategory, { status: 201 });
    }

    if (type === 'subCategory') {
      if (!categoryId) {
        return NextResponse.json({ error: 'Kategori ID gereklidir.' }, { status: 400 });
      }

      const newSub = await prisma.subCategory.create({
        data: {
          name,
          categoryId
        }
      });
      return NextResponse.json(newSub, { status: 201 });
    }

    if (type === 'subSubCategory') {
      if (!subCategoryId) {
        return NextResponse.json({ error: 'Alt Kategori ID gereklidir.' }, { status: 400 });
      }

      const newSubSub = await prisma.subSubCategory.create({
        data: {
          name,
          subCategoryId
        }
      });
      return NextResponse.json(newSubSub, { status: 201 });
    }

    return NextResponse.json({ error: 'Geçersiz ekleme türü.' }, { status: 400 });
  } catch (error) {
    console.error(`${LOG_PREFIX} POST Error:`, error);
    return NextResponse.json({ error: 'Kategori kaydedilemedi.' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const type = searchParams.get('type'); // category, subCategory, subSubCategory

    if (!id || !type) {
      return NextResponse.json({ error: 'Eksik parametreler.' }, { status: 400 });
    }

    if (type === 'category') {
      await prisma.category.delete({ where: { id } });
    } else if (type === 'subCategory') {
      await prisma.subCategory.delete({ where: { id } });
    } else if (type === 'subSubCategory') {
      await prisma.subSubCategory.delete({ where: { id } });
    } else {
      return NextResponse.json({ error: 'Geçersiz silme türü.' }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(`${LOG_PREFIX} DELETE Error:`, error);
    return NextResponse.json({ error: 'Kategori silinemedi.' }, { status: 500 });
  }
}
