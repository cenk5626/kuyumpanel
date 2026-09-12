import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthenticatedContext } from '@/lib/security/auth-context';
import { NOTEBOOK_STATUS, NOTEBOOK_VISIBILITY } from '@/constants/notebook';
import { logActivity } from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await getAuthenticatedContext();
    const dealerId = ctx.dealerId;
    const { id } = await params;

    const existing = await prisma.jewelerNotebookEntry.findFirst({
      where: { id, dealerId },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Not bulunamadı.' }, { status: 404 });
    }

    // Özel not düzenleme kontrolü
    if (
      existing.visibility === NOTEBOOK_VISIBILITY.PRIVATE &&
      existing.createdBy !== ctx.userId &&
      existing.createdBy !== ctx.userName &&
      existing.createdBy !== ctx.userEmail &&
      ctx.role !== 'SUPER_ADMIN'
    ) {
      return NextResponse.json({ error: 'Bu özel notu düzenleme yetkiniz yok.' }, { status: 403 });
    }

    const body = await req.json();
    const { title, content, category, visibility, isPinned, status, reminderAt } = body;

    const updateData: any = { updatedBy: ctx.userName || ctx.userId };
    if (title !== undefined) updateData.title = String(title).replace(/<[^>]*>/g, '').trim();
    if (content !== undefined) updateData.content = String(content).replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '').trim();
    if (category !== undefined) updateData.category = category;
    if (visibility !== undefined) updateData.visibility = visibility;
    if (isPinned !== undefined) updateData.isPinned = Boolean(isPinned);
    if (status !== undefined) updateData.status = status;
    if (reminderAt !== undefined) updateData.reminderAt = reminderAt ? new Date(reminderAt) : null;

    const updated = await prisma.jewelerNotebookEntry.update({
      where: { id },
      data: updateData,
    });

    await logActivity({
      dealerId,
      userId: ctx.userId,
      action: 'NOTEBOOK_ENTRY_UPDATE',
      details: `Defter notu güncellendi: "${updated.title}"`,
    });

    return NextResponse.json({ success: true, entry: updated });
  } catch (error: any) {
    if (error.statusCode === 401 || error.statusCode === 403) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error('[API Notebook Detail] PATCH Error:', error);
    return NextResponse.json({ error: 'Not güncellenemedi.' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await getAuthenticatedContext();
    const dealerId = ctx.dealerId;
    const { id } = await params;

    const existing = await prisma.jewelerNotebookEntry.findFirst({
      where: { id, dealerId },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Not bulunamadı.' }, { status: 404 });
    }

    if (
      existing.visibility === NOTEBOOK_VISIBILITY.PRIVATE &&
      existing.createdBy !== ctx.userId &&
      existing.createdBy !== ctx.userName &&
      existing.createdBy !== ctx.userEmail &&
      ctx.role !== 'SUPER_ADMIN'
    ) {
      return NextResponse.json({ error: 'Bu özel notu silme yetkiniz yok.' }, { status: 403 });
    }

    // Soft delete (Arşivle)
    await prisma.jewelerNotebookEntry.update({
      where: { id },
      data: {
        status: NOTEBOOK_STATUS.ARCHIVED,
        updatedBy: ctx.userName || ctx.userId,
      },
    });

    await logActivity({
      dealerId,
      userId: ctx.userId,
      action: 'NOTEBOOK_ENTRY_DELETE',
      details: `Defter notu arşivlendi: "${existing.title}"`,
    });

    return NextResponse.json({ success: true, status: NOTEBOOK_STATUS.ARCHIVED });
  } catch (error: any) {
    if (error.statusCode === 401 || error.statusCode === 403) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error('[API Notebook Detail] DELETE Error:', error);
    return NextResponse.json({ error: 'Not silinemedi.' }, { status: 500 });
  }
}
