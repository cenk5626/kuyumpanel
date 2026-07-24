import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { logActivity } from '@/lib/logger';

const LOG_PREFIX = '[API Products]';

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const action = searchParams.get('action');
    const barcode = searchParams.get('barcode');
    const status = searchParams.get('status'); // IN_STOCK, SOLD, etc.

    const currentUserRole = (session.user as any).role;
    const currentUserDealerId = (session.user as any).dealerId || 'merkez';

    // next-barcode action helper
    if (action === 'next-barcode') {
      const carat = searchParams.get('carat');
      const categoryCode = searchParams.get('categoryCode');
      if (!carat || !categoryCode) {
        return NextResponse.json({ error: 'Ayar ve Kategori Kodu gereklidir.' }, { status: 400 });
      }

      const prefix = `${carat}${categoryCode.toUpperCase()}`;
      
      const lastItem = await prisma.productItem.findFirst({
        where: {
          barcode: {
            startsWith: prefix
          },
          dealerId: currentUserDealerId
        },
        orderBy: {
          barcode: 'desc'
        }
      });

      let nextNum = 1;
      if (lastItem) {
        const numPart = lastItem.barcode.substring(prefix.length);
        const parsed = parseInt(numPart, 10);
        if (!isNaN(parsed)) {
          nextNum = parsed + 1;
        }
      }

      const nextBarcode = `${prefix}${String(nextNum).padStart(5, '0')}`;
      return NextResponse.json({ nextBarcode });
    }

    // If barcode is specified, perform a quick single item lookup
    if (barcode) {
      const item = await prisma.productItem.findUnique({
        where: { barcode },
        include: {
          dealer: {
            select: { name: true }
          }
        }
      });

      if (!item) {
        return NextResponse.json({ error: 'Barkod bulunamadı.' }, { status: 404 });
      }

      // Authorization check (except for SUPER_ADMIN)
      if (currentUserRole !== 'SUPER_ADMIN' && item.dealerId !== currentUserDealerId) {
        return NextResponse.json({ error: 'Bu ürüne erişim yetkiniz yok.' }, { status: 403 });
      }

      return NextResponse.json(item);
    }

    // List products
    let whereClause: any = {};
    if (currentUserRole !== 'SUPER_ADMIN') {
      whereClause.dealerId = currentUserDealerId;
    }
    if (status) {
      whereClause.status = status;
    }

    const items = await prisma.productItem.findMany({
      where: whereClause,
      include: {
        dealer: {
          select: { name: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json(items);
  } catch (error) {
    console.error(`${LOG_PREFIX} GET Error:`, error);
    return NextResponse.json({ error: 'Ürünler listelenemedi.' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { 
      description, 
      quantity, 
      category, 
      subType, 
      subSubType, 
      carat, 
      weight, 
      size, 
      costMilyem, 
      laborMilyem, 
      profitMargin, 
      costPrice, 
      supplierName, 
      customBarcode,
      categoryCode,
      inShowcase, // Vitrinde var mı? (true: Vitrinde var, toptancı carisine işlenme. false: Vitrinde yok / yeni mal, toptancıya Has borç işle)
    } = body;

    if (!carat || !weight || !category) {
      return NextResponse.json({ error: 'Eksik parametreler.' }, { status: 400 });
    }

    const currentUserRole = (session.user as any).role;
    const currentUserDealerId = (session.user as any).dealerId || 'merkez';

    let finalBarcode = customBarcode;

    // Generate automatic barcode if not provided
    if (!finalBarcode) {
      const code = categoryCode || 'XYZ';
      const prefix = `${carat}${code.toUpperCase()}`;
      
      const lastItem = await prisma.productItem.findFirst({
        where: {
          barcode: {
            startsWith: prefix
          },
          dealerId: currentUserDealerId
        },
        orderBy: {
          barcode: 'desc'
        }
      });

      let nextNum = 1;
      if (lastItem) {
        const numPart = lastItem.barcode.substring(prefix.length);
        const parsed = parseInt(numPart, 10);
        if (!isNaN(parsed)) {
          nextNum = parsed + 1;
        }
      }

      finalBarcode = `${prefix}${String(nextNum).padStart(5, '0')}`;
    }

    // Check duplicate barcode
    const duplicate = await prisma.productItem.findUnique({
      where: { barcode: finalBarcode }
    });

    if (duplicate) {
      return NextResponse.json({ error: `${finalBarcode} barkodu zaten tanımlı.` }, { status: 409 });
    }

    const costMilyemNum = parseFloat(costMilyem) || 0;
    const laborMilyemNum = parseFloat(laborMilyem) || 0;
    const weightNum = parseFloat(weight) || 0;
    const qtyNum = parseInt(quantity, 10) || 1;

    const newItem = await prisma.productItem.create({
      data: {
        barcode: finalBarcode,
        title: category, // Ürün adı yerine kategori ismi
        description: description || null,
        quantity: qtyNum,
        category: category || null,
        subType: subType || null,
        subSubType: subSubType || null,
        carat: parseInt(carat, 10),
        weight: weightNum,
        size: size || null,
        costMilyem: costMilyemNum,
        laborMilyem: laborMilyemNum,
        sellingMilyem: body.sellingMilyem != null && body.sellingMilyem !== '' ? parseFloat(body.sellingMilyem) : (costMilyemNum + laborMilyemNum),
        profitMargin: parseFloat(profitMargin) || 0,
        costPrice: costPrice ? parseFloat(costPrice) : null,
        laborType: body.laborType || 'milyem',
        laborCost: laborMilyemNum,
        status: 'IN_STOCK',
        supplierName: supplierName || null,
        dealerId: currentUserDealerId
      },
      include: {
        dealer: {
          select: { name: true }
        }
      }
    });

    // Mal vitrinde yoksa (inShowcase === false) ve Toptancı seçilmişse:
    // Toptancı carisine GİRİŞ MİLYEMİ (Geliş + İşçilik) üzerinden Has borç işlenir.
    const isNotInShowcase = inShowcase === false || body.processSupplierAccount === true;

    if (supplierName && supplierName.trim() && isNotInShowcase) {
      const trimmedSupplier = supplierName.trim();

      // Giriş milyemi = costMilyem + laborMilyem
      const entryMilyem = costMilyemNum + laborMilyemNum;
      // Has Altın borç tutarı = Ağırlık * Giriş Milyemi * Adet
      const addedHasAmount = weightNum * entryMilyem * qtyNum;

      if (addedHasAmount > 0) {
        // Toptancıyı bul veya oluştur
        let supplier = await prisma.supplier.findFirst({
          where: {
            name: trimmedSupplier,
            dealerId: currentUserDealerId,
          },
        });

        if (!supplier) {
          supplier = await prisma.supplier.create({
            data: {
              name: trimmedSupplier,
              dealerId: currentUserDealerId,
              hasBalance: 0,
              tlBalance: 0,
            },
          });
        }

        // Toptancı işlem hareketi ekle
        await prisma.supplierTransaction.create({
          data: {
            supplierId: supplier.id,
            dealerId: currentUserDealerId,
            type: 'PURCHASE',
            hasAmount: addedHasAmount,
            tlAmount: 0,
            documentNo: finalBarcode,
            description: `Toptandan Mal Alımı (Giriş Milyemi): ${category} (${finalBarcode}) - ${weightNum}gr @ Giriş Milyemi ${entryMilyem.toFixed(3)}`,
            employeeName: session.user?.name || null,
          },
        });

        // Toptancı Has bakiyesini güncelle
        await prisma.supplier.update({
          where: { id: supplier.id },
          data: {
            hasBalance: { increment: addedHasAmount },
          },
        });

        // Audit Log
        await logActivity({
          dealerId: currentUserDealerId,
          action: 'Toptancı Mal Alımı (Stok Girişi)',
          details: `${trimmedSupplier} toptancısından mal alımı: ${finalBarcode} (${category}) - ${weightNum}gr @ Giriş Milyemi ${entryMilyem.toFixed(3)} -> +${addedHasAmount.toFixed(3)} gr Has borç carisine eklendi.`,
          userEmail: session.user?.email,
          userName: session.user?.name,
        });
      }
    } else {
      // Vitrinde var seçildiyse carisine borç işlenmez
      await logActivity({
        dealerId: currentUserDealerId,
        action: 'Takı Ürün Girişi',
        details: `Yeni stok eklendi: ${finalBarcode} (${category}) - ${weightNum}gr (Mal vitrinde mevcut, toptancı carisine işlenmedi).`,
        userEmail: session.user?.email,
        userName: session.user?.name,
      });
    }

    return NextResponse.json(newItem, { status: 201 });
  } catch (error) {
    console.error(`${LOG_PREFIX} POST Error:`, error);
    return NextResponse.json({ error: 'Ürün eklenemedi.' }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { 
      id, 
      description, 
      quantity, 
      category, 
      subType, 
      subSubType, 
      carat, 
      weight, 
      size, 
      costMilyem, 
      laborMilyem, 
      profitMargin, 
      costPrice, 
      status,
      supplierName 
    } = body;

    if (!id) {
      return NextResponse.json({ error: 'Ürün ID gerekli.' }, { status: 400 });
    }

    const existing = await prisma.productItem.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Ürün bulunamadı.' }, { status: 404 });
    }

    const currentUserRole = (session.user as any).role;
    const currentUserDealerId = (session.user as any).dealerId || 'merkez';

    if (currentUserRole !== 'SUPER_ADMIN' && existing.dealerId !== currentUserDealerId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const updateData: any = {};
    if (description !== undefined) updateData.description = description;
    if (quantity !== undefined) updateData.quantity = parseInt(quantity, 10) || 1;
    if (category !== undefined) {
      updateData.category = category;
      updateData.title = category;
    }
    if (subType !== undefined) updateData.subType = subType;
    if (subSubType !== undefined) updateData.subSubType = subSubType;
    if (carat !== undefined) updateData.carat = parseInt(carat, 10);
    if (weight !== undefined) updateData.weight = parseFloat(weight);
    if (size !== undefined) updateData.size = size;
    if (costMilyem !== undefined) updateData.costMilyem = parseFloat(costMilyem) || 0;
    if (body.sellingMilyem !== undefined) updateData.sellingMilyem = body.sellingMilyem !== '' ? parseFloat(body.sellingMilyem) : null;
    if (laborMilyem !== undefined) {
      updateData.laborMilyem = parseFloat(laborMilyem) || 0;
      updateData.laborCost = parseFloat(laborMilyem) || 0;
    }
    if (profitMargin !== undefined) updateData.profitMargin = parseFloat(profitMargin) || 0;
    if (body.laborType !== undefined) updateData.laborType = body.laborType;
    if (costPrice !== undefined) updateData.costPrice = costPrice ? parseFloat(costPrice) : null;
    if (status !== undefined) updateData.status = status;
    if (supplierName !== undefined) updateData.supplierName = supplierName;

    const updated = await prisma.productItem.update({
      where: { id },
      data: updateData,
      include: {
        dealer: {
          select: { name: true }
        }
      }
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error(`${LOG_PREFIX} PUT Error:`, error);
    return NextResponse.json({ error: 'Ürün güncellenemedi.' }, { status: 500 });
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

    if (!id) {
      return NextResponse.json({ error: 'ID parametresi gereklidir.' }, { status: 400 });
    }

    const existing = await prisma.productItem.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Ürün bulunamadı.' }, { status: 404 });
    }

    const currentUserRole = (session.user as any).role;
    const currentUserDealerId = (session.user as any).dealerId || 'merkez';

    if (currentUserRole !== 'SUPER_ADMIN' && existing.dealerId !== currentUserDealerId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await prisma.productItem.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(`${LOG_PREFIX} DELETE Error:`, error);
    return NextResponse.json({ error: 'Ürün silinemedi.' }, { status: 500 });
  }
}
