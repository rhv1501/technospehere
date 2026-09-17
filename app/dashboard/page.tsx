import { getVendors, getPendingRegistrations } from '@/actions/vendors';
import { getLeads } from '@/actions/leads';
import { getCategories } from '@/actions/categories';
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

  return (
    <DashboardClientWrapper
      allVendors={vendors}
      allRegistrations={registrations}
      allLeads={leads}
      categories={categories}
    />
  );
}
