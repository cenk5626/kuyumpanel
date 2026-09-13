import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { ROUTES } from '@/constants/routes';
import { hasPagePermission } from '@/constants/page-permissions';
import AccessDenied from '@/components/AccessDenied';
import DataHubClient from './DataHubClient';

export const dynamic = 'force-dynamic';

export default async function DataHubPage() {
  let session = null;
  try {
    session = await auth();
  } catch (e) {
    console.error('DataHub auth error:', e);
  }

  if (!session) {
    redirect(ROUTES.LOGIN);
  }

  const userRole = (session.user as any)?.role;
  const userPermissions = (session.user as any)?.permissions;

  if (!hasPagePermission(userRole, userPermissions, '/data-hub')) {
    return (
      <AccessDenied
        pageTitle="Veri Merkezi"
        userRole={userRole}
        requiredModule="/data-hub"
      />
    );
  }

  return <DataHubClient />;
}
