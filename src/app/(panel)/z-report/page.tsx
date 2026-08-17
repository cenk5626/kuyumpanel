import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { getDailyZReportSummary } from '@/lib/z-report';
import ZReportClient from './ZReportClient';

export default async function ZReportPage() {
  const session = await auth();
  if (!session) {
    redirect('/login');
  }

  const dealerId = (session.user as any).dealerId || 'merkez';
  const userName = (session.user as any).name || (session.user as any).email || 'Kasiyer';

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
}
