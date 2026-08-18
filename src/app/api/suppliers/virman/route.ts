import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { logActivity } from '@/lib/logger';
import { validateVirmanInput } from '@/lib/suppliers/virman';

/**
 * POST /api/suppliers/virman — İki toptancı arasında TL veya Has Altın virman transferi yapar
 */
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const dealerId = (session.user as any)?.dealerId || 'merkez';
    const userEmail = session.user?.email;
    const userName = session.user?.name;

    const body = await req.json();
    const { fromSupplierId, toSupplierId, assetType, amount, unitPrice, description } = body;

    const validation = validateVirmanInput({
      fromSupplierId,
      toSupplierId,
      assetType,
      amount: Number(amount),
      unitPrice: unitPrice ? Number(unitPrice) : null,
      description,
    });

    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    // Toptancıları bul
    const [fromSupplier, toSupplier] = await Promise.all([
      prisma.supplier.findUnique({ where: { id: fromSupplierId } }),
      prisma.supplier.findUnique({ where: { id: toSupplierId } }),
    ]);

    if (!fromSupplier || !toSupplier) {
      return NextResponse.json({ error: 'Kaynak veya hedef toptancı bulunamadı.' }, { status: 404 });
    }

    const numAmount = Number(amount);
    const numUnitPrice = unitPrice ? Number(unitPrice) : null;

    // Atomik Virman İşlemi: Çıkış ve Giriş hareketlerini kaydet, bakiyeleri güncelle
    const result = await prisma.$transaction(async (tx) => {
      const isHas = assetType === 'HAS';
      const hasAmount = isHas ? numAmount : 0;
      const tlAmount = isHas ? 0 : numAmount;

      // 1. Kaynak Toptancıdan Borç Düşümü (VIRMAN_OUT)
      // Virman yapıldığında kaynak toptancıya olan borcumuz düşer (bakiye azalır)
      const outTx = await tx.supplierTransaction.create({
        data: {
          supplierId: fromSupplierId,
          dealerId,
          type: 'VIRMAN_OUT',
          hasAmount,
          tlAmount,
          unitPrice: numUnitPrice,
          targetSupplierId: toSupplierId,
          targetSupplierName: toSupplier.name,
          description: description || `Virman Çıkışı -> ${toSupplier.name}`,
          employeeName: userName || 'Sistem',
        },
      });

      // 2. Hedef Toptancıya Borç Eklenmesi (VIRMAN_IN)
      // Hedef toptancıya olan borcumuz artar (bakiye artar)
      const inTx = await tx.supplierTransaction.create({
        data: {
          supplierId: toSupplierId,
          dealerId,
          type: 'VIRMAN_IN',
          hasAmount,
          tlAmount,
          unitPrice: numUnitPrice,
          targetSupplierId: fromSupplierId,
          targetSupplierName: fromSupplier.name,
          description: description || `Virman Girişi <- ${fromSupplier.name}`,
          employeeName: userName || 'Sistem',
        },
      });

      // 3. Bakiyeleri güncelle
      await tx.supplier.update({
        where: { id: fromSupplierId },
        data: isHas
          ? { hasBalance: fromSupplier.hasBalance - numAmount }
          : { tlBalance: fromSupplier.tlBalance - numAmount },
      });

      await tx.supplier.update({
        where: { id: toSupplierId },
        data: isHas
          ? { hasBalance: toSupplier.hasBalance + numAmount }
          : { tlBalance: toSupplier.tlBalance + numAmount },
      });

      return { outTx, inTx };
    });

    await logActivity({
      dealerId,
      action: 'Toptancı Virman İşlemi',
      details: `${fromSupplier.name} -> ${toSupplier.name} arasına ${amount} ${assetType} virman transferi yapıldı.`,
      userEmail,
      userName,
    }).catch(() => {});

    return NextResponse.json({
      success: true,
      fromSupplierName: fromSupplier.name,
      toSupplierName: toSupplier.name,
      assetType,
      amount: numAmount,
      fromTransactionId: result.outTx.id,
      toTransactionId: result.inTx.id,
    });
  } catch (error) {
    console.error('[API Supplier Virman] Error:', error);
    return NextResponse.json({ error: 'Virman işlemi gerçekleştirilemedi.' }, { status: 500 });
  }
}
