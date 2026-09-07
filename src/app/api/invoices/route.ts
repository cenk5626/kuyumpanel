import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { logActivity } from '@/lib/logger';
import {
  INVOICE_TYPES,
  INVOICE_DOCUMENT_TYPES,
  INVOICE_STATUS,
  INVOICE_DEFAULTS,
} from '@/constants/invoice';
import {
  calculateSpecialMatrixInvoice,
  generateInvoiceNumber,
  SpecialMatrixItemInput,
} from '@/lib/invoice/special-matrix';

export const dynamic = 'force-dynamic';

/**
 * GET /api/invoices — Bayiye ait fatura ve e-Arşiv belgelerini listeler.
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth().catch(() => null);
    const currentUserRole = (session?.user as any)?.role || 'ADMIN';
    const currentUserDealerId = (session?.user as any)?.dealerId || 'merkez';

    const searchParams = request.nextUrl.searchParams;
    const typeFilter = searchParams.get('type');
    const docTypeFilter = searchParams.get('documentType');
    const query = searchParams.get('q');

    let whereClause: any = {};
    if (currentUserRole !== 'SUPER_ADMIN') {
      whereClause.dealerId = currentUserDealerId;
    }
    if (typeFilter) {
      whereClause.type = typeFilter;
    }
    if (docTypeFilter) {
      whereClause.documentType = docTypeFilter;
    }
    if (query) {
      whereClause.OR = [
        { customerName: { contains: query } },
        { invoiceNumber: { contains: query } },
        { customerTaxId: { contains: query } },
      ];
    }

    const invoices = await prisma.invoice.findMany({
      where: whereClause,
      orderBy: { issueDate: 'desc' },
      take: 100,
    });

    const safeInvoices = invoices.map((inv) => ({
      ...inv,
      items: (() => {
        try {
          return JSON.parse(inv.itemsJson);
        } catch {
          return [];
        }
      })(),
      issueDate: inv.issueDate
        ? inv.issueDate instanceof Date
          ? inv.issueDate.toISOString()
          : new Date(inv.issueDate).toISOString()
        : new Date().toISOString(),
      createdAt: inv.createdAt
        ? inv.createdAt instanceof Date
          ? inv.createdAt.toISOString()
          : new Date(inv.createdAt).toISOString()
        : new Date().toISOString(),
      updatedAt: inv.updatedAt
        ? inv.updatedAt instanceof Date
          ? inv.updatedAt.toISOString()
          : new Date(inv.updatedAt).toISOString()
        : new Date().toISOString(),
    }));

    return NextResponse.json(safeInvoices);
  } catch (error) {
    console.error('[API Invoices] GET Error:', error);
    return NextResponse.json([], { status: 200 }); // Fault-tolerant: return empty array instead of crashing
  }
}

/**
 * POST /api/invoices — KDV Kanunu 23/e uyumlu yeni özel matrahlı fatura keser.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth().catch(() => null);
    const currentUserRole = (session?.user as any)?.role || 'ADMIN';
    const currentUserDealerId = (session?.user as any)?.dealerId || 'merkez';
    const userEmail = (session?.user as any)?.email;
    const userName = (session?.user as any)?.name;

    const body = await request.json();
    const {
      customerId,
      customerName,
      customerTaxId,
      customerTaxOffice,
      customerAddress,
      type = INVOICE_TYPES.OZEL_MATRAH,
      documentType = INVOICE_DOCUMENT_TYPES.E_ARSIV,
      items = [],
      note,
      issueDate,
    } = body;

    if (!customerName || customerName.trim().length === 0) {
      return NextResponse.json(
        { error: 'Müşteri adı veya unvanı zorunludur.' },
        { status: 400 }
      );
    }

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: 'Faturada en az bir ürün kalemi bulunmalıdır.' },
        { status: 400 }
      );
    }

    // Çok kiracılı müşteri kontrolü (eğer müşteri seçilmişse)
    if (customerId) {
      const cust = await prisma.customer.findUnique({
        where: { id: customerId },
      });
      if (!cust || (currentUserRole !== 'SUPER_ADMIN' && cust.dealerId !== currentUserDealerId)) {
        return NextResponse.json(
          { error: 'Seçilen müşteri bulunamadı veya yetkiniz yok.' },
          { status: 403 }
        );
      }
    }

    // Toplam fatura sayısını alarak bir sonraki seri numarasını üret
    const count = await prisma.invoice.count({
      where: { dealerId: currentUserDealerId },
    });
    const invoiceNumber = generateInvoiceNumber(INVOICE_DEFAULTS.SERIES_PREFIX, count + 1);

    // KDV 23/e Özel Matrah Hesabı
    const invoiceCalc = calculateSpecialMatrixInvoice(items as SpecialMatrixItemInput[], {
      invoiceNumber,
      type,
      documentType,
    });

    const created = await prisma.invoice.create({
      data: {
        invoiceNumber,
        dealerId: currentUserDealerId,
        customerId: customerId || null,
        type,
        documentType,
        status: INVOICE_STATUS.ISSUED,
        customerName: customerName.trim(),
        customerTaxId: customerTaxId?.trim() || null,
        customerTaxOffice: customerTaxOffice?.trim() || null,
        customerAddress: customerAddress?.trim() || null,
        itemsJson: JSON.stringify(invoiceCalc.items),
        totalPureGoldWeight: invoiceCalc.totalPureGoldWeight,
        totalGoldAmount: invoiceCalc.totalGoldAmount,
        totalLaborAmount: invoiceCalc.totalLaborAmount,
        totalKdvAmount: invoiceCalc.totalKdvAmount,
        grandTotal: invoiceCalc.grandTotal,
        note: note?.trim() || invoiceCalc.legalNotice,
        issueDate: issueDate
          ? isNaN(new Date(issueDate).getTime())
            ? new Date()
            : new Date(issueDate)
          : new Date(),
      },
    });

    await logActivity({
      dealerId: currentUserDealerId,
      action: 'INVOICE_CREATE',
      details: `${invoiceNumber} numaralı ${documentType} faturası kesildi (Tutar: ${invoiceCalc.grandTotal} TL, Has: ${invoiceCalc.totalPureGoldWeight} gr).`,
      userEmail,
      userName,
    });

    return NextResponse.json({
      ...created,
      items: invoiceCalc.items,
      issueDate: created.issueDate ? created.issueDate.toISOString() : new Date().toISOString(),
      createdAt: created.createdAt ? created.createdAt.toISOString() : new Date().toISOString(),
      updatedAt: created.updatedAt ? created.updatedAt.toISOString() : new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('[API Invoices] POST Error:', error);
    return NextResponse.json(
      { error: error?.message || 'Fatura kaydedilirken bir hata oluştu.' },
      { status: 500 }
    );
  }
}
