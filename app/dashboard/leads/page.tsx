import { getLeadsPaginated } from '@/actions/leads';
import { getCategories } from '@/actions/categories';
import { LeadsPageClient } from './LeadsPageClient';

export const revalidate = 0;

export default async function LeadsPage() {
  const [leadsRes, catRes] = await Promise.all([
    getLeadsPaginated({ page: 1, pageSize: 15 }),
    getCategories(),
  ]);

  return (
    <LeadsPageClient
      initialLeads={leadsRes.leads || []}
      initialTotalCount={leadsRes.totalCount || 0}
      initialHasMore={leadsRes.hasMore ?? false}
      categories={catRes.categories || []}
    />
  );
}
