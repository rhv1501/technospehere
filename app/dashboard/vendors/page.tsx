import { getVendors, getPendingRegistrations } from '@/actions/vendors';
import { getCategories } from '@/actions/categories';
import { VendorsPageClient } from './VendorsPageClient';

export const revalidate = 0;

export default async function VendorsPage() {
  const [vendorsRes, regsRes, catRes] = await Promise.all([
    getVendors(),
    getPendingRegistrations(),
    getCategories(),
  ]);

  return (
    <VendorsPageClient
      initialVendors={vendorsRes.vendors || []}
      initialRegistrations={regsRes.registrations || []}
      categories={catRes.categories || []}
    />
  );
}
