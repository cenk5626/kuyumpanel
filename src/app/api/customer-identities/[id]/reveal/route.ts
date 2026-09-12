import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthenticatedContext } from '@/lib/security/auth-context';
import { decryptSecret } from '@/lib/security/encryption';
import { logActivity } from '@/lib/logger';
import { PERMISSIONS } from '@/constants/permissions';

export const dynamic = 'force-dynamic';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await getAuthenticatedContext();
    const dealerId = ctx.dealerId;
    const { id } = await params;

    // Yetki kontrolü: Yalnızca ADMIN veya TCKN_VIEW_PLAIN yetkisi olanlar
    const isAuthorized =
      ctx.role === 'SUPER_ADMIN' ||
      ctx.role === 'ADMIN' ||
      (ctx.permissions && ctx.permissions.includes(PERMISSIONS.TCKN_VIEW_PLAIN));

    if (!isAuthorized) {
      return NextResponse.json({
        error: 'T.C. Kimlik Numarasını açık görüntüleme yetkiniz bulunmamaktadır.',
      }, { status: 403 });
    }

    const identity = await prisma.customerIdentity.findFirst({
      where: { id, dealerId },
    });

    if (!identity) {
      return NextResponse.json({ error: 'Kimlik kaydı bulunamadı.' }, { status: 404 });
    }

    const decrypted = decryptSecret(identity.encryptedTcNo);
    if (!decrypted) {
      return NextResponse.json({ error: 'T.C. Kimlik Numarası şifresi çözülemedi.' }, { status: 500 });
    }

    let reason = 'Resmi İşlem / Fatura Düzenleme';
    try {
      const body = await req.json();
      if (body.reason) reason = body.reason;
    } catch {}

    // Sıkı Denetim Günlüğü (AuditLog)
    await logActivity({
      dealerId,
      userId: ctx.userId,
      userEmail: ctx.userEmail,
      userName: ctx.userName,
      action: 'TCKN_REVEALED',
      details: `${identity.firstName} ${identity.lastName} (${identity.maskedTcNo}) kimlik numarası açıldı. Gerekçe: ${reason}`,
    });

    return NextResponse.json({
      plainTcNo: decrypted,
      firstName: identity.firstName,
      lastName: identity.lastName,
    });
  } catch (error: any) {
    if (error.statusCode === 401 || error.statusCode === 403) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error('[API Customer Identity Reveal] Error:', error);
    return NextResponse.json({ error: 'Kimlik numarası çözülemedi.' }, { status: 500 });
  }
}
