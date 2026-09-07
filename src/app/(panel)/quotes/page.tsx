import { prisma } from '@/lib/prisma';
import { getAuthenticatedContext } from '@/lib/security/auth-context';
import QuotesClient from './QuotesClient';
import { isQuoteExpiredOrInvalidated } from '@/lib/pricing/quote-engine';

export const dynamic = 'force-dynamic';

export default async function QuotesPage() {
  let quotes: any[] = [];
  let customers: any[] = [];
  let liveHasAsk = 3000;

  try {
    const ctx = await getAuthenticatedContext();
    const dealerId = ctx.dealerId;
    const role = ctx.role;

    const whereClause: any = {};
    if (role !== 'SUPER_ADMIN') {
      whereClause.dealerId = dealerId;
    }

    const [rawQuotes, custs, livePrice] = await Promise.all([
      prisma.quote.findMany({
        where: whereClause,
        include: {
          customer: { select: { id: true, name: true, phone: true } },
          branch: { select: { id: true, name: true, code: true } },
          lines: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 100,
      }),
      prisma.customer.findMany({
        where: whereClause,
        select: { id: true, name: true, phone: true },
        orderBy: { name: 'asc' },
      }),
      prisma.hasPrice.findUnique({
        where: { id: 'singleton' },
      }),
    ]);

    liveHasAsk = livePrice?.ask || 3000;
    customers = custs;

    // Safe Date serialization & evaluation
    quotes = rawQuotes.map((q: any) => {
      const evaluation = isQuoteExpiredOrInvalidated(q, liveHasAsk);
      return {
        ...q,
        isInvalidated: evaluation.isInvalid,
        invalidationReason: evaluation.reason,
        invalidationMessage: evaluation.message,
        currentLiveGoldPrice: liveHasAsk,
        validUntil: q.validUntil ? (q.validUntil instanceof Date ? q.validUntil.toISOString() : new Date(q.validUntil).toISOString()) : new Date().toISOString(),
        approvedAt: q.approvedAt ? (q.approvedAt instanceof Date ? q.approvedAt.toISOString() : new Date(q.approvedAt).toISOString()) : null,
        convertedAt: q.convertedAt ? (q.convertedAt instanceof Date ? q.convertedAt.toISOString() : new Date(q.convertedAt).toISOString()) : null,
        createdAt: q.createdAt ? (q.createdAt instanceof Date ? q.createdAt.toISOString() : new Date(q.createdAt).toISOString()) : new Date().toISOString(),
        updatedAt: q.updatedAt ? (q.updatedAt instanceof Date ? q.updatedAt.toISOString() : new Date(q.updatedAt).toISOString()) : new Date().toISOString(),
      };
    });
  } catch (error) {
    console.error('Quotes Page Server Hatası:', error);
  }

  return <QuotesClient initialQuotes={quotes} customers={customers} liveGoldPrice={liveHasAsk} />;
}
