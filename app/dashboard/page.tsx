import { getVendors, getPendingRegistrations } from '@/actions/vendors';
import { getLeads } from '@/actions/leads';
import { getCategories } from '@/actions/categories';
import { OverviewMetrics } from '@/components/dashboard/OverviewMetrics';
import { DashboardClientWrapper } from './DashboardClientWrapper';

export const revalidate = 0;

export default async function DashboardPage() {
  const [vendorsRes, regsRes, leadsRes, catRes] = await Promise.all([
    getVendors(),
    getPendingRegistrations(),
    getLeads(),
    getCategories(),
  ]);

  const vendors = vendorsRes.vendors || [];
  const registrations = regsRes.registrations || [];
  const leads = leadsRes.leads || [];
  const categories = catRes.categories || [];

  const metrics = {
    totalVendors: vendors.length,
    activeVendors: vendors.filter((v: any) => v.status === 'active').length,
    pendingRegistrations: registrations.filter((r: any) => r.status === 'pending').length,
    totalLeads: leads.length,
    sentLeads: leads.filter((l: any) => l.status === 'sent' || l.status === 'quoted').length,
  };

  const recentRegistrations = registrations
    .filter((r: any) => r.status === 'pending')
    .slice(0, 5);

  const recentLeads = leads.slice(0, 5);

  return (
    <DashboardClientWrapper
      metrics={metrics}
      recentRegistrations={recentRegistrations}
      recentLeads={recentLeads}
      categories={categories}
    />
  );
}
