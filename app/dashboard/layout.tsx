import { DashboardShell } from '@/components/layout/DashboardShell';
import { getPendingRegistrations } from '@/actions/vendors';

export const revalidate = 0;

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pendingRes = await getPendingRegistrations();
  const pendingCount = (pendingRes.registrations || []).filter(
    (r: any) => r.status === 'pending'
  ).length;

  return (
    <DashboardShell pendingCount={pendingCount}>
      {children}
    </DashboardShell>
  );
}
