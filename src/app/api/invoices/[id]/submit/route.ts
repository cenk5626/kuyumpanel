import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedContext, assertTenantOwnership } from '@/lib/security/auth-context';
import { logActivity } from '@/lib/logger';
import {
  E_DOCUMENT_PROVIDERS,
  E_DOCUMENT_ENVIRONMENTS,
  E_DOCUMENT_SUBMISSION_STATUS,
} from '@/constants/expense-voucher';
import { gibProvider, GibInvoicePayload } from '@/lib/invoice/gib-provider';

export const dynamic = 'force-dynamic';

/**
 * POST /api/invoices/[id]/submit — Faturayı GİB Portal / Entegratör e-Belge sistemine iletir.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const ctx = await getAuthenticatedContext();
    const currentUserRole = ctx.role;
    const currentUserDealerId = ctx.dealerId;
    const userEmail = ctx.userEmail;
    const userName = ctx.userName;

    const invoice = await prisma.invoice.findUnique({
      where: { id },
    });

    if (!invoice) {
      return NextResponse.json({ error: 'Fatura bulunamadı.' }, { status: 404 });
    }

    if (currentUserRole !== 'SUPER_ADMIN') {
      assertTenantOwnership(ctx, invoice.dealerId);
    }

    let items: any[] = [];
    try {
      items = JSON.parse(invoice.itemsJson);
    } catch {
      items = [];
    }

    const payload: GibInvoicePayload = {
      invoiceNumber: invoice.invoiceNumber,
      customerName: invoice.customerName,
      customerTaxId: invoice.customerTaxId,
      customerAddress: invoice.customerAddress,
      type: invoice.type,
      documentType: invoice.documentType,
      issueDate: invoice.issueDate.toISOString(),
      totalPureGoldWeight: invoice.totalPureGoldWeight,
      totalGoldAmount: invoice.totalGoldAmount,
      totalLaborAmount: invoice.totalLaborAmount,
      totalKdvAmount: invoice.totalKdvAmount,
      grandTotal: invoice.grandTotal,
      items: items.map((it) => ({
        name: it.name || 'Altın Takı',
        carat: it.carat || 14,
        milyem: it.milyem || 585,
        weight: it.weight || 0,
        goldCost: it.goldCost || 0,
        laborCost: it.laborCost || 0,
        kdvAmount: it.kdvAmount || 0,
        total: it.total || 0,
      })),
    };

    const submissionResult = await gibProvider.submitInvoice(
      payload,
      E_DOCUMENT_ENVIRONMENTS.TEST
    );

    if (!submissionResult.success) {
      await prisma.invoice.update({
        where: { id },
        data: {
          submissionStatus: E_DOCUMENT_SUBMISSION_STATUS.REJECTED,
          errorMessage: submissionResult.errorMessage || 'GİB Doğrulama Hatası',
        },
      });

      return NextResponse.json(
        { error: submissionResult.errorMessage, submission: submissionResult },
        { status: 400 }
      );
    }

    const updatedInvoice = await prisma.invoice.update({
      where: { id },
      data: {
        provider: submissionResult.provider,
        environment: submissionResult.environment,
        externalDocumentId: submissionResult.externalDocumentId,
        uuid: submissionResult.uuid,
        submissionStatus: submissionResult.submissionStatus,
        pdfUrl: submissionResult.pdfUrl,
        xmlUrl: submissionResult.xmlUrl,
        submittedAt: new Date(submissionResult.signedAt),
        errorMessage: null,
      },
    });

    await logActivity({
      dealerId: currentUserDealerId,
      action: 'E-FATURA GÖNDERİMİ',
      details: `${invoice.invoiceNumber} faturası GİB sistemine başarıyla iletildi. UUID: ${submissionResult.uuid}`,
      userEmail,
      userName,
    });

    return NextResponse.json({
      invoice: updatedInvoice,
      submission: submissionResult,
    });
  } catch (error: any) {
    console.error('[API Invoice Submit] Error:', error);
    return NextResponse.json({ error: error?.message || 'İletim hatası' }, { status: 500 });
  }
}
