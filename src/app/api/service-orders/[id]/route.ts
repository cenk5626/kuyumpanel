import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedContext, assertTenantOwnership } from '@/lib/security/auth-context';
import { logActivity } from '@/lib/logger';
import {
  SERVICE_ORDER_STATUS,
  ServiceOrderStatus,
} from '@/constants/service';
import {
  canTransitionServiceStatus,
  calculateWarrantyExpiry,
} from '@/lib/service/service-engine';
import { roundGrams, roundMoney } from '@/lib/security/validation';

export const dynamic = 'force-dynamic';

/**
 * GET /api/service-orders/[id] — Tekil servis iş emri detayı
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const ctx = await getAuthenticatedContext();
    const currentUserRole = ctx.role;
    const currentUserDealerId = ctx.dealerId;

    const order = await prisma.serviceOrder.findUnique({
      where: { id },
      include: {
        customer: true,
        branch: true,
        workshopJob: true,
        events: { orderBy: { createdAt: 'desc' } },
      },
    });

    if (!order) {
      return NextResponse.json({ error: 'Servis kaydı bulunamadı.' }, { status: 404 });
    }

    if (currentUserRole !== 'SUPER_ADMIN') {
      assertTenantOwnership(ctx, order.dealerId);
    }

    return NextResponse.json(order);
  } catch (error: any) {
    console.error('[API ServiceOrders ID] GET Error:', error);
    return NextResponse.json({ error: error?.message || 'Sunucu hatası' }, { status: 500 });
  }
}

/**
 * PATCH /api/service-orders/[id] — Servis iş emri durum geçişi ve eylemler
 */
export async function PATCH(
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

    const order = await prisma.serviceOrder.findUnique({
      where: { id },
    });

    if (!order) {
      return NextResponse.json({ error: 'Servis kaydı bulunamadı.' }, { status: 404 });
    }

    if (currentUserRole !== 'SUPER_ADMIN') {
      assertTenantOwnership(ctx, order.dealerId);
    }

    const body = await request.json();
    const { action, estimatedCostTl, finalCostTl, actualWeight, workshopJobId, notes, warrantyMonths } = body;

    let targetStatus: ServiceOrderStatus = order.status as ServiceOrderStatus;
    let isCustomerApproved = order.isCustomerApproved;
    let customerApprovalDate = order.customerApprovalDate;
    let deliveredAt = order.deliveredAt;
    let warrantyExpiresAt = order.warrantyExpiresAt;
    let updateActualWeight = order.actualWeight;
    let updateFinalCost = order.finalCostTl;
    let updateEstimatedCost = order.estimatedCostTl;
    let updateWorkshopJobId = order.workshopJobId;

    // Eylemlere göre durum geçişi
    switch (action) {
      case 'QUOTE':
        targetStatus = SERVICE_ORDER_STATUS.QUOTED;
        if (estimatedCostTl !== undefined) {
          updateEstimatedCost = roundMoney(Number(estimatedCostTl));
          updateFinalCost = updateEstimatedCost;
        }
        break;

      case 'APPROVE':
        isCustomerApproved = true;
        customerApprovalDate = new Date();
        targetStatus = SERVICE_ORDER_STATUS.APPROVED;
        break;

      case 'SEND_TO_WORKSHOP':
        targetStatus = SERVICE_ORDER_STATUS.IN_WORKSHOP;
        if (workshopJobId) updateWorkshopJobId = workshopJobId;
        break;

      case 'MARK_READY':
        targetStatus = SERVICE_ORDER_STATUS.READY;
        if (finalCostTl !== undefined) {
          updateFinalCost = roundMoney(Number(finalCostTl));
        }
        break;

      case 'DELIVER':
        targetStatus = SERVICE_ORDER_STATUS.DELIVERED;
        deliveredAt = new Date();
        const months = warrantyMonths ? Number(warrantyMonths) : order.warrantyMonths;
        warrantyExpiresAt = calculateWarrantyExpiry(deliveredAt, months);
        if (actualWeight !== undefined) {
          updateActualWeight = roundGrams(Number(actualWeight));
        }
        if (finalCostTl !== undefined) {
          updateFinalCost = roundMoney(Number(finalCostTl));
        }
        break;

      case 'CANCEL':
        targetStatus = SERVICE_ORDER_STATUS.CANCELLED;
        break;

      default:
        return NextResponse.json({ error: 'Geçersiz servis eylemi.' }, { status: 400 });
    }

    // İş Kuralı Denetimi: Müşteri onayı olmadan ücretli işe başlanamaz!
    const validation = canTransitionServiceStatus(
      order.status as ServiceOrderStatus,
      targetStatus,
      isCustomerApproved,
      updateEstimatedCost
    );

    if (!validation.allowed) {
      return NextResponse.json({ error: validation.reason }, { status: 400 });
    }

    const updatedOrder = await prisma.serviceOrder.update({
      where: { id },
      data: {
        status: targetStatus,
        isCustomerApproved,
        customerApprovalDate,
        deliveredAt,
        warrantyExpiresAt,
        actualWeight: updateActualWeight,
        finalCostTl: updateFinalCost,
        estimatedCostTl: updateEstimatedCost,
        workshopJobId: updateWorkshopJobId,
        events: {
          create: {
            fromStatus: order.status,
            toStatus: targetStatus,
            action,
            notes: notes?.trim() || `${action} eylemi uygulandı. Yeni durum: ${targetStatus}`,
            performedBy: userEmail || userName || 'system',
          },
        },
      },
      include: {
        customer: true,
        branch: true,
        workshopJob: true,
        events: { orderBy: { createdAt: 'desc' } },
      },
    });

    await logActivity({
      dealerId: currentUserDealerId,
      action: 'SERVİS DURUM GÜNCELLEMESİ',
      details: `${order.serviceNumber} no'lu servis kaydı '${order.status}' durumundan '${targetStatus}' durumuna geçirildi.`,
      userEmail,
      userName,
    });

    return NextResponse.json(updatedOrder);
  } catch (error: any) {
    console.error('[API ServiceOrders ID] PATCH Error:', error);
    return NextResponse.json({ error: error?.message || 'İşlem başarısız' }, { status: 500 });
  }
}
