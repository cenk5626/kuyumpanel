import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedContext, assertTenantOwnership } from '@/lib/security/auth-context';
import { logActivity } from '@/lib/logger';
import {
  SERVICE_ORDER_STATUS,
  SERVICE_DEFAULTS,
} from '@/constants/service';
import {
  generateServiceNumber,
  checkServiceOverdue,
} from '@/lib/service/service-engine';
import { roundGrams, roundMoney } from '@/lib/security/validation';

export const dynamic = 'force-dynamic';

/**
 * GET /api/service-orders — Bayiye ait servis ve tamir kayıtlarını listeler.
 */
export async function GET(request: NextRequest) {
  try {
    const ctx = await getAuthenticatedContext();
    const currentUserRole = ctx.role;
    const currentUserDealerId = ctx.dealerId;

    const searchParams = request.nextUrl.searchParams;
    const statusFilter = searchParams.get('status');
    const branchFilter = searchParams.get('branchId');
    const overdueOnly = searchParams.get('overdue') === 'true';
    const query = searchParams.get('q');

    const whereClause: any = {};
    if (currentUserRole !== 'SUPER_ADMIN') {
      whereClause.dealerId = currentUserDealerId;
    }
    if (statusFilter && statusFilter !== 'ALL') {
      whereClause.status = statusFilter;
    }
    if (branchFilter && branchFilter !== 'ALL') {
      whereClause.branchId = branchFilter;
    }
    if (query) {
      whereClause.OR = [
        { serviceNumber: { contains: query } },
        { customerName: { contains: query } },
        { customerPhone: { contains: query } },
        { itemDescription: { contains: query } },
        { barcode: { contains: query } },
      ];
    }

    const orders = await prisma.serviceOrder.findMany({
      where: whereClause,
      include: {
        customer: { select: { id: true, name: true, phone: true } },
        branch: { select: { id: true, name: true, code: true } },
        workshopJob: { select: { id: true, jobNo: true, workshopName: true, status: true } },
        events: { orderBy: { createdAt: 'desc' }, take: 5 },
        photos: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    const safeOrders = orders.map((ord) => {
      const overdueInfo = checkServiceOverdue(ord.promisedDate, ord.deliveredAt);
      return {
        ...ord,
        isOverdue: overdueInfo.isOverdue,
        overdueDays: overdueInfo.overdueDays,
        promisedDate: ord.promisedDate ? (ord.promisedDate instanceof Date ? ord.promisedDate.toISOString() : new Date(ord.promisedDate).toISOString()) : new Date().toISOString(),
        deliveredAt: ord.deliveredAt ? (ord.deliveredAt instanceof Date ? ord.deliveredAt.toISOString() : new Date(ord.deliveredAt).toISOString()) : null,
        warrantyExpiresAt: ord.warrantyExpiresAt ? (ord.warrantyExpiresAt instanceof Date ? ord.warrantyExpiresAt.toISOString() : new Date(ord.warrantyExpiresAt).toISOString()) : null,
        createdAt: ord.createdAt ? (ord.createdAt instanceof Date ? ord.createdAt.toISOString() : new Date(ord.createdAt).toISOString()) : new Date().toISOString(),
        updatedAt: ord.updatedAt ? (ord.updatedAt instanceof Date ? ord.updatedAt.toISOString() : new Date(ord.updatedAt).toISOString()) : new Date().toISOString(),
        events: ord.events.map((e) => ({
          ...e,
          createdAt: e.createdAt ? (e.createdAt instanceof Date ? e.createdAt.toISOString() : new Date(e.createdAt).toISOString()) : new Date().toISOString(),
        })),
      };
    });

    const finalOrders = overdueOnly ? safeOrders.filter((o) => o.isOverdue) : safeOrders;

    return NextResponse.json(finalOrders);
  } catch (error) {
    console.error('[API ServiceOrders] GET Error:', error);
    return NextResponse.json([], { status: 200 }); // Fault-tolerant
  }
}

/**
 * POST /api/service-orders — Yeni servis kabul kaydı açar.
 */
export async function POST(request: NextRequest) {
  try {
    const ctx = await getAuthenticatedContext();
    const currentUserDealerId = ctx.dealerId;
    const userEmail = ctx.userEmail;
    const userName = ctx.userName;

    const body = await request.json();
    const {
      customerId,
      customerName,
      customerPhone,
      itemDescription,
      barcode,
      carat,
      intakeWeight,
      targetWeight,
      issueDescription,
      estimatedCostTl = 0,
      branchId,
      promisedDate,
      warrantyMonths = SERVICE_DEFAULTS.DEFAULT_WARRANTY_MONTHS,
      technicianNotes,
    } = body;

    if (!customerName || !customerName.trim()) {
      return NextResponse.json({ error: 'Müşteri adı zorunludur.' }, { status: 400 });
    }
    if (!customerPhone || !customerPhone.trim()) {
      return NextResponse.json({ error: 'Müşteri telefon numarası zorunludur.' }, { status: 400 });
    }
    if (!itemDescription || !itemDescription.trim()) {
      return NextResponse.json({ error: 'Ürün açıklaması zorunludur.' }, { status: 400 });
    }
    if (!issueDescription || !issueDescription.trim()) {
      return NextResponse.json({ error: 'Arıza / talep edilen işlem açıklaması zorunludur.' }, { status: 400 });
    }

    const safeIntakeWeight = roundGrams(Math.max(0, Number(intakeWeight) || 0));
    const safeEstimatedCost = roundMoney(Math.max(0, Number(estimatedCostTl) || 0));
    const safePromisedDate = promisedDate ? new Date(promisedDate) : new Date(Date.now() + 3 * 24 * 60 * 60 * 1000); // 3 gün sonra varsayılan

    const totalCount = await prisma.serviceOrder.count({
      where: { dealerId: currentUserDealerId },
    });
    const serviceNumber = generateServiceNumber(currentUserDealerId, totalCount);

    const newOrder = await prisma.serviceOrder.create({
      data: {
        dealerId: currentUserDealerId,
        branchId: branchId || null,
        serviceNumber,
        customerId: customerId || null,
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        itemDescription: itemDescription.trim(),
        barcode: barcode?.trim() || null,
        carat: carat ? Number(carat) : null,
        intakeWeight: safeIntakeWeight,
        targetWeight: targetWeight ? roundGrams(Number(targetWeight)) : null,
        issueDescription: issueDescription.trim(),
        estimatedCostTl: safeEstimatedCost,
        finalCostTl: safeEstimatedCost,
        status: safeEstimatedCost > 0 ? SERVICE_ORDER_STATUS.QUOTED : SERVICE_ORDER_STATUS.RECEIVED,
        promisedDate: safePromisedDate,
        warrantyMonths: Math.max(1, Number(warrantyMonths) || 6),
        technicianNotes: technicianNotes?.trim() || null,
        createdById: userEmail || userName || 'system',
        events: {
          create: {
            fromStatus: null,
            toStatus: safeEstimatedCost > 0 ? SERVICE_ORDER_STATUS.QUOTED : SERVICE_ORDER_STATUS.RECEIVED,
            action: 'RECEIVED',
            notes: `Ürün teslim alındı. Ön tartım: ${safeIntakeWeight} gr. Tahmini bedel: ₺${safeEstimatedCost}`,
            performedBy: userEmail || userName || 'system',
          },
        },
      },
      include: {
        customer: true,
        branch: true,
        events: true,
      },
    });

    await logActivity({
      dealerId: currentUserDealerId,
      action: 'SERVİS KABULÜ',
      details: `${serviceNumber} no'lu servis kaydı açıldı. Müşteri: ${customerName}, Ürün: ${itemDescription} (${safeIntakeWeight} gr)`,
      userEmail,
      userName,
    });

    return NextResponse.json(newOrder, { status: 201 });
  } catch (error: any) {
    console.error('[API ServiceOrders] POST Error:', error);
    return NextResponse.json(
      { error: error?.message || 'Servis kaydı açılırken hata oluştu.' },
      { status: 500 }
    );
  }
}
