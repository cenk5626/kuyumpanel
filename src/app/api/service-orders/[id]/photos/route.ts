import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthenticatedContext, assertTenantOwnership } from '@/lib/security/auth-context';
import { SERVICE_PHOTO_CONFIG, SERVICE_PHOTO_TYPES } from '@/constants/service';
import { logActivity } from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await getAuthenticatedContext();
    const dealerId = ctx.dealerId;
    const { id } = await params;

    const order = await prisma.serviceOrder.findFirst({
      where: { id, dealerId },
    });

    if (!order) {
      return NextResponse.json({ error: 'Servis kaydı bulunamadı.' }, { status: 404 });
    }

    const body = await req.json();
    const {
      storageReference,
      fileName,
      mimeType,
      fileSize,
      photoType = SERVICE_PHOTO_TYPES.INTAKE,
    } = body;

    if (!storageReference || !fileName || !mimeType) {
      return NextResponse.json({
        error: 'Dosya referansı, dosya adı ve MIME türü zorunludur.',
      }, { status: 400 });
    }

    // MIME türü doğrulaması
    if (!SERVICE_PHOTO_CONFIG.ALLOWED_MIME_TYPES.includes(mimeType as any)) {
      return NextResponse.json({
        error: `Geçersiz dosya türü (${mimeType}). Yalnızca JPEG, PNG ve WEBP formatları desteklenir.`,
      }, { status: 400 });
    }

    // Dosya boyutu doğrulaması (Azami 5MB)
    const size = Number(fileSize) || 0;
    if (size > SERVICE_PHOTO_CONFIG.MAX_PHOTO_SIZE_BYTES) {
      return NextResponse.json({
        error: `Dosya boyutu 5MB sınırını aşamaz (Yüklenen: ${(size / (1024 * 1024)).toFixed(2)} MB).`,
      }, { status: 400 });
    }

    const photo = await prisma.$transaction(async (tx) => {
      const p = await tx.serviceOrderPhoto.create({
        data: {
          serviceOrderId: order.id,
          storageReference,
          fileName,
          mimeType,
          fileSize: size,
          photoType,
          uploadedBy: ctx.userName || ctx.userId,
        },
      });

      await tx.serviceOrderEvent.create({
        data: {
          serviceOrderId: order.id,
          fromStatus: order.status,
          toStatus: order.status,
          action: 'PHOTO_UPLOADED',
          notes: `Fotoğraf yüklendi: ${fileName} (${photoType})`,
          performedBy: ctx.userName || ctx.userId,
        },
      });

      return p;
    });

    await logActivity({
      dealerId,
      userId: ctx.userId,
      action: 'SERVICE_PHOTO_UPLOAD',
      details: `${order.serviceNumber} nolu servise fotoğraf eklendi: ${fileName}`,
    });

    return NextResponse.json({ success: true, photo }, { status: 201 });
  } catch (error: any) {
    if (error.statusCode === 401 || error.statusCode === 403) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error('[API Service Order Photos] POST Error:', error);
    return NextResponse.json({ error: 'Servis fotoğrafı kaydedilemedi.' }, { status: 500 });
  }
}
