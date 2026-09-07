import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedContext } from '@/lib/security/auth-context';
import { CRM_SEGMENT_TYPES } from '@/constants/crm';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const ctx = await getAuthenticatedContext();
    const dealerId = ctx.dealerId;

    const segments = await prisma.customerSegment.findMany({
      where: { dealerId },
      include: {
        _count: {
          select: { campaigns: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ success: true, segments });
  } catch (error: any) {
    console.error('CRM Segments GET Hatası:', error);
    return NextResponse.json({ error: error.message || 'Segmentler yüklenemedi.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const ctx = await getAuthenticatedContext();
    const dealerId = ctx.dealerId;

    const body = await request.json();
    const { name, type, description, minSpendTl, maxRecencyDays, minTransactions } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Segment adı zorunludur.' }, { status: 400 });
    }

    const segment = await prisma.customerSegment.create({
      data: {
        dealerId,
        name: name.trim(),
        type: type || CRM_SEGMENT_TYPES.CUSTOM,
        description: description?.trim() || null,
        minSpendTl: minSpendTl ? parseFloat(minSpendTl) : 0,
        maxRecencyDays: maxRecencyDays ? parseInt(maxRecencyDays, 10) : null,
        minTransactions: minTransactions ? parseInt(minTransactions, 10) : 0,
      },
    });

    return NextResponse.json({ success: true, segment });
  } catch (error: any) {
    console.error('CRM Segments POST Hatası:', error);
    return NextResponse.json({ error: error.message || 'Segment oluşturulamadı.' }, { status: 500 });
  }
}
