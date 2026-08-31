import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const dealerId = (session.user as any)?.dealerId || 'merkez';

    const dealer = await prisma.dealer.findUnique({
      where: { id: dealerId },
      select: {
        id: true,
        name: true,
        aiProvider: true,
        geminiApiKey: true,
        openaiApiKey: true,
        aiModel: true,
        aiSystemPromptExtra: true,
        whatsappProvider: true,
        whatsappPhone: true,
        waCloudAccessToken: true,
        waCloudPhoneId: true,
        waCloudBusinessId: true,
        waGatewayInstanceId: true,
        waGatewayToken: true,
      },
    });

    if (!dealer) {
      return NextResponse.json({ error: 'Bayi bulunamadı.' }, { status: 404 });
    }

    // Mask sensitive keys for security
    const maskedSettings = {
      ...dealer,
      geminiApiKeyMasked: dealer.geminiApiKey ? `${dealer.geminiApiKey.substring(0, 6)}...${dealer.geminiApiKey.slice(-4)}` : null,
      openaiApiKeyMasked: dealer.openaiApiKey ? `${dealer.openaiApiKey.substring(0, 6)}...${dealer.openaiApiKey.slice(-4)}` : null,
      waCloudTokenMasked: dealer.waCloudAccessToken ? `${dealer.waCloudAccessToken.substring(0, 6)}...` : null,
    };

    return NextResponse.json(maskedSettings);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Ayarlar alınamadı.' }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const dealerId = (session.user as any)?.dealerId || 'merkez';
    const body = await req.json();

    const updateData: any = {};

    if (body.aiProvider !== undefined) updateData.aiProvider = body.aiProvider;
    if (body.geminiApiKey !== undefined) updateData.geminiApiKey = body.geminiApiKey || null;
    if (body.openaiApiKey !== undefined) updateData.openaiApiKey = body.openaiApiKey || null;
    if (body.aiModel !== undefined) updateData.aiModel = body.aiModel;
    if (body.aiSystemPromptExtra !== undefined) updateData.aiSystemPromptExtra = body.aiSystemPromptExtra || null;

    if (body.whatsappProvider !== undefined) updateData.whatsappProvider = body.whatsappProvider;
    if (body.whatsappPhone !== undefined) updateData.whatsappPhone = body.whatsappPhone || null;
    if (body.waCloudAccessToken !== undefined) updateData.waCloudAccessToken = body.waCloudAccessToken || null;
    if (body.waCloudPhoneId !== undefined) updateData.waCloudPhoneId = body.waCloudPhoneId || null;
    if (body.waCloudBusinessId !== undefined) updateData.waCloudBusinessId = body.waCloudBusinessId || null;
    if (body.waGatewayInstanceId !== undefined) updateData.waGatewayInstanceId = body.waGatewayInstanceId || null;
    if (body.waGatewayToken !== undefined) updateData.waGatewayToken = body.waGatewayToken || null;

    const updated = await prisma.dealer.update({
      where: { id: dealerId },
      data: updateData,
    });

    return NextResponse.json({ success: true, message: 'Yapay Zeka ve WhatsApp ayarları kaydedildi.' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Ayarlar güncellenemedi.' }, { status: 500 });
  }
}
