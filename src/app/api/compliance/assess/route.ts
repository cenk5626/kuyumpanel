import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedContext } from '@/lib/security/auth-context';
import { assessTransactionCompliance } from '@/lib/compliance/aml-engine';

export const dynamic = 'force-dynamic';

/**
 * POST /api/compliance/assess
 * Canlı işlem öncesi AML uyum ve parçalama (structuring) riskini hesaplar.
 */
export async function POST(request: NextRequest) {
  try {
    const ctx = await getAuthenticatedContext();
    const dealerId = ctx.dealerId;

    const body = await request.json();
    const {
      amountTL,
      isCash = true,
      customerId,
      customerTcNo,
      customerIsPep,
    } = body;

    let pastTransactions: Array<{ amountTL: number; createdAt: Date; isCash: boolean }> = [];
    let isPep = Boolean(customerIsPep);
    let resolvedTcNo = customerTcNo;

    // Eğer müşteri seçilmişse son 24 saatteki hareketlerini ve profilini çek
    if (customerId) {
      const customer = await prisma.customer.findFirst({
        where: { id: customerId, dealerId },
        include: {
          riskProfile: true,
          transactions: {
            where: {
              createdAt: {
                gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
              },
            },
            select: {
              amount: true,
              assetType: true,
              createdAt: true,
            },
          },
        },
      });

      if (customer) {
        if (!resolvedTcNo && customer.tcNo) {
          resolvedTcNo = customer.tcNo;
        }
        if (customer.riskProfile?.isPep) {
          isPep = true;
        }

        pastTransactions = (customer.transactions || []).map(t => ({
          amountTL: t.amount,
          createdAt: t.createdAt,
          isCash: t.assetType === 'TL' || t.assetType === 'USD' || t.assetType === 'EUR',
        }));
      }
    }

    const assessment = assessTransactionCompliance({
      amountTL: Number(amountTL) || 0,
      isCash: Boolean(isCash),
      customerId,
      customerTcNo: resolvedTcNo,
      customerIsPep: isPep,
      recentTransactions: pastTransactions,
    });

    return NextResponse.json({
      success: true,
      assessment,
    });
  } catch (error: any) {
    console.error('[API Compliance Assess POST Error]:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Değerlendirme yapılamadı' },
      { status: 500 }
    );
  }
}
