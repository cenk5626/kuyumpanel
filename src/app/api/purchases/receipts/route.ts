import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedContext, assertTenantOwnership } from '@/lib/security/auth-context';
import { PO_STATUS, PO_LINE_STATUS } from '@/constants/purchase';
import {
  generateGoodsReceiptNumber,
  getCaratMilyem,
  calculateHasEquivalent,
  calculateWeightVariance,
} from '@/lib/purchase/variance-calculator';
import { logActivity } from '@/lib/logger';
import { sanitizeBody } from '@/lib/security/validation';
import { ensureDefaultBranch } from '@/lib/branch/bootstrap';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const ctx = await getAuthenticatedContext();
    const dealerId = ctx.dealerId;

    const { searchParams } = new URL(req.url);
    const supplierId = searchParams.get('supplierId');
    const purchaseOrderId = searchParams.get('purchaseOrderId');
    const branchId = searchParams.get('branchId');

    const whereClause: any = { dealerId };
    if (supplierId) whereClause.supplierId = supplierId;
    if (purchaseOrderId) whereClause.purchaseOrderId = purchaseOrderId;
    if (branchId) whereClause.branchId = branchId;

    const receipts = await prisma.goodsReceipt.findMany({
      where: whereClause,
      include: {
        supplier: {
          select: { id: true, name: true, phone: true },
        },
        purchaseOrder: {
          select: { id: true, orderNumber: true, orderDate: true, status: true },
        },
        branch: {
          select: { id: true, name: true, code: true },
        },
        lines: true,
      },
      orderBy: { receiptDate: 'desc' },
      take: 200,
    });

    return NextResponse.json({ receipts });
  } catch (error: any) {
    if (error.statusCode === 401 || error.statusCode === 403) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error('[API Goods Receipts] GET Error:', error);
    return NextResponse.json({ error: 'Mal kabul kayıtları alınamadı.' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const ctx = await getAuthenticatedContext();
    const dealerId = ctx.dealerId;

    const rawBody = await req.json();
    const body = sanitizeBody(rawBody, [
      'supplierId',
      'purchaseOrderId',
      'branchId',
      'invoiceNumber',
      'notes',
      'lines',
    ] as const);

    const {
      supplierId,
      purchaseOrderId,
      branchId: targetBranchId,
      invoiceNumber,
      notes,
      lines,
    } = body;

    if (!supplierId) {
      return NextResponse.json({ error: 'Tedarikçi (toptancı) seçilmelidir.' }, { status: 400 });
    }

    if (!lines || !Array.isArray(lines) || lines.length === 0) {
      return NextResponse.json({ error: 'En az bir mal kabul kalemi girilmelidir.' }, { status: 400 });
    }

    const supplier = await prisma.supplier.findUnique({
      where: { id: supplierId },
    });
    if (!supplier) {
      return NextResponse.json({ error: 'Tedarikçi bulunamadı.' }, { status: 404 });
    }
    assertTenantOwnership(ctx, supplier.dealerId, 'Supplier');

    // Şube belirleme
    let branchId = targetBranchId;
    if (!branchId) {
      branchId = await ensureDefaultBranch(dealerId);
    }

    // Makbuz numarası
    const existingCount = await prisma.goodsReceipt.count({ where: { dealerId } });
    const receiptNumber = generateGoodsReceiptNumber(existingCount);

    let totalWeight = 0;
    let totalHas = 0;
    let totalLabor = 0;

    const processedLines = lines.map((line: any) => {
      const carat = Number(line.carat) || 14;
      const milyem = Number(line.milyem) || getCaratMilyem(carat);
      const actualWeight = Number(line.actualWeight) || 0;
      const quantity = Number(line.quantity) || 1;
      const laborCostPerGram = Number(line.laborCostPerGram) || 0;
      const laborCostTl = actualWeight * laborCostPerGram;
      const hasEq = calculateHasEquivalent(actualWeight, carat, milyem);

      let weightVariance: number | null = null;
      let costVarianceNote: string | null = null;

      if (line.orderedWeight !== undefined && line.orderedWeight !== null) {
        const v = calculateWeightVariance(Number(line.orderedWeight), actualWeight);
        weightVariance = v.weightDiff;
        costVarianceNote = v.statusText;
      }

      totalWeight += actualWeight;
      totalHas += hasEq;
      totalLabor += laborCostTl;

      return {
        purchaseOrderLineId: line.purchaseOrderLineId || null,
        description: String(line.description || 'Gelen Takı / Maden').trim(),
        barcode: line.barcode ? String(line.barcode).trim() : null,
        carat,
        milyem,
        actualWeight,
        quantity,
        laborCostPerGram,
        laborCostTl,
        hasEquivalent: hasEq,
        weightVariance,
        costVarianceNote,
      };
    });

    // Atomik İşlem: Mal Kabul Kaydı + Toptancı Borçlanması + Stok Güncellemesi
    const result = await prisma.$transaction(async (tx) => {
      // 1. GoodsReceipt ve Satırlarını Oluştur
      const receipt = await tx.goodsReceipt.create({
        data: {
          dealerId,
          supplierId,
          purchaseOrderId: purchaseOrderId || null,
          branchId,
          receiptNumber,
          invoiceNumber: invoiceNumber ? String(invoiceNumber).trim() : null,
          receivedBy: ctx.userName,
          totalActualWeight: totalWeight,
          totalHasEquivalent: totalHas,
          totalLaborCostTl: totalLabor,
          notes: notes ? String(notes).trim() : null,
          lines: {
            create: processedLines,
          },
        },
        include: {
          supplier: true,
          branch: true,
          lines: true,
          purchaseOrder: true,
        },
      });

      // 2. Tedarik Siparişi Varsa İlerleme Durumunu Güncelle
      if (purchaseOrderId) {
        for (const line of processedLines) {
          if (line.purchaseOrderLineId) {
            const poLine = await tx.purchaseOrderLine.findUnique({
              where: { id: line.purchaseOrderLineId },
            });
            if (poLine) {
              const newRecWeight = poLine.receivedWeight + line.actualWeight;
              const newRecQty = poLine.receivedQuantity + line.quantity;
              const isFulfilled = newRecWeight >= poLine.orderedWeight;

              await tx.purchaseOrderLine.update({
                where: { id: line.purchaseOrderLineId },
                data: {
                  receivedWeight: newRecWeight,
                  receivedQuantity: newRecQty,
                  status: isFulfilled
                    ? PO_LINE_STATUS.COMPLETED
                    : PO_LINE_STATUS.PARTIALLY_RECEIVED,
                },
              });
            }
          }
        }

        // Genel Sipariş Statüsünü Belirle
        const allPoLines = await tx.purchaseOrderLine.findMany({
          where: { purchaseOrderId },
        });
        const allCompleted = allPoLines.every(
          (l) => l.receivedWeight >= l.orderedWeight && l.orderedWeight > 0
        );

        await tx.purchaseOrder.update({
          where: { id: purchaseOrderId },
          data: {
            status: allCompleted ? PO_STATUS.RECEIVED : PO_STATUS.PARTIALLY_RECEIVED,
          },
        });
      }

      // 3. Toptancı Carisi Güncellemesi (Has Borcu ve Varsa TL İşçilik)
      await tx.supplier.update({
        where: { id: supplierId },
        data: {
          hasBalance: { increment: totalHas },
          tlBalance: { increment: totalLabor },
        },
      });

      // Cari Hareket Kaydı
      await tx.supplierTransaction.create({
        data: {
          supplierId,
          dealerId,
          type: 'PURCHASE',
          hasAmount: totalHas,
          tlAmount: totalLabor,
        },
      });

      // 4. Otomatik Stok ve Takı Girişi
      for (const pl of processedLines) {
        const stockProductKey = `${pl.carat}K_${pl.description.replace(/\s+/g, '_').toUpperCase()}`;

        const existingStock = await tx.stock.findUnique({
          where: {
            product_dealerId: {
              product: stockProductKey,
              dealerId,
            },
          },
        });

        if (existingStock) {
          await tx.stock.update({
            where: { id: existingStock.id },
            data: {
              amount: { increment: pl.actualWeight },
              branchId: branchId || existingStock.branchId,
            },
          });
        } else {
          await tx.stock.create({
            data: {
              dealerId,
              branchId,
              product: stockProductKey,
              label: `${pl.carat}K ${pl.description}`,
              type: 'taki',
              amount: pl.actualWeight,
              minThreshold: 5,
            },
          });
        }

        // Barkod belirtildiyse ProductItem olarak da ekle
        if (pl.barcode) {
          const costMilyem = pl.milyem > 1 ? pl.milyem / 1000 : pl.milyem;
          await tx.productItem.create({
            data: {
              dealerId,
              branchId,
              barcode: pl.barcode,
              title: pl.description,
              carat: pl.carat,
              weight: pl.actualWeight,
              costMilyem,
              laborMilyem: 0,
              profitMargin: 10,
              status: 'IN_STOCK',
              supplierName: supplier.name,
            },
          }).catch(() => {});
        }
      }

      return receipt;
    });

    await logActivity({
      dealerId,
      userId: ctx.userId,
      action: 'GOODS_RECEIPT_CREATE',
      details: `${receiptNumber} nolu mal kabul gerçekleştirildi. Tedarikçi: ${supplier.name}, Fiili Gramaj: ${totalWeight.toFixed(2)} gr (${totalHas.toFixed(2)} Has Borç eklendi).`,
    });

    return NextResponse.json({ success: true, receipt: result }, { status: 201 });
  } catch (error: any) {
    if (error.statusCode === 401 || error.statusCode === 403) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error('[API Goods Receipts] POST Error:', error);
    return NextResponse.json(
      { error: error?.message || 'Mal kabul işlemi gerçekleştirilemedi.' },
      { status: 500 }
    );
  }
}
