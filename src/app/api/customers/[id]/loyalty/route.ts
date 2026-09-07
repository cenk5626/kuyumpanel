import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedContext, assertTenantOwnership } from '@/lib/security/auth-context';
import { logActivity } from '@/lib/logger';
import { sanitizeBody } from '@/lib/security/validation';
import {
  LOYALTY_ACTION_TYPES,
  LOYALTY_DEFAULTS,
} from '@/constants/loyalty';
import { calculateLoyaltyTier } from '@/lib/loyalty/rfm-engine';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await getAuthenticatedContext();
    const dealerId = ctx.dealerId;
    const { id: customerId } = await params;

    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
      include: {
        loyaltyLogs: {
          orderBy: { createdAt: 'desc' },
          take: 50,
        },
      },
    });

    if (!customer) {
      return NextResponse.json({ error: 'Müşteri bulunamadı.' }, { status: 404 });
    }

    assertTenantOwnership(ctx, customer.dealerId, 'Customer');

    return NextResponse.json({
      customerId: customer.id,
      customerName: customer.name,
      loyaltyPoints: customer.loyaltyPoints,
      loyaltyTier: customer.loyaltyTier || 'BRONZE',
      rfmSegment: customer.rfmSegment,
      rfmScore: customer.rfmScore,
      logs: customer.loyaltyLogs,
    });
  } catch (error: any) {
    if (error.statusCode === 401 || error.statusCode === 403) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error('[API Customer Loyalty] GET Error:', error);
    return NextResponse.json({ error: 'Sadakat bilgileri alınamadı.' }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await getAuthenticatedContext();
    const dealerId = ctx.dealerId;
    const { id: customerId } = await params;

    const rawBody = await req.json();
    const body = sanitizeBody(rawBody, [
      'actionType',
      'points',
      'referenceType',
      'referenceId',
      'description',
    ] as const);

    const { actionType, points, referenceType, referenceId, description } = body;

    const numPoints = Number(points);
    if (!numPoints || numPoints <= 0) {
      return NextResponse.json({ error: 'Geçersiz puan tutarı.' }, { status: 400 });
    }

    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
    });

    if (!customer) {
      return NextResponse.json({ error: 'Müşteri bulunamadı.' }, { status: 404 });
    }

    assertTenantOwnership(ctx, customer.dealerId, 'Customer');

    if (actionType === LOYALTY_ACTION_TYPES.REDEEM && customer.loyaltyPoints < numPoints) {
      return NextResponse.json(
        { error: `Yetersiz puan bakiyesi. Mevcut puan: ${customer.loyaltyPoints}` },
        { status: 400 }
      );
    }

    const pointDelta = actionType === LOYALTY_ACTION_TYPES.REDEEM ? -numPoints : numPoints;
    const newBalance = Math.max(0, customer.loyaltyPoints + pointDelta);
    const tlValue = Number((numPoints * LOYALTY_DEFAULTS.POINT_TL_CONVERSION_RATE).toFixed(2));

    const result = await prisma.$transaction(async (tx) => {
      const log = await tx.customerLoyaltyLog.create({
        data: {
          dealerId,
          customerId,
          actionType: actionType || LOYALTY_ACTION_TYPES.ADJUST,
          points: numPoints,
          tlValue,
          balanceAfter: newBalance,
          referenceType: referenceType || 'MANUAL',
          referenceId: referenceId || null,
          description: description || 'Puan hareketi',
        },
      });

      const updatedCustomer = await tx.customer.update({
        where: { id: customerId },
        data: {
          loyaltyPoints: newBalance,
        },
      });

      return { log, updatedCustomer };
    });

    await logActivity({
      dealerId,
      userId: ctx.userId,
      action: 'LOYALTY_POINT_CHANGE',
      details: `${customer.name} için ${actionType} işlemiyle ${numPoints} ParaPuan işlendi. Yeni Bakiye: ${newBalance}`,
    });

    return NextResponse.json({
      success: true,
      log: result.log,
      currentPoints: result.updatedCustomer.loyaltyPoints,
    });
  } catch (error: any) {
    if (error.statusCode === 401 || error.statusCode === 403) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error('[API Customer Loyalty] POST Error:', error);
    return NextResponse.json({ error: 'Puan işlemi kaydedilemedi.' }, { status: 500 });
  }
}
