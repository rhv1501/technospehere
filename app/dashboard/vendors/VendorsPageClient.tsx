'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Building2, UserCheck, ExternalLink, Plus } from 'lucide-react';
import { VendorTable } from '@/components/vendors/VendorTable';
import { PendingRegistrationsTable } from '@/components/vendors/PendingRegistrationsTable';
import { AddVendorModal } from '@/components/vendors/AddVendorModal';
import { CategoryManagerModal } from '@/components/vendors/CategoryManagerModal';
import { toast } from 'sonner';

export function VendorsPageClient({
  initialVendors,
  initialRegistrations,
  categories,
}: {
  initialVendors: any[];
  initialRegistrations: any[];
  categories: any[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialTab = searchParams.get('tab') === 'pending' ? 'pending' : 'database';
  const [activeTab, setActiveTab] = useState<'database' | 'pending'>(initialTab);

  const [addModalOpen, setAddModalOpen] = useState(false);
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);

  const pendingCount = initialRegistrations.filter((r) => r.status === 'pending').length;

  const handleCopyLink = () => {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    navigator.clipboard.writeText(`${origin}/vendor-register`);
    toast.success('Public Vendor Registration Form URL copied!');
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-[#111827] border border-slate-200/90 dark:border-slate-800/80 p-6 rounded-2xl shadow-sm dark:shadow-xl">
        <div>
          <div className="flex items-center space-x-2 text-xs font-bold text-indigo-600 dark:text-indigo-400 mb-1">
            <span>Step 1 — Vendor Onboarding & Management</span>
          </div>
          <h1 className="text-xl font-extrabold text-slate-900 dark:text-slate-100">Vendor Database & Onboarding</h1>
          <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">
            Create vendors, manage categories, review public registration submissions, and control vendor active status.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleCopyLink}
            className="px-3.5 py-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-500/30 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 text-xs font-bold flex items-center space-x-1.5 transition-all shadow-xs"
          >
            <ExternalLink className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>Copy Public Register Link</span>
          </button>
          <button
            onClick={() => setAddModalOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-extrabold shadow-md shadow-indigo-600/30 flex items-center space-x-1.5 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <Plus className="w-4 h-4" />
            <span>Add Vendor</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 sm:gap-3 border-b border-slate-200 dark:border-slate-800 pb-3 overflow-x-auto">
        <button
          onClick={() => setActiveTab('database')}
          className={`px-4 py-2.5 rounded-xl text-xs font-extrabold flex items-center space-x-2.5 border transition-all ${
            activeTab === 'database'
              ? 'bg-indigo-600 text-white dark:bg-indigo-600/30 dark:text-indigo-300 border-indigo-600 dark:border-indigo-500/50 shadow-md'
              : 'bg-white dark:bg-slate-900/60 text-slate-700 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/80 shadow-xs'
          }`}
        >
          <Building2 className={`w-4 h-4 ${activeTab === 'database' ? 'text-white dark:text-indigo-400' : 'text-slate-500 dark:text-slate-400'}`} />
          <span>Vendor Database ({initialVendors.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('pending')}
          className={`px-4 py-2.5 rounded-xl text-xs font-extrabold flex items-center space-x-2.5 border transition-all ${
            activeTab === 'pending'
              ? 'bg-amber-600 text-white dark:bg-amber-500/20 dark:text-amber-300 border-amber-600 dark:border-amber-500/40 shadow-md'
              : 'bg-white dark:bg-slate-900/60 text-slate-700 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/80 shadow-xs'
          }`}
        >
          <UserCheck className={`w-4 h-4 ${activeTab === 'pending' ? 'text-white dark:text-amber-400' : 'text-amber-600 dark:text-amber-400'}`} />
          <span>Pending Registration Requests</span>
          {pendingCount > 0 && (
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                activeTab === 'pending'
                  ? 'bg-white/20 text-white dark:bg-amber-500/30 dark:text-amber-200'
                  : 'bg-amber-100 dark:bg-amber-500/20 text-amber-900 dark:text-amber-300 border border-amber-300 dark:border-amber-500/30'
              }`}
            >
              {pendingCount}
            </span>
          )}
        </button>
      </div>

      {/* Tab Contents */}
      {activeTab === 'database' ? (
        <VendorTable
          vendors={initialVendors}
          categories={categories}
          onRefresh={() => router.refresh()}
          onOpenAddModal={() => setAddModalOpen(true)}
          onOpenCategoryModal={() => setCategoryModalOpen(true)}
        />
      ) : (
        <PendingRegistrationsTable
          registrations={initialRegistrations}
          categories={categories}
          onRefresh={() => router.refresh()}
        />
      )}

      {/* Modals */}
      <AddVendorModal
        isOpen={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        categories={categories}
        onSuccess={() => router.refresh()}
      />

      <CategoryManagerModal
        isOpen={categoryModalOpen}
        onClose={() => setCategoryModalOpen(false)}
        categories={categories}
        onSuccess={() => router.refresh()}
      />
    </div>
  );
}
