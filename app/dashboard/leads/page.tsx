import { getLeads } from '@/actions/leads';
import { getCategories } from '@/actions/categories';
import { LeadsPageClient } from './LeadsPageClient';

export const revalidate = 0;

export default async function LeadsPage() {
  const [leadsRes, catRes] = await Promise.all([getLeads(), getCategories()]);

  return (
    <LeadsPageClient
      initialLeads={leadsRes.leads || []}
      categories={catRes.categories || []}
    />
  );
}
