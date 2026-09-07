import { prisma } from '@/lib/prisma';
import { getAuthenticatedContext } from '@/lib/security/auth-context';
import ApprovalsClient from './ApprovalsClient';

export const dynamic = 'force-dynamic';

export default async function ApprovalsPage() {
  let initialApprovals: any[] = [];
  let currentActor = {
    id: '',
    email: '',
    name: '',
    role: 'USER',
  };

  try {
    const ctx = await getAuthenticatedContext();
    currentActor = {
      id: ctx.userId || ctx.userEmail,
      email: ctx.userEmail,
      name: ctx.userName || ctx.userEmail.split('@')[0],
      role: ctx.role,
    };

    const records = await prisma.approvalRequest.findMany({
      where: { dealerId: ctx.dealerId },
      include: {
        steps: {
          orderBy: { stepLevel: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    initialApprovals = records.map((r) => ({
      id: r.id,
      requestType: r.requestType,
      status: r.status,
      requiredLevel: r.requiredLevel,
      currentLevel: r.currentLevel,
      title: r.title,
      description: r.description,
      amount: r.amount,
      unit: r.unit,
      payload: r.payload,
      requesterId: r.requesterId,
      requesterName: r.requesterName,
      requesterEmail: r.requesterEmail,
      rejectionReason: r.rejectionReason,
      resolvedAt: r.resolvedAt
        ? r.resolvedAt instanceof Date
          ? r.resolvedAt.toISOString()
          : new Date(r.resolvedAt).toISOString()
        : null,
      createdAt: r.createdAt
        ? r.createdAt instanceof Date
          ? r.createdAt.toISOString()
          : new Date(r.createdAt).toISOString()
        : new Date().toISOString(),
      steps: r.steps.map((s) => ({
        id: s.id,
        stepLevel: s.stepLevel,
        requiredRole: s.requiredRole,
        status: s.status,
        approverId: s.approverId,
        approverName: s.approverName,
        approverEmail: s.approverEmail,
        note: s.note,
        actionAt: s.actionAt
          ? s.actionAt instanceof Date
            ? s.actionAt.toISOString()
            : new Date(s.actionAt).toISOString()
          : null,
      })),
    }));
  } catch (error) {
    console.error('[ApprovalsPage Load Error]:', error);
  }

  return (
    <ApprovalsClient
      initialApprovals={initialApprovals}
      currentActor={currentActor}
    />
  );
}
