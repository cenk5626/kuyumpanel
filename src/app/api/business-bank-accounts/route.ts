import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthenticatedContext } from '@/lib/security/auth-context';
import { validateTurkishIban, generateIbanFingerprint } from '@/lib/banking/iban-utils';
import { encryptSecret } from '@/lib/security/encryption';
import { maskIban } from '@/lib/security/masking';
import { logActivity } from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const ctx = await getAuthenticatedContext();
    const dealerId = ctx.dealerId;

    const { searchParams } = new URL(req.url);
    const currency = searchParams.get('currency');
    const branchId = searchParams.get('branchId');

    const whereClause: any = { dealerId };
    if (currency && currency !== 'ALL') whereClause.currency = currency;
    if (branchId && branchId !== 'ALL') whereClause.branchId = branchId;

    const accounts = await prisma.businessBankAccount.findMany({
      where: whereClause,
      select: {
        id: true,
        bankName: true,
        accountHolderName: true,
        currency: true,
        maskedIban: true, // SADECE MASKELİ IBAN DÖNER
        isActive: true,
        isDefault: true,
        note: true,
        branchId: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: [
        { isDefault: 'desc' },
        { createdAt: 'asc' },
      ],
    });

    return NextResponse.json({ accounts });
  } catch (error: any) {
    if (error.statusCode === 401 || error.statusCode === 403) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error('[API Business Bank Accounts] GET Error:', error);
    return NextResponse.json({ error: 'Banka hesapları alınamadı.' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const ctx = await getAuthenticatedContext();
    const dealerId = ctx.dealerId;

    const body = await req.json();
    const {
      bankName,
      accountHolderName,
      iban,
      currency = 'TRY',
      branchId,
      isDefault = false,
      note,
    } = body;

    if (!bankName || !accountHolderName || !iban) {
      return NextResponse.json({
        error: 'Banka adı, hesap sahibi ve IBAN alanları zorunludur.',
      }, { status: 400 });
    }

    // IBAN doğrulama
    const validation = validateTurkishIban(iban);
    if (!validation.isValid || !validation.cleanedIban) {
      return NextResponse.json({ error: validation.error || 'Geçersiz IBAN formatı.' }, { status: 400 });
    }

    const cleanedIban = validation.cleanedIban;
    const fingerprint = generateIbanFingerprint(cleanedIban);

    // Çift kayıt (Duplicate) kontrolü
    const existing = await prisma.businessBankAccount.findUnique({
      where: {
        dealerId_ibanFingerprint: {
          dealerId,
          ibanFingerprint: fingerprint,
        },
      },
    });

    if (existing) {
      return NextResponse.json({
        error: 'Bu IBAN numarası mağazanız için zaten kayıtlıdır.',
      }, { status: 409 });
    }

    // AES-256-GCM ile şifrele ve maskele
    const encryptedIban = encryptSecret(cleanedIban);
    const masked = maskIban(cleanedIban);

    const newAccount = await prisma.$transaction(async (tx) => {
      // Eğer varsayılan olarak işaretlendiyse, aynı para birimindeki diğer varsayılanları kaldır
      if (isDefault) {
        await tx.businessBankAccount.updateMany({
          where: { dealerId, currency, isDefault: true },
          data: { isDefault: false },
        });
      }

      return tx.businessBankAccount.create({
        data: {
          dealerId,
          branchId: branchId || null,
          bankName,
          accountHolderName,
          currency,
          encryptedIban,
          ibanFingerprint: fingerprint,
          maskedIban: masked,
          isDefault: Boolean(isDefault),
          note: note || null,
          createdBy: ctx.userName || ctx.userId,
        },
        select: {
          id: true,
          bankName: true,
          accountHolderName: true,
          currency: true,
          maskedIban: true,
          isActive: true,
          isDefault: true,
          note: true,
          createdAt: true,
        },
      });
    });

    await logActivity({
      dealerId,
      userId: ctx.userId,
      action: 'BUSINESS_BANK_ACCOUNT_CREATE',
      details: `${bankName} (${masked}, ${currency}) hesabı eklendi.`,
    });

    return NextResponse.json({ success: true, account: newAccount }, { status: 201 });
  } catch (error: any) {
    if (error.statusCode === 401 || error.statusCode === 403) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error('[API Business Bank Accounts] POST Error:', error);
    return NextResponse.json({ error: 'Banka hesabı kaydedilemedi.' }, { status: 500 });
  }
}
