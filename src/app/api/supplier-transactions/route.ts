import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedContext, assertTenantOwnership } from '@/lib/security/auth-context';

export const dynamic = 'force-dynamic';

const LOG_PREFIX = '[API SupplierTransactions]';

export async function GET(req: Request) {
  try {
    const ctx = await getAuthenticatedContext();
    const currentUserRole = ctx.role;
    const currentUserDealerId = ctx.dealerId;

    const { searchParams } = new URL(req.url);
    const supplierId = searchParams.get('supplierId');

    if (!supplierId) {
      return NextResponse.json({ error: 'supplierId parametresi zorunludur.' }, { status: 400 });
    }

    const supplier = await prisma.supplier.findUnique({ where: { id: supplierId } });
    if (!supplier) {
      return NextResponse.json({ error: 'Toptancı bulunamadı.' }, { status: 404 });
    }
    assertTenantOwnership(ctx, supplier.dealerId, 'Toptancı');

    const transactions = await prisma.supplierTransaction.findMany({
      where: { supplierId },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(transactions);
  } catch (error: any) {
    console.error(`${LOG_PREFIX} GET Error:`, error);
    return NextResponse.json({ error: error?.message || 'Toptancı işlemleri yüklenemedi.' }, { status: error?.statusCode || 500 });
  }
}

export async function POST(req: Request) {
  try {
    const ctx = await getAuthenticatedContext();
    const currentUserRole = ctx.role;
    const currentUserDealerId = ctx.dealerId;
    const currentUserName = ctx.userName || 'Kullanıcı';

    const body = await req.json();
    const { 
      supplierId, 
      type, 
      hasAmount, 
      tlAmount, 
      unitPrice, 
      documentNo, 
      description 
    } = body;

    if (!supplierId || !type) {
      return NextResponse.json({ error: 'supplierId ve işlem türü zorunludur.' }, { status: 400 });
    }

    const supplier = await prisma.supplier.findUnique({ where: { id: supplierId } });
    if (!supplier) {
      return NextResponse.json({ error: 'Toptancı bulunamadı.' }, { status: 404 });
    }
    assertTenantOwnership(ctx, supplier.dealerId, 'Toptancı');

    const parsedHas = parseFloat(hasAmount) || 0;
    const parsedTl = parseFloat(tlAmount) || 0;
    const parsedUnitPrice = unitPrice ? parseFloat(unitPrice) : null;

    // Prisma Transaction ile hem işlemi kaydet hem toptancı bakiyesini güncelle
    const [transaction, updatedSupplier] = await prisma.$transaction(async (tx) => {
      // 1. İşlem kaydı
      const newTx = await tx.supplierTransaction.create({
        data: {
          supplierId,
          dealerId: currentUserDealerId,
          type, // "PURCHASE" | "HAS_PAYMENT" | "TL_PAYMENT" | "SETTLEMENT"
          hasAmount: parsedHas,
          tlAmount: parsedTl,
          unitPrice: parsedUnitPrice,
          documentNo: documentNo ? String(documentNo).trim() : null,
          description: description ? String(description).trim() : null,
          employeeName: currentUserName,
        },
      });

      // 2. Bakiye güncelleme hesabı
      // Mal Alımı (PURCHASE): Biz toptancıdan mal aldık -> Toptancıya borcumuz artar (+)
      // Has Ödemesi (HAS_PAYMENT): Toptancıya Has Altın verdik -> Has borcumuz azalır (-)
      // TL Ödemesi (TL_PAYMENT): Toptancıya TL Ödedik -> TL borcumuz azalır (-)
      // Mutabakat (SETTLEMENT): Doğrudan bakiyeyi belirler / ayarlar

      let newHasBalance = supplier.hasBalance;
      let newTlBalance = supplier.tlBalance;

      if (type === 'PURCHASE') {
        newHasBalance += parsedHas;
        newTlBalance += parsedTl;
      } else if (type === 'HAS_PAYMENT') {
        newHasBalance -= parsedHas;
      } else if (type === 'TL_PAYMENT') {
        newTlBalance -= parsedTl;
      } else if (type === 'SETTLEMENT') {
        // Mutabakat düzeltmesinde fark kadar veya belirtilen miktarda güncelleme
        newHasBalance = parsedHas;
        newTlBalance = parsedTl;
      }

      const sup = await tx.supplier.update({
        where: { id: supplierId },
        data: {
          hasBalance: newHasBalance,
          tlBalance: newTlBalance,
        },
      });

      return [newTx, sup];
    });

    return NextResponse.json({
      transaction,
      supplier: updatedSupplier,
    }, { status: 201 });
  } catch (error: any) {
    console.error(`${LOG_PREFIX} POST Error:`, error);
    return NextResponse.json({ error: error?.message || 'Toptancı işlemi kaydedilemedi.' }, { status: error?.statusCode || 500 });
  }
}

