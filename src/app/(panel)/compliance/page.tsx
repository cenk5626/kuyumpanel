import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { ROUTES } from '@/constants/routes';
import { hasPagePermission } from '@/constants/page-permissions';
import AccessDenied from '@/components/AccessDenied';
import { getAuthenticatedContext } from '@/lib/security/auth-context';
import ComplianceClient from './ComplianceClient';
import { COMPLIANCE_CASE_STATUS, AML_TRIGGER_TYPE } from '@/constants/compliance';

export const dynamic = 'force-dynamic';

export default async function CompliancePage() {
  let session = null;
  try {
    session = await auth();
  } catch (e) {
    console.error('Compliance auth error:', e);
  }

  if (!session) {
    redirect(ROUTES.LOGIN);
  }

  const userRole = (session.user as any)?.role;
  const userPermissions = (session.user as any)?.permissions;

  if (!hasPagePermission(userRole, userPermissions, '/compliance')) {
    return (
      <AccessDenied
        pageTitle="MASAK & AML Uyum"
        userRole={userRole}
        requiredModule="/compliance"
      />
    );
  }

  let initialCases: any[] = [];
  let initialRules: any[] = [];
  let stats = {
    totalCases: 0,
    openCases: 0,
    reportedCount: 0,
    structuringCount: 0,
  };

  try {
    const ctx = await getAuthenticatedContext();
    const dealerId = ctx.dealerId;

    const [cases, rules] = await Promise.all([
      prisma.complianceCase.findMany({
        where: { dealerId },
        include: {
          customer: {
            select: { id: true, name: true, phone: true, tcNo: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 100,
      }),
      prisma.amlRiskRule.findMany({
        where: { dealerId },
        orderBy: { createdAt: 'asc' },
      }),
    ]);

    initialCases = cases.map((c) => ({
      id: c.id,
      caseNumber: c.caseNumber,
      customerId: c.customerId,
      customerName: c.customerName,
      customerTcNo: c.customerTcNo,
      customerPhone: c.customerPhone,
      riskLevel: c.riskLevel,
      status: c.status,
      triggerType: c.triggerType,
      detectedAmount: c.detectedAmount,
      description: c.description,
      investigationNotes: c.investigationNotes,
      sarDraft: c.sarDraft,
      reportedToMasakAt: c.reportedToMasakAt
        ? c.reportedToMasakAt instanceof Date
          ? c.reportedToMasakAt.toISOString()
          : new Date(c.reportedToMasakAt).toISOString()
        : null,
      reportedBy: c.reportedBy,
      reviewedBy: c.reviewedBy,
      createdAt: c.createdAt instanceof Date
        ? c.createdAt.toISOString()
        : new Date(c.createdAt).toISOString(),
    }));

    initialRules = rules.map((r) => ({
      id: r.id,
      ruleCode: r.ruleCode,
      name: r.name,
      thresholdAmount: r.thresholdAmount,
      timeWindowHours: r.timeWindowHours,
      riskLevel: r.riskLevel,
      isActive: r.isActive,
      description: r.description,
    }));

    stats = {
      totalCases: cases.length,
      openCases: cases.filter(
        (c) => c.status === COMPLIANCE_CASE_STATUS.OPEN || c.status === COMPLIANCE_CASE_STATUS.UNDER_REVIEW
      ).length,
      reportedCount: cases.filter((c) => c.status === COMPLIANCE_CASE_STATUS.REPORTED_TO_MASAK).length,
      structuringCount: cases.filter((c) => c.triggerType === AML_TRIGGER_TYPE.SMURFING_DETECTED).length,
    };
  } catch (error) {
    console.error('[CompliancePage Error]:', error);
  }

  return (
    <ComplianceClient
      initialCases={initialCases}
      initialRules={initialRules}
      initialStats={stats}
    />
  );
}
