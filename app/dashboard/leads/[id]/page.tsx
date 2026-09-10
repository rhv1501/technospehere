import { getLeadById } from '@/actions/leads';
import { getCategories } from '@/actions/categories';
import { getVendors } from '@/actions/vendors';
import { LeadDetailsView } from '@/components/leads/LeadDetailsView';
import { notFound } from 'next/navigation';

export const revalidate = 0;

export default async function LeadDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [leadRes, catRes, vendorsRes] = await Promise.all([
    getLeadById(id),
    getCategories(),
    getVendors(),
  ]);

  if (!leadRes.success || !leadRes.lead) {
    notFound();
  }

  return (
    <LeadDetailsView
      lead={leadRes.lead}
      categories={catRes.categories || []}
      allVendors={vendorsRes.vendors || []}
    />
  );
}
