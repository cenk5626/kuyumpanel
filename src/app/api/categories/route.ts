import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedContext, assertTenantOwnership } from '@/lib/security/auth-context';

export const dynamic = 'force-dynamic';

const LOG_PREFIX = '[API Categories]';

export async function GET() {
  try {
    const ctx = await getAuthenticatedContext();
    const currentUserDealerId = ctx.dealerId;

    await prisma.dealer.upsert({
      where: { id: currentUserDealerId },
      create: { id: currentUserDealerId, name: currentUserDealerId === 'merkez' ? 'Merkez Mağaza' : currentUserDealerId },
      update: {},
    });

    let categories = await prisma.category.findMany({
      where: { dealerId: currentUserDealerId },
      include: {
        subCategories: {
          include: {
            subSubCategories: true,
          },
        },
      },
      orderBy: { name: 'asc' },
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
        { name: 'Sarrafiye', code: 'SRF', subs: ['Gram Altın', 'Çeyrek', 'Yarım', 'Tam'] },
      ];

      for (const def of defaults) {
        await prisma.category.create({
          data: {
            name: def.name,
            code: def.code,
            dealerId: currentUserDealerId,
            subCategories: {
              create: def.subs.map((s) => ({ name: s })),
            },
          },
        });
      }

      categories = await prisma.category.findMany({
        where: { dealerId: currentUserDealerId },
        include: {
          subCategories: {
            include: {
              subSubCategories: true,
            },
          },
        },
        orderBy: { name: 'asc' },
      });
    }

    return NextResponse.json(categories);
  } catch (error: any) {
    console.error(`${LOG_PREFIX} GET Error:`, error);
    return NextResponse.json({ error: error?.message || 'Kategoriler yüklenemedi.' }, { status: error?.statusCode || 500 });
  }
}

export async function POST(req: Request) {
  try {
    const ctx = await getAuthenticatedContext();
    const currentUserDealerId = ctx.dealerId;
    const currentUserRole = ctx.role;

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
        where: { name, dealerId: currentUserDealerId },
      });
      if (existing) {
        return NextResponse.json({ error: 'Bu kategori zaten mevcut.' }, { status: 400 });
      }

      const newCategory = await prisma.category.create({
        data: {
          name,
          code: code.toUpperCase(),
          dealerId: currentUserDealerId,
        },
      });
      return NextResponse.json(newCategory, { status: 201 });
    }

    if (type === 'subCategory') {
      if (!categoryId) {
        return NextResponse.json({ error: 'Kategori ID gereklidir.' }, { status: 400 });
      }

      const parentCat = await prisma.category.findUnique({ where: { id: categoryId } });
      if (!parentCat) {
        return NextResponse.json({ error: 'Üst kategori bulunamadı.' }, { status: 404 });
      }
      assertTenantOwnership(ctx, parentCat.dealerId, 'Kategori');

      const newSub = await prisma.subCategory.create({
        data: {
          name,
          categoryId,
        },
      });
      return NextResponse.json(newSub, { status: 201 });
    }

    if (type === 'subSubCategory') {
      if (!subCategoryId) {
        return NextResponse.json({ error: 'Alt Kategori ID gereklidir.' }, { status: 400 });
      }

      const parentSub = await prisma.subCategory.findUnique({
        where: { id: subCategoryId },
        include: { category: true },
      });
      if (!parentSub) {
        return NextResponse.json({ error: 'Üst kategori bulunamadı.' }, { status: 404 });
      }
      assertTenantOwnership(ctx, parentSub.category.dealerId, 'Kategori');

      const newSubSub = await prisma.subSubCategory.create({
        data: {
          name,
          subCategoryId,
        },
      });
      return NextResponse.json(newSubSub, { status: 201 });
    }

    return NextResponse.json({ error: 'Geçersiz ekleme türü.' }, { status: 400 });
  } catch (error: any) {
    console.error(`${LOG_PREFIX} POST Error:`, error);
    return NextResponse.json({ error: error?.message || 'Kategori kaydedilemedi.' }, { status: error?.statusCode || 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const ctx = await getAuthenticatedContext();
    const currentUserDealerId = ctx.dealerId;
    const currentUserRole = ctx.role;

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const type = searchParams.get('type'); // category, subCategory, subSubCategory

    if (!id || !type) {
      return NextResponse.json({ error: 'Eksik parametreler.' }, { status: 400 });
    }

    if (type === 'category') {
      const cat = await prisma.category.findUnique({ where: { id } });
      if (!cat) return NextResponse.json({ error: 'Kategori bulunamadı.' }, { status: 404 });
      assertTenantOwnership(ctx, cat.dealerId, 'Kategori');
      await prisma.category.delete({ where: { id } });
    } else if (type === 'subCategory') {
      const sub = await prisma.subCategory.findUnique({
        where: { id },
        include: { category: true },
      });
      if (!sub) return NextResponse.json({ error: 'Kategori bulunamadı.' }, { status: 404 });
      assertTenantOwnership(ctx, sub.category.dealerId, 'Kategori');
      await prisma.subCategory.delete({ where: { id } });
    } else if (type === 'subSubCategory') {
      const subSub = await prisma.subSubCategory.findUnique({
        where: { id },
        include: { subCategory: { include: { category: true } } },
      });
      if (!subSub) return NextResponse.json({ error: 'Kategori bulunamadı.' }, { status: 404 });
      assertTenantOwnership(ctx, subSub.subCategory.category.dealerId, 'Kategori');
      await prisma.subSubCategory.delete({ where: { id } });
    } else {
      return NextResponse.json({ error: 'Geçersiz silme türü.' }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error(`${LOG_PREFIX} DELETE Error:`, error);
    return NextResponse.json({ error: error?.message || 'Kategori silinemedi.' }, { status: error?.statusCode || 500 });
  }
}

