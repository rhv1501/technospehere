'use client';

import { useState } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { OverviewMetrics } from '@/components/dashboard/OverviewMetrics';
import { AddVendorModal } from '@/components/vendors/AddVendorModal';
import { CreateLeadModal } from '@/components/leads/CreateLeadModal';
import { DateRangePreset } from '@/lib/dateFilterUtils';

export function DashboardClientWrapper({
  allVendors,
  allRegistrations,
  allLeads,
  categories,
}: {
  allVendors: any[];
  allRegistrations: any[];
  allLeads: any[];
  categories: any[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const initialRange = (searchParams.get('range') as DateRangePreset) || 'all';
  const initialFrom = searchParams.get('from') || '';
  const initialTo = searchParams.get('to') || '';

  const [selectedPreset, setSelectedPreset] = useState<DateRangePreset>(initialRange);
  const [customFrom, setCustomFrom] = useState<string>(initialFrom);
  const [customTo, setCustomTo] = useState<string>(initialTo);

  const [addVendorOpen, setAddVendorOpen] = useState(false);
  const [createLeadOpen, setCreateLeadOpen] = useState(false);

  const handleFilterChange = (preset: DateRangePreset, from?: string, to?: string) => {
    setSelectedPreset(preset);
    const newFrom = from || '';
    const newTo = to || '';
    setCustomFrom(newFrom);
    setCustomTo(newTo);

    const params = new URLSearchParams(searchParams.toString());
    if (preset === 'all') {
      params.delete('range');
      params.delete('from');
      params.delete('to');
    } else {
      params.set('range', preset);
      if (preset === 'custom' && newFrom && newTo) {
        params.set('from', newFrom);
        params.set('to', newTo);
      } else {
        params.delete('from');
        params.delete('to');
      }
    }
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  return (
    <>
      <OverviewMetrics
        allVendors={allVendors}
        allRegistrations={allRegistrations}
        allLeads={allLeads}
        selectedPreset={selectedPreset}
        customFrom={customFrom}
        customTo={customTo}
        onFilterChange={handleFilterChange}
        onOpenAddVendor={() => setAddVendorOpen(true)}
        onOpenCreateLead={() => setCreateLeadOpen(true)}
      />

      <AddVendorModal
        isOpen={addVendorOpen}
        onClose={() => setAddVendorOpen(false)}
        categories={categories}
        onSuccess={() => router.refresh()}
      />

      <CreateLeadModal
        isOpen={createLeadOpen}
        onClose={() => setCreateLeadOpen(false)}
        categories={categories}
        onSuccess={(leadId) => {
          router.refresh();
          router.push(`/dashboard/leads/${leadId}`);
        }}
      />
    </>
  );
}
