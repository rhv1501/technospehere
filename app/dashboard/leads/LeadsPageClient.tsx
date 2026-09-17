'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus } from 'lucide-react';
import { LeadsTable } from '@/components/leads/LeadsTable';
import { CreateLeadModal } from '@/components/leads/CreateLeadModal';

export function LeadsPageClient({
  initialLeads,
  categories,
}: {
  initialLeads: any[];
  categories: any[];
}) {
  const router = useRouter();
  const [createModalOpen, setCreateModalOpen] = useState(false);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-[#111827] border border-slate-200/90 dark:border-slate-800/80 p-6 rounded-2xl shadow-sm dark:shadow-xl">
        <div>
          <div className="flex items-center space-x-2 text-xs font-bold text-indigo-600 dark:text-indigo-400 mb-1">
            <span>Step 2 — RFQ Management & Requirements</span>
          </div>
          <h1 className="text-xl font-extrabold text-slate-900 dark:text-slate-100">RFQs & Quotations Database</h1>
          <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">
            Create RFQs, specify requirements and attachments, and select vendors for quotation requests.
          </p>
        </div>

        <button
          onClick={() => setCreateModalOpen(true)}
          className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-extrabold shadow-md shadow-indigo-600/30 flex items-center space-x-1.5 transition-all self-start sm:self-auto hover:scale-[1.02] active:scale-[0.98]"
        >
          <Plus className="w-4 h-4" />
          <span>Create New RFQ</span>
        </button>
      </div>

      <LeadsTable
        leads={initialLeads}
        categories={categories}
        onOpenCreateModal={() => setCreateModalOpen(true)}
      />

      <CreateLeadModal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        categories={categories}
        onSuccess={(leadId) => {
          router.refresh();
          router.push(`/dashboard/leads/${leadId}`);
        }}
      />
    </div>
  );
}
