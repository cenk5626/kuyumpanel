import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedContext } from '@/lib/security/auth-context';
import {
  generateTotpSecret,
  verifyTotpToken,
  generateRecoveryCodes,
  verifyAndBurnRecoveryCode,
} from '@/lib/security/totp';
import { encryptSecret, decryptSecret } from '@/lib/security/encryption';
import { checkRateLimit } from '@/lib/security/rate-limit';
import { SECURITY_CONFIG } from '@/constants/security';
import { logActivity } from '@/lib/logger';

export const dynamic = 'force-dynamic';

/**
 * GET /api/auth/2fa — TOTP kurulumu için QR kod URI ve gizli anahtarı döner
 */
export async function GET() {
  try {
    const ctx = await getAuthenticatedContext();

    const user = await prisma.user.findUnique({
      where: { id: ctx.userId },
      select: {
        id: true,
        email: true,
        twoFactorEnabled: true,
        twoFactorSecret: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'Kullanıcı bulunamadı.' }, { status: 404 });
    }

    if (user.twoFactorEnabled) {
      return NextResponse.json({
        enabled: true,
        message: 'İki aşamalı doğrulama (2FA) bu hesapta zaten aktif.',
      });
    }

    // Yeni TOTP Secret oluştur
    const { secret, uri } = generateTotpSecret(user.email, 'KuyumPanel');
    const encryptedSecret = encryptSecret(secret);

    // Henüz etkinleşmemiş taslak secret'ı kaydet
    await prisma.user.update({
      where: { id: user.id },
      data: { twoFactorSecret: encryptedSecret },
    });

    return NextResponse.json({
      enabled: false,
      secret, // İstemciye QR kod göstermek için tek seferlik sunulur
      uri,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || '2FA bilgileri alınamadı.' },
      { status: err.statusCode || 500 }
    );
  }
}

/**
 * POST /api/auth/2fa — TOTP kodunu doğrular, 2FA'yı aktifleştirir veya kapatır
 */
export async function POST(req: NextRequest) {
  try {
    const ctx = await getAuthenticatedContext();

    // Rate limit kontrolü
    const rateCheck = checkRateLimit(`2fa:${ctx.userId}`, SECURITY_CONFIG.RATE_LIMITS.AUTH_2FA);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: 'Çok fazla deneme yapıldı. Lütfen 1 dakika sonra tekrar deneyiniz.' },
        { status: 429 }
      );
    }

    const body = await req.json();
    const { action, token, recoveryCode } = body;

    const user = await prisma.user.findUnique({
      where: { id: ctx.userId },
      select: {
        id: true,
        twoFactorEnabled: true,
        twoFactorSecret: true,
        recoveryCodes: true,
      },
    });

    if (!user || !user.twoFactorSecret) {
      return NextResponse.json(
        { error: '2FA kurulumu başlatılmamış. Lütfen önce kurulumu başlatınız.' },
        { status: 400 }
      );
    }

    const decryptedSecret = decryptSecret(user.twoFactorSecret);
    if (!decryptedSecret) {
      return NextResponse.json(
        { error: '2FA güvenlik anahtarı çözülemedi. Lütfen tekrar kurunuz.' },
        { status: 500 }
      );
    }

    // 1. 2FA ETKİNLEŞTİRME (ENABLE)
    if (action === 'ENABLE') {
      if (!token) {
        return NextResponse.json({ error: 'Doğrulama kodu (6 hane) gereklidir.' }, { status: 400 });
      }

      const isValid = verifyTotpToken(decryptedSecret, token);
      if (!isValid) {
        return NextResponse.json({ error: 'Geçersiz doğrulama kodu.' }, { status: 400 });
      }

      // 10 adet tek kullanımlık kurtarma kodu üret
      const { plainCodes, hashedCodes } = generateRecoveryCodes();

      await prisma.user.update({
        where: { id: user.id },
        data: {
          twoFactorEnabled: true,
          recoveryCodes: JSON.stringify(hashedCodes),
        },
      });

      await logActivity({
        dealerId: ctx.dealerId,
        action: 'GÜVENLİK AYARI',
        details: 'İki Aşamalı Doğrulama (2FA) başarıyla aktifleştirildi.',
        userId: ctx.userId,
        userName: ctx.userName,
        userEmail: ctx.userEmail,
      });

      return NextResponse.json({
        success: true,
        message: 'İki Aşamalı Doğrulama (2FA) başarıyla aktifleştirildi.',
        recoveryCodes: plainCodes, // Kullanıcıya güvenli bir yere kaydetmesi için yalnızca bu anda gösterilir
      });
    }

    // 2. 2FA DEVRE DIŞI BIRAKMA (DISABLE)
    if (action === 'DISABLE') {
      let isVerified = false;

      if (token) {
        isVerified = verifyTotpToken(decryptedSecret, token);
      } else if (recoveryCode) {
        const burnResult = verifyAndBurnRecoveryCode(user.recoveryCodes, recoveryCode);
        isVerified = burnResult.valid;
      }

      if (!isVerified) {
        return NextResponse.json({ error: 'Geçersiz doğrulama veya kurtarma kodu.' }, { status: 400 });
      }

      await prisma.user.update({
        where: { id: user.id },
        data: {
          twoFactorEnabled: false,
          twoFactorSecret: null,
          recoveryCodes: null,
        },
      });

      await logActivity({
        dealerId: ctx.dealerId,
        action: 'GÜVENLİK AYARI',
        details: 'İki Aşamalı Doğrulama (2FA) devre dışı bırakıldı.',
        userId: ctx.userId,
        userName: ctx.userName,
        userEmail: ctx.userEmail,
      });

      return NextResponse.json({
        success: true,
        message: 'İki Aşamalı Doğrulama (2FA) devre dışı bırakıldı.',
      });
    }

    return NextResponse.json({ error: 'Geçersiz işlem türü.' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'İşlem gerçekleştirilemedi.' },
      { status: err.statusCode || 500 }
    );
  }
}
