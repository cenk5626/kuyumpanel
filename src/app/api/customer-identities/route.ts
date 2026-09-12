import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthenticatedContext } from '@/lib/security/auth-context';
import { validateTckn, generateTcknFingerprint } from '@/lib/security/tckn-utils';
import { encryptSecret } from '@/lib/security/encryption';
import { maskTckn } from '@/lib/security/masking';
import { IDENTITY_PURPOSE, IDENTITY_STATUS, RETENTION_PERIOD_YEARS } from '@/constants/identity-vault';
import { logActivity } from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const ctx = await getAuthenticatedContext();
    const dealerId = ctx.dealerId;

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search');
    const customerId = searchParams.get('customerId');
    const status = searchParams.get('status');
    const purpose = searchParams.get('purpose');

    const whereClause: any = { dealerId };
    if (customerId) whereClause.customerId = customerId;
    if (status && status !== 'ALL') whereClause.status = status;
    if (purpose && purpose !== 'ALL') whereClause.purpose = purpose;

    if (search) {
      whereClause.OR = [
        { firstName: { contains: search } },
        { lastName: { contains: search } },
        { maskedTcNo: { contains: search } },
      ];
    }

    const identities = await prisma.customerIdentity.findMany({
      where: whereClause,
      select: {
        id: true,
        customerId: true,
        customer: {
          select: { id: true, name: true, phone: true },
        },
        firstName: true,
        lastName: true,
        maskedTcNo: true, // SADECE MASKELİ TCKN DÖNÜLÜR
        purpose: true,
        legalBasisOrConsentReference: true,
        collectedAt: true,
        retentionUntil: true,
        status: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });

    return NextResponse.json({ identities });
  } catch (error: any) {
    if (error.statusCode === 401 || error.statusCode === 403) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error('[API Customer Identities] GET Error:', error);
    return NextResponse.json({ error: 'Kimlik kayıtları alınamadı.' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const ctx = await getAuthenticatedContext();
    const dealerId = ctx.dealerId;

    const body = await req.json();
    const {
      customerId,
      firstName,
      lastName,
      tcNo,
      purpose = IDENTITY_PURPOSE.GENEL,
      legalBasisOrConsentReference,
      retentionYears = RETENTION_PERIOD_YEARS.MASAK_LEGAL,
    } = body;

    if (!firstName || !lastName || !tcNo) {
      return NextResponse.json({
        error: 'Ad, soyad ve T.C. Kimlik Numarası zorunludur.',
      }, { status: 400 });
    }

    // TCKN resmi algoritma doğrulaması
    const validation = validateTckn(tcNo);
    if (!validation.isValid || !validation.cleanedTcNo) {
      return NextResponse.json({
        error: validation.error || 'Geçersiz T.C. Kimlik Numarası.',
      }, { status: 400 });
    }

    const cleanedTcNo = validation.cleanedTcNo;
    const fingerprint = generateTcknFingerprint(cleanedTcNo);

    // Çift kayıt kontrolü
    const existing = await prisma.customerIdentity.findUnique({
      where: {
        dealerId_tcNoFingerprint: {
          dealerId,
          tcNoFingerprint: fingerprint,
        },
      },
    });

    if (existing) {
      return NextResponse.json({
        error: 'Bu T.C. Kimlik Numarası kimlik havuzunda zaten kayıtlıdır.',
      }, { status: 409 });
    }

    // Saklama süresi hesaplama
    const retentionDate = new Date();
    retentionDate.setFullYear(retentionDate.getFullYear() + Number(retentionYears));

    // AES-256-GCM ile şifrele ve maskele
    const encryptedTcNo = encryptSecret(cleanedTcNo);
    const masked = maskTckn(cleanedTcNo);

    const newIdentity = await prisma.customerIdentity.create({
      data: {
        dealerId,
        customerId: customerId || null,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        encryptedTcNo,
        tcNoFingerprint: fingerprint,
        maskedTcNo: masked,
        purpose,
        legalBasisOrConsentReference: legalBasisOrConsentReference || null,
        retentionUntil: retentionDate,
        status: IDENTITY_STATUS.ACTIVE,
        createdBy: ctx.userName || ctx.userId,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        maskedTcNo: true,
        purpose: true,
        collectedAt: true,
        retentionUntil: true,
        status: true,
        createdAt: true,
      },
    });

    await logActivity({
      dealerId,
      userId: ctx.userId,
      action: 'CUSTOMER_IDENTITY_CREATE',
      details: `${firstName} ${lastName} (${masked}) kimlik kaydı havuza eklendi (Amaç: ${purpose}).`,
    });

    return NextResponse.json({ success: true, identity: newIdentity }, { status: 201 });
  } catch (error: any) {
    if (error.statusCode === 401 || error.statusCode === 403) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error('[API Customer Identities] POST Error:', error);
    return NextResponse.json({ error: 'Kimlik kaydı oluşturulamadı.' }, { status: 500 });
  }
}
