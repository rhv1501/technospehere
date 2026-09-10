'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { OverviewMetrics } from '@/components/dashboard/OverviewMetrics';
import { AddVendorModal } from '@/components/vendors/AddVendorModal';
import { CreateLeadModal } from '@/components/leads/CreateLeadModal';

export function DashboardClientWrapper({
  metrics,
  recentRegistrations,
  recentLeads,
  categories,
}: {
  metrics: any;
  recentRegistrations: any[];
  recentLeads: any[];
  categories: any[];
}) {
  const router = useRouter();
  const [addVendorOpen, setAddVendorOpen] = useState(false);
  const [createLeadOpen, setCreateLeadOpen] = useState(false);

  return (
    <>
      <OverviewMetrics
        metrics={metrics}
        recentRegistrations={recentRegistrations}
        recentLeads={recentLeads}
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
