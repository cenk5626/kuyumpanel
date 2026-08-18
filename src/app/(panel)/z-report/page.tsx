import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { getDailyZReportSummary } from '@/lib/z-report';
import ZReportClient from './ZReportClient';

export const dynamic = 'force-dynamic';

export default async function ZReportPage() {
  let session = null;
  try {
    session = await auth();
  } catch (e) {
    console.error('ZReportPage auth error:', e);
  }

  if (!session) {
    redirect('/login');
  }

  const dealerId = (session.user as any)?.dealerId || 'merkez';
  const userName = (session.user as any)?.name || (session.user as any)?.email || 'Kasiyer';

  try {
    const summaryData = await getDailyZReportSummary(dealerId);

    // JSON serileştirme (Date nesneleri için)
    const serializedSummary = JSON.parse(JSON.stringify(summaryData));

    return (
      <ZReportClient
        initialSummary={serializedSummary}
        dealerId={dealerId}
        currentUserName={userName}
      />
    );
  } catch (err) {
    console.error('Error in ZReportPage:', err);
    return (
      <ZReportClient
        initialSummary={{
          activeSession: null,
          archiveSessions: [],
          recentMovements: [],
        }}
        dealerId={dealerId}
        currentUserName={userName}
      />
    );
  }
}
