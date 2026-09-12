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

    // Yetki kontrolü: Yalnızca ADMIN veya IBAN_VIEW_PLAIN yetkisi olanlar
    const isAuthorized =
      ctx.role === 'SUPER_ADMIN' ||
      ctx.role === 'ADMIN' ||
      (ctx.permissions && ctx.permissions.includes(PERMISSIONS.IBAN_VIEW_PLAIN));

    if (!isAuthorized) {
      return NextResponse.json({
        error: 'Tam IBAN numarasını görüntüleme yetkiniz bulunmamaktadır.',
      }, { status: 403 });
    }

    const account = await prisma.businessBankAccount.findFirst({
      where: { id, dealerId },
    });

    if (!account) {
      return NextResponse.json({ error: 'Banka hesabı bulunamadı.' }, { status: 404 });
    }

    const decrypted = decryptSecret(account.encryptedIban);
    if (!decrypted) {
      return NextResponse.json({ error: 'IBAN şifresi çözülemedi.' }, { status: 500 });
    }

    let reason = 'Görüntüleme';
    try {
      const body = await req.json();
      if (body.reason) reason = body.reason;
    } catch {}

    // Güvenlik denetim günlüğü (AuditLog)
    await logActivity({
      dealerId,
      userId: ctx.userId,
      userEmail: ctx.userEmail,
      userName: ctx.userName,
      action: 'BUSINESS_IBAN_REVEALED',
      details: `${account.bankName} (${account.maskedIban}) tam IBAN açıldı. Gerekçe: ${reason}`,
    });

    const formatted = decrypted.replace(/(.{4})/g, '$1 ').trim();

    return NextResponse.json({
      plainIban: decrypted,
      formattedIban: formatted,
    });
  } catch (error: any) {
    if (error.statusCode === 401 || error.statusCode === 403) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error('[API Business Bank Account Reveal] Error:', error);
    return NextResponse.json({ error: 'IBAN çözülemedi.' }, { status: 500 });
  }
}
