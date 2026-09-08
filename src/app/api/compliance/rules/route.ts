import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedContext } from '@/lib/security/auth-context';
import {
  AML_RISK_LEVEL,
  AML_RULE_CODE,
  MASAK_DEFAULTS,
} from '@/constants/compliance';

export const dynamic = 'force-dynamic';

/**
 * GET /api/compliance/rules
 * Bayiye ait AML uyum ve eşik kurallarını listeler (yoksa varsayılanları başlatır).
 */
export async function GET() {
  try {
    const ctx = await getAuthenticatedContext();
    const dealerId = ctx.dealerId;

    let rules = await prisma.amlRiskRule.findMany({
      where: { dealerId },
      orderBy: { createdAt: 'asc' },
    });

    // Eğer henüz hiç kural yoksa varsayılan yasal kuralları seed et
    if (rules.length === 0) {
      const defaultRules = [
        {
          dealerId,
          ruleCode: AML_RULE_CODE.KYC_SINGLE_TX,
          name: 'Tek Seferlik Nakit Kimlik Eşiği',
          thresholdAmount: MASAK_DEFAULTS.KYC_CASH_THRESHOLD_TL,
          timeWindowHours: 0,
          riskLevel: AML_RISK_LEVEL.HIGH,
          isActive: true,
          description: '185.000 TL ve üzeri tekil nakit işlemlerde TCKN/Pasaport zorunluluğu.',
        },
        {
          dealerId,
          ruleCode: AML_RULE_CODE.DAILY_STRUCTURING,
          name: 'Günlük Parçalama (Smurfing) Takibi',
          thresholdAmount: MASAK_DEFAULTS.KYC_CASH_THRESHOLD_TL,
          timeWindowHours: MASAK_DEFAULTS.STRUCTURING_LOOKBACK_HOURS,
          riskLevel: AML_RISK_LEVEL.CRITICAL,
          isActive: true,
          description: '24 saat içinde eşik altı bölünmüş nakit işlemlerin toplamı eşiği aştığında uyarı.',
        },
        {
          dealerId,
          ruleCode: AML_RULE_CODE.PEP_HIGH_VALUE,
          name: 'PEP (Siyasi Nüfuz) Eşik Takibi',
          thresholdAmount: MASAK_DEFAULTS.PEP_MAX_ALLOWABLE_UNAUDITED_TL,
          timeWindowHours: 24,
          riskLevel: AML_RISK_LEVEL.HIGH,
          isActive: true,
          description: 'Siyasi Nüfuz Sahibi Kişi için 50.000 TL üzeri tüm işlemlerde bildirim.',
        },
      ];

      for (const dr of defaultRules) {
        await prisma.amlRiskRule.create({ data: dr });
      }

      rules = await prisma.amlRiskRule.findMany({
        where: { dealerId },
        orderBy: { createdAt: 'asc' },
      });
    }

    return NextResponse.json({ success: true, rules });
  } catch (error: any) {
    console.error('[API Compliance Rules GET Error]:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Uyum kuralları listelenemedi' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/compliance/rules
 * Belirli bir kuralın eşik tutarını veya aktiflik durumunu günceller/oluşturur.
 */
export async function POST(request: NextRequest) {
  try {
    const ctx = await getAuthenticatedContext();
    const dealerId = ctx.dealerId;

    const body = await request.json();
    const { ruleCode, name, thresholdAmount, timeWindowHours, riskLevel, isActive } = body;

    if (!ruleCode || thresholdAmount === undefined) {
      return NextResponse.json(
        { success: false, error: 'ruleCode ve thresholdAmount zorunludur' },
        { status: 400 }
      );
    }

    const rule = await prisma.amlRiskRule.upsert({
      where: {
        dealerId_ruleCode: {
          dealerId,
          ruleCode,
        },
      },
      update: {
        name: name || undefined,
        thresholdAmount: Number(thresholdAmount),
        timeWindowHours: timeWindowHours !== undefined ? Number(timeWindowHours) : undefined,
        riskLevel: riskLevel || undefined,
        isActive: isActive !== undefined ? Boolean(isActive) : undefined,
      },
      create: {
        dealerId,
        ruleCode,
        name: name || ruleCode,
        thresholdAmount: Number(thresholdAmount),
        timeWindowHours: timeWindowHours !== undefined ? Number(timeWindowHours) : 24,
        riskLevel: riskLevel || AML_RISK_LEVEL.HIGH,
        isActive: isActive !== undefined ? Boolean(isActive) : true,
      },
    });

    return NextResponse.json({ success: true, rule });
  } catch (error: any) {
    console.error('[API Compliance Rules POST Error]:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Kural güncellenemedi' },
      { status: 500 }
    );
  }
}
