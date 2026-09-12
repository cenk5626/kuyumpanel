import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthenticatedContext } from '@/lib/security/auth-context';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await getAuthenticatedContext();
    const dealerId = ctx.dealerId;
    const { id } = await params;

    const order = await prisma.serviceOrder.findFirst({
      where: { id, dealerId },
      include: {
        dealer: { select: { name: true } },
        branch: { select: { name: true, address: true, phone: true } },
        customer: { select: { name: true, phone: true, tcNo: true } },
        photos: {
          select: { id: true, fileName: true, photoType: true, storageReference: true },
        },
      },
    });

    if (!order) {
      return NextResponse.json({ error: 'Servis kaydı bulunamadı.' }, { status: 404 });
    }

    const slip = {
      serviceNumber: order.serviceNumber,
      dealerName: order.dealer.name,
      branchName: order.branch?.name || 'Merkez Şube',
      branchPhone: order.branch?.phone || '',
      customerName: order.customerName,
      customerPhone: order.customerPhone,
      itemDescription: order.itemDescription,
      barcode: order.barcode || '',
      intakeWeight: order.intakeWeight,
      actualWeight: order.actualWeight,
      carat: order.carat ? `${order.carat}K` : '-',
      issueDescription: order.issueDescription,
      estimatedCostTl: order.estimatedCostTl,
      finalCostTl: order.finalCostTl,
      status: order.status,
      receivedAt: order.createdAt,
      promisedDate: order.promisedDate,
      deliveredAt: order.deliveredAt,
      warrantyMonths: order.warrantyMonths,
      warrantyExpiresAt: order.warrantyExpiresAt,
      technicianNotes: order.technicianNotes,
      photoCount: order.photos.length,
      printDate: new Date(),
    };

    return NextResponse.json({ slip });
  } catch (error: any) {
    if (error.statusCode === 401 || error.statusCode === 403) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error('[API Service Delivery Slip] GET Error:', error);
    return NextResponse.json({ error: 'Teslim fişi verisi alınamadı.' }, { status: 500 });
  }
}
