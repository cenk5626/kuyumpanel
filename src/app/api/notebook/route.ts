import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthenticatedContext } from '@/lib/security/auth-context';
import { NOTEBOOK_CATEGORY, NOTEBOOK_VISIBILITY, NOTEBOOK_STATUS } from '@/constants/notebook';
import { logActivity } from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const ctx = await getAuthenticatedContext();
    const dealerId = ctx.dealerId;
    const currentUserId = ctx.userId;
    const currentUserEmail = ctx.userEmail || '';

    const { searchParams } = new URL(req.url);
    const category = searchParams.get('category');
    const search = searchParams.get('search');
    const customerId = searchParams.get('customerId');
    const supplierId = searchParams.get('supplierId');
    const serviceOrderId = searchParams.get('serviceOrderId');
    const status = searchParams.get('status') || NOTEBOOK_STATUS.ACTIVE;

    const whereClause: any = { dealerId };

    if (status && status !== 'ALL') {
      whereClause.status = status;
    }

    if (category && category !== 'ALL') {
      whereClause.category = category;
    }

    if (customerId) whereClause.linkedCustomerId = customerId;
    if (supplierId) whereClause.linkedSupplierId = supplierId;
    if (serviceOrderId) whereClause.linkedServiceOrderId = serviceOrderId;

    if (search) {
      whereClause.OR = [
        { title: { contains: search } },
        { content: { contains: search } },
      ];
    }

    // Görünürlük Koruması: PRIVATE notları yalnızca yazan kişi görebilir
    const visibilityCondition = {
      OR: [
        { visibility: { not: NOTEBOOK_VISIBILITY.PRIVATE } },
        { createdBy: currentUserId },
        { createdBy: currentUserEmail },
      ],
    };

    if (whereClause.AND) {
      whereClause.AND.push(visibilityCondition);
    } else {
      whereClause.AND = [visibilityCondition];
    }

    const entries = await prisma.jewelerNotebookEntry.findMany({
      where: whereClause,
      include: {
        linkedCustomer: { select: { id: true, name: true, phone: true } },
        linkedSupplier: { select: { id: true, name: true } },
        linkedServiceOrder: { select: { id: true, serviceNumber: true, customerName: true } },
      },
      orderBy: [
        { isPinned: 'desc' },
        { createdAt: 'desc' },
      ],
      take: 200,
    });

    return NextResponse.json({ entries });
  } catch (error: any) {
    if (error.statusCode === 401 || error.statusCode === 403) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error('[API Notebook] GET Error:', error);
    return NextResponse.json({ error: 'Defter notları alınamadı.' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const ctx = await getAuthenticatedContext();
    const dealerId = ctx.dealerId;

    const body = await req.json();
    const {
      category = NOTEBOOK_CATEGORY.GENERAL,
      title,
      content,
      visibility = NOTEBOOK_VISIBILITY.DEALER,
      linkedCustomerId,
      linkedSupplierId,
      linkedWorkshopJobId,
      linkedServiceOrderId,
      reminderAt,
      isPinned = false,
      branchId,
    } = body;

    if (!title || !content) {
      return NextResponse.json({ error: 'Başlık ve not içeriği zorunludur.' }, { status: 400 });
    }

    // XSS Temizliği: HTML etiketlerini temel olarak temizle
    const sanitizedTitle = String(title).replace(/<[^>]*>/g, '').trim();
    const sanitizedContent = String(content).replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '').trim();

    const newEntry = await prisma.jewelerNotebookEntry.create({
      data: {
        dealerId,
        branchId: branchId || null,
        category,
        title: sanitizedTitle,
        content: sanitizedContent,
        visibility,
        linkedCustomerId: linkedCustomerId || null,
        linkedSupplierId: linkedSupplierId || null,
        linkedWorkshopJobId: linkedWorkshopJobId || null,
        linkedServiceOrderId: linkedServiceOrderId || null,
        reminderAt: reminderAt ? new Date(reminderAt) : null,
        isPinned: Boolean(isPinned),
        status: NOTEBOOK_STATUS.ACTIVE,
        createdBy: ctx.userName || ctx.userId,
      },
      include: {
        linkedCustomer: { select: { id: true, name: true } },
        linkedSupplier: { select: { id: true, name: true } },
      },
    });

    await logActivity({
      dealerId,
      userId: ctx.userId,
      action: 'NOTEBOOK_ENTRY_CREATE',
      details: `Deftere not eklendi: "${sanitizedTitle}" (Kategori: ${category}, Görünürlük: ${visibility})`,
    });

    return NextResponse.json({ success: true, entry: newEntry }, { status: 201 });
  } catch (error: any) {
    if (error.statusCode === 401 || error.statusCode === 403) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error('[API Notebook] POST Error:', error);
    return NextResponse.json({ error: 'Not kaydedilemedi.' }, { status: 500 });
  }
}
