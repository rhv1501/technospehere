'use client';

import Link from 'next/link';
import { ArrowRight, Calendar, Users, FileText, Send, Building2 } from 'lucide-react';
import { toast } from 'sonner';
import { DateFilterBar } from './DateFilterBar';
import { DateRangePreset, getDateBounds, isWithinDateRange, formatDateRangeLabel } from '@/lib/dateFilterUtils';

interface OverviewMetricsProps {
  allVendors: any[];
  allRegistrations: any[];
  allLeads: any[];
  selectedPreset: DateRangePreset;
  customFrom?: string;
  customTo?: string;
  onFilterChange: (preset: DateRangePreset, customFrom?: string, customTo?: string) => void;
  onOpenAddVendor: () => void;
  onOpenCreateLead: () => void;
}

export function OverviewMetrics({
  allVendors,
  allRegistrations,
  allLeads,
  selectedPreset,
  customFrom = '',
  customTo = '',
  onFilterChange,
  onOpenAddVendor,
  onOpenCreateLead,
}: OverviewMetricsProps) {
  const handleCopyLink = () => {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    navigator.clipboard.writeText(`${origin}/vendor-register`);
    toast.success('Public Vendor Registration link copied');
  };

  // Compute date bounds and filter items dynamically
  const { start, end } = getDateBounds(selectedPreset, customFrom, customTo);

  const filteredLeads = allLeads.filter((l) => isWithinDateRange(l.created_at, start, end));
  const filteredVendors = selectedPreset === 'all'
    ? allVendors
    : allVendors.filter((v) => isWithinDateRange(v.created_at, start, end));

  const totalVendorsCount = selectedPreset === 'all' ? allVendors.length : filteredVendors.length;
  const activeVendorsCount = selectedPreset === 'all'
    ? allVendors.filter((v) => v.status === 'active').length
    : filteredVendors.filter((v) => v.status === 'active').length;

  // Pending registrations represents an action queue awaiting review, so it is always calculated across all time
  const pendingRegistrationsCount = allRegistrations.filter((r) => r.status === 'pending').length;
  const totalLeadsCount = filteredLeads.length;
  const sentLeadsCount = filteredLeads.filter((l) => l.status === 'sent' || l.status === 'quoted').length;

  // Pending registrations list is also maintained across all time so actionable items are always visible
  const recentRegistrations = allRegistrations
    .filter((r) => r.status === 'pending')
    .slice(0, 5);

  const recentLeads = filteredLeads.slice(0, 5);
  const activeLabel = formatDateRangeLabel(selectedPreset, customFrom, customTo);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header Banner */}
      <div className="bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-4 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xs">
        <div className="space-y-1">
          <h2 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Procurement & Quotation Control Center
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xl leading-relaxed">
            Manage vendor database, public registration queue, RFQ matching, and quotation dispatches.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row flex-wrap items-center gap-2 w-full md:w-auto">
          <button
            onClick={handleCopyLink}
            className="w-full sm:w-auto px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-medium transition-colors text-center"
          >
            Copy Registration Link
          </button>
          <button
            onClick={onOpenAddVendor}
            className="w-full sm:w-auto px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-medium transition-colors text-center"
          >
            + Add Vendor
          </button>
          <button
            onClick={onOpenCreateLead}
            className="w-full sm:w-auto px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium transition-colors text-center shadow-xs"
          >
            + Create RFQ
          </button>
        </div>
      </div>

      {/* Responsive Date Filter Toolbar */}
      <DateFilterBar
        selectedPreset={selectedPreset}
        customFrom={customFrom}
        customTo={customTo}
        onFilterChange={onFilterChange}
      />

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1 */}
        <div className="bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-slate-800/80 p-5 rounded-2xl shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              {selectedPreset === 'all' ? 'Total Approved Vendors' : 'Vendors Registered'}
            </span>
            <Building2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              {totalVendorsCount}
            </span>
            <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
              {activeVendorsCount} Active
            </span>
          </div>
        </div>

        {/* Card 2 */}
        <div className="bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-slate-800/80 p-5 rounded-2xl shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Pending Registrations
            </span>
            <Users className="w-4 h-4 text-amber-500" />
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              {pendingRegistrationsCount}
            </span>
            {pendingRegistrationsCount > 0 && (
              <span className="text-xs font-medium text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50 px-2 py-0.5 rounded border border-amber-200 dark:border-amber-800/40">
                Action Needed
              </span>
            )}
          </div>
        </div>

        {/* Card 3 */}
        <div className="bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-slate-800/80 p-5 rounded-2xl shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Requirements / RFQs
            </span>
            <FileText className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              {totalLeadsCount}
            </span>
            <span className="text-[11px] text-slate-400 font-medium">
              In period
            </span>
          </div>
        </div>

        {/* Card 4 */}
        <div className="bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-slate-800/80 p-5 rounded-2xl shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Dispatched Quotations
            </span>
            <Send className="w-4 h-4 text-purple-600 dark:text-purple-400" />
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              {sentLeadsCount}
            </span>
            <span className="text-xs font-medium text-indigo-600 dark:text-indigo-400">
              Sent / Quoted
            </span>
          </div>
        </div>
      </div>

      {/* Two Column Widgets */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pending Registrations Widget */}
        <div className="bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-5 space-y-4 shadow-xs">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-slate-900 dark:text-slate-100 text-sm flex items-center gap-1.5">
              <span>Pending Registrations</span>
            </h3>
            <Link
              href="/dashboard/vendors?tab=pending"
              className="text-xs text-indigo-600 dark:text-indigo-400 font-medium hover:underline flex items-center space-x-1"
            >
              <span>View All</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="space-y-2">
            {recentRegistrations.length === 0 ? (
              <div className="text-xs text-slate-500 dark:text-slate-400 py-6 text-center bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200/60 dark:border-slate-800/60">
                No pending vendor registrations.
              </div>
            ) : (
              recentRegistrations.map((reg) => (
                <div
                  key={reg.id}
                  className="p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-xl flex items-center justify-between text-xs"
                >
                  <div>
                    <span className="font-semibold text-slate-900 dark:text-slate-100 block">
                      {reg.company_name}
                    </span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">
                      {reg.contact_person} • {reg.email}
                    </span>
                  </div>
                  <Link
                    href="/dashboard/vendors?tab=pending"
                    className="px-2.5 py-1 rounded-lg bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/50 text-[11px] font-medium hover:bg-amber-100 transition-colors"
                  >
                    Review
                  </Link>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent RFQs Widget */}
        <div className="bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-5 space-y-4 shadow-xs">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-slate-900 dark:text-slate-100 text-sm flex items-center gap-1.5">
              <span>Recent RFQs</span>
              {selectedPreset !== 'all' && (
                <span className="text-[11px] text-indigo-600 dark:text-indigo-400 font-normal">
                  ({activeLabel})
                </span>
              )}
            </h3>
            <Link
              href="/dashboard/leads"
              className="text-xs text-indigo-600 dark:text-indigo-400 font-medium hover:underline flex items-center space-x-1"
            >
              <span>View All</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="space-y-2">
            {recentLeads.length === 0 ? (
              <div className="text-xs text-slate-500 dark:text-slate-400 py-6 text-center bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200/60 dark:border-slate-800/60">
                No RFQs created for {activeLabel}.
              </div>
            ) : (
              recentLeads.map((lead) => (
                <div
                  key={lead.id}
                  className="p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-xl flex items-center justify-between text-xs"
                >
                  <div>
                    <span className="font-mono text-indigo-600 dark:text-indigo-400 font-semibold block text-[11px]">
                      {lead.lead_number}
                    </span>
                    <span className="font-semibold text-slate-900 dark:text-slate-100">
                      {lead.customer_name}
                    </span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 block truncate max-w-[200px]">
                      {lead.product_item}
                    </span>
                  </div>
                  <Link
                    href={`/dashboard/leads/${lead.id}`}
                    className="px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 border border-indigo-200 dark:border-indigo-800/50 text-[11px] font-medium transition-colors"
                  >
                    View
                  </Link>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
