import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import PriceCheckClient from './PriceCheckClient';

export default async function PriceCheckPage() {
  const session = await auth();
  if (!session) {
    redirect('/login');
  }

  return <PriceCheckClient />;
}
