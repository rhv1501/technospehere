'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import {
  BarChart3,
  TrendingUp,
  PieChart,
  Building2,
  FileText,
  Send,
  Mail,
  Phone,
  Layers,
  ShieldAlert,
  ArrowRight,
  Package,
  Award,
  RefreshCw,
  Trophy,
} from 'lucide-react';
import { cleanProductTitle, parseLineItemsFromLead } from '@/lib/leadUtils';
import { DateFilterBar } from '@/components/dashboard/DateFilterBar';
import {
  DateRangePreset,
  getDateBounds,
  isWithinDateRange,
  formatDateRangeLabel,
} from '@/lib/dateFilterUtils';

interface AnalyticsPageClientProps {
  analytics: {
    leads?: any[];
    vendors?: any[];
    categories?: any[];
    registrations?: any[];
    logs?: any[];
    totalLeads: number;
    totalVendors: number;
    activeVendors: number;
    inactiveVendors: number;
    pendingRegistrations: number;
    totalUnits: number;
    totalLineItemsCount: number;
    avgUnitsPerRfq: number;
    totalEmailsSent: number;
    totalWhatsAppPrepared: number;
    leadsByStatus: Record<string, number>;
    vendorsByCategory: Array<{
      categoryId: string;
      categoryName: string;
      totalCount: number;
      activeCount: number;
    }>;
    leadsByCategory: Array<{
      categoryId: string;
      categoryName: string;
      leadCount: number;
      totalUnits: number;
    }>;
    topLeadsByQuantity: Array<{
      id: string;
      lead_number: string;
      customer_name: string;
      product_item: string;
      quantity: number;
      lineItemsCount: number;
      status: string;
      vendorsCount: number;
      created_at: string;
    }>;
    recentActivityLogs: any[];
  };
}

export function AnalyticsPageClient({ analytics }: AnalyticsPageClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const [refreshing, setRefreshing] = useState(false);

  // Initialize date filter state from URL query params
  const initialRange = (searchParams.get('range') as DateRangePreset) || 'all';
  const initialFrom = searchParams.get('from') || '';
  const initialTo = searchParams.get('to') || '';

  const [selectedPreset, setSelectedPreset] = useState<DateRangePreset>(initialRange);
  const [customFrom, setCustomFrom] = useState<string>(initialFrom);
  const [customTo, setCustomTo] = useState<string>(initialTo);

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

  const handleRefresh = () => {
    setRefreshing(true);
    router.refresh();
    setTimeout(() => setRefreshing(false), 600);
  };

  // Base raw collections from server
  const rawLeads = analytics.leads || [];
  const rawVendors = analytics.vendors || [];
  const categories = analytics.categories || [];
  const rawRegistrations = analytics.registrations || [];

  // Compute active date bounds
  const { start, end } = getDateBounds(selectedPreset, customFrom, customTo);

  // Filter collections by date bounds
  const filteredLeads = rawLeads.filter((l) => {
    if (selectedPreset === 'all') return true;
    const isCreatedInRange = isWithinDateRange(l.created_at, start, end);
    const isClosedInRange = l.closed_at ? isWithinDateRange(l.closed_at, start, end) : false;
    return isCreatedInRange || isClosedInRange;
  });
  const filteredVendors = selectedPreset === 'all'
    ? rawVendors
    : rawVendors.filter((v) => isWithinDateRange(v.created_at, start, end));
  const filteredRegistrations = rawRegistrations.filter((r) => isWithinDateRange(r.created_at, start, end));

  // Dynamic KPI Calculations
  const totalLeads = filteredLeads.length;
  const totalVendors = selectedPreset === 'all' ? rawVendors.length : filteredVendors.length;
  const activeVendors = selectedPreset === 'all'
    ? rawVendors.filter((v) => v.status === 'active').length
    : filteredVendors.filter((v) => v.status === 'active').length;
  const pendingRegistrations = rawRegistrations.filter((r) => r.status === 'pending').length;

  let totalUnits = 0;
  let totalLineItemsCount = 0;
  filteredLeads.forEach((l) => {
    const items = parseLineItemsFromLead(l);
    totalLineItemsCount += items.length || 1;
    const rfqUnits = items.reduce((acc, item) => acc + (Number(item.quantity) || 1), 0);
    totalUnits += rfqUnits || l.quantity || 0;
  });

  const avgUnitsPerRfq = totalLeads > 0 ? Math.round(totalUnits / totalLeads) : 0;

  // Dispatch Channel Metrics
  let totalEmailsSent = 0;
  let totalWhatsAppPrepared = 0;
  filteredLeads.forEach((l) => {
    (l.lead_vendors || []).forEach((lv: any) => {
      if (lv.email_sent) totalEmailsSent++;
      if (lv.whatsapp_prepared) totalWhatsAppPrepared++;
    });
  });

  // RFQ Pipeline Status Breakdown
  const leadsByStatus: Record<string, number> = {
    draft: 0,
    ready_to_send: 0,
    sent: 0,
    quoted: 0,
    completed: 0,
    cancelled: 0,
  };
  filteredLeads.forEach((l) => {
    const st = l.status || 'draft';
    leadsByStatus[st] = (leadsByStatus[st] || 0) + 1;
  });

  const draftCount = leadsByStatus.draft || 0;
  const readyCount = leadsByStatus.ready_to_send || 0;
  const sentCount = leadsByStatus.sent || 0;
  const quotedCount = leadsByStatus.quoted || 0;
  const completedCount = leadsByStatus.completed || 0;
  const closedAndAwardedCount = rawLeads.filter((l) => {
    const isClosed = l.status === 'completed' || !!l.winning_vendor_id;
    if (!isClosed) return false;
    if (selectedPreset === 'all') return true;
    const targetDate = l.closed_at || l.created_at;
    return isWithinDateRange(targetDate, start, end);
  }).length;
  const closedPct = totalLeads > 0 ? Math.round((closedAndAwardedCount / totalLeads) * 100) : 0;

  const totalStatusCount = Math.max(totalLeads, 1);
  const draftPct = Math.round((draftCount / totalStatusCount) * 100);
  const readyPct = Math.round((readyCount / totalStatusCount) * 100);
  const sentPct = Math.round((sentCount / totalStatusCount) * 100);
  const quotedPct = Math.round((quotedCount / totalStatusCount) * 100);
  const completedPct = Math.round((completedCount / totalStatusCount) * 100);

  const activeVendorRatio = totalVendors > 0 ? Math.round((activeVendors / totalVendors) * 100) : 0;
  const totalDispatches = totalEmailsSent + totalWhatsAppPrepared;

  // Category demand & unit volume for filtered leads
  const leadsByCategory = categories
    .map((cat) => {
      const catLeads = filteredLeads.filter((l) => l.category_id === cat.id);
      let catUnits = 0;
      catLeads.forEach((l) => {
        const items = parseLineItemsFromLead(l);
        const rfqUnits = items.reduce((acc, item) => acc + (Number(item.quantity) || 1), 0);
        catUnits += rfqUnits || l.quantity || 0;
      });

      return {
        categoryId: cat.id,
        categoryName: cat.name,
        leadCount: catLeads.length,
        totalUnits: catUnits,
      };
    })
    .filter((c) => c.leadCount > 0);

  const unassignedLeads = filteredLeads.filter((l) => !l.category_id);
  if (unassignedLeads.length > 0) {
    let unassignedUnits = 0;
    unassignedLeads.forEach((l) => {
      const items = parseLineItemsFromLead(l);
      const rfqUnits = items.reduce((acc, item) => acc + (Number(item.quantity) || 1), 0);
      unassignedUnits += rfqUnits || l.quantity || 0;
    });
    leadsByCategory.push({
      categoryId: 'unassigned',
      categoryName: 'Unassigned Category',
      leadCount: unassignedLeads.length,
      totalUnits: unassignedUnits,
    });
  }

  // Vendors by category
  const vendorsByCategory = categories.map((cat) => {
    const matchingVendors = (selectedPreset === 'all' ? rawVendors : filteredVendors).filter((v) =>
      v.vendor_categories?.some((vc: any) => vc.category_id === cat.id)
    );
    const activeCount = matchingVendors.filter((v) => v.status === 'active').length;

    return {
      categoryId: cat.id,
      categoryName: cat.name,
      totalCount: matchingVendors.length,
      activeCount,
    };
  });

  // Top Volume RFQs for filtered leads
  const topLeadsByQuantity = [...filteredLeads]
    .map((l) => {
      const items = parseLineItemsFromLead(l);
      const quantity = items.reduce((acc, item) => acc + (Number(item.quantity) || 1), 0) || l.quantity || 1;
      return {
        id: l.id,
        lead_number: l.lead_number,
        customer_name: l.customer_name,
        product_item: l.product_item,
        quantity,
        lineItemsCount: items.length || 1,
        status: l.status || 'draft',
        vendorsCount: (l.lead_vendors || []).length,
        created_at: l.created_at,
      };
    })
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 6);

  const activeLabel = formatDateRangeLabel(selectedPreset, customFrom, customTo);

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Header Panel */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-[#111827] border border-slate-200/90 dark:border-slate-800/80 p-4 sm:p-6 rounded-2xl shadow-sm dark:shadow-xl">
        <div>
          <div className="flex items-center space-x-2 text-xs font-extrabold text-indigo-600 dark:text-indigo-400 mb-1 uppercase tracking-wider">
            <BarChart3 className="w-4 h-4" />
            <span>Executive Analytics & Intelligence</span>
          </div>
          <h1 className="text-lg sm:text-xl lg:text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
            Procurement Analytics Dashboard
          </h1>
          <p className="text-xs text-slate-600 dark:text-slate-400 font-medium leading-relaxed">
            Real-time tracking of procurement unit volumes, RFQ status pipelines, vendor database coverage, and dispatch channels.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
          <button
            onClick={handleRefresh}
            className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center justify-center space-x-2 transition-all shadow-xs"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-indigo-600' : ''}`} />
            <span>Refresh Analytics</span>
          </button>

          <Link
            href="/dashboard/leads"
            className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-extrabold shadow-md shadow-indigo-600/30 flex items-center justify-center space-x-1.5 transition-all"
          >
            <span>Manage RFQs</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>

      {/* Date Filter Toolbar Component */}
      <DateFilterBar
        selectedPreset={selectedPreset}
        customFrom={customFrom}
        customTo={customTo}
        onFilterChange={handleFilterChange}
      />

      {/* KPI Cards Row (4 Columns on Desktop, 2 on Tablet, 1 on Mobile) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Totally Closed RFQs */}
        <div className="bg-white dark:bg-[#111827] border border-slate-200/90 dark:border-slate-800/80 p-5 rounded-2xl shadow-sm dark:shadow-xl space-y-3 relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-[11px] sm:text-xs font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Totally Closed RFQs
            </span>
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-amber-50 dark:bg-amber-950/80 border border-amber-200 dark:border-amber-500/30 flex items-center justify-center text-amber-600 dark:text-amber-400 font-extrabold shadow-xs shrink-0">
              <Trophy className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
          </div>
          <div>
            <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
              {closedAndAwardedCount}{' '}
              <span className="text-xs font-bold text-slate-500">RFQs Closed</span>
            </h3>
            <p className="text-[11px] text-slate-600 dark:text-slate-400 font-medium mt-1 flex items-center space-x-1">
              <TrendingUp className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0 inline" />
              <span>Across {totalLeads} RFQs ({closedPct}% completion rate)</span>
            </p>
          </div>
        </div>

        {/* Card 2: Total RFQs & Pipeline Status */}
        <div className="bg-white dark:bg-[#111827] border border-slate-200/90 dark:border-slate-800/80 p-5 rounded-2xl shadow-sm dark:shadow-xl space-y-3 relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-[11px] sm:text-xs font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              RFQ Requirements
            </span>
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/80 border border-indigo-200 dark:border-indigo-500/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-extrabold shadow-xs shrink-0">
              <FileText className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
          </div>
          <div>
            <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
              {totalLeads} <span className="text-xs font-bold text-slate-500">RFQs Total</span>
            </h3>
            <p className="text-[11px] text-slate-600 dark:text-slate-400 font-medium mt-1">
              <strong className="text-indigo-600 dark:text-indigo-400">{sentCount + quotedCount}</strong> dispatched to vendors
            </p>
          </div>
        </div>

        {/* Card 3: Vendor Network Database */}
        <div className="bg-white dark:bg-[#111827] border border-slate-200/90 dark:border-slate-800/80 p-5 rounded-2xl shadow-sm dark:shadow-xl space-y-3 relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-[11px] sm:text-xs font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Vendor Network Database
            </span>
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-blue-50 dark:bg-blue-950/80 border border-blue-200 dark:border-blue-500/30 flex items-center justify-center text-blue-600 dark:text-blue-400 font-extrabold shadow-xs shrink-0">
              <Building2 className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
          </div>
          <div>
            <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
              {activeVendors} <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">Active</span>
            </h3>
            <p className="text-[11px] text-slate-600 dark:text-slate-400 font-medium mt-1">
              {totalVendors} registered ({activeVendorRatio}% active rate)
            </p>
          </div>
        </div>

        {/* Card 4: Dispatch Communications */}
        <div className="bg-white dark:bg-[#111827] border border-slate-200/90 dark:border-slate-800/80 p-5 rounded-2xl shadow-sm dark:shadow-xl space-y-3 relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-[11px] sm:text-xs font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Quotation Dispatches
            </span>
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-purple-50 dark:bg-purple-950/80 border border-purple-200 dark:border-purple-500/30 flex items-center justify-center text-purple-600 dark:text-purple-400 font-extrabold shadow-xs shrink-0">
              <Send className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
          </div>
          <div>
            <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
              {totalDispatches} <span className="text-xs font-bold text-slate-500">Actions</span>
            </h3>
            <p className="text-[11px] text-slate-600 dark:text-slate-400 font-medium mt-1">
              {totalEmailsSent} Emails • {totalWhatsAppPrepared} WhatsApp
            </p>
          </div>
        </div>
      </div>

      {/* Row 2: RFQ Status Funnel & Quotation Dispatch Channel Split */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* RFQ Requirement Status Pipeline (2 Cols) */}
        <div className="lg:col-span-2 bg-white dark:bg-[#111827] border border-slate-200/90 dark:border-slate-800/80 rounded-2xl p-5 sm:p-6 space-y-5 shadow-sm dark:shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800 pb-4">
            <div>
              <h3 className="font-extrabold text-slate-900 dark:text-slate-100 text-sm sm:text-base flex items-center space-x-2">
                <Layers className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <span>RFQ Workflow Pipeline</span>
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                Distribution of RFQ requirements across operational stages ({activeLabel}).
              </p>
            </div>
            <span className="self-start sm:self-auto px-3 py-1 bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 rounded-full text-xs font-extrabold border border-indigo-200 dark:border-indigo-500/30">
              {totalLeads} Requirements
            </span>
          </div>

          <div className="space-y-4">
            {/* Draft Stage */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-extrabold">
                <span className="text-slate-700 dark:text-slate-300 flex items-center space-x-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-slate-400 shrink-0" />
                  <span>Draft Requirements</span>
                </span>
                <span className="text-slate-900 dark:text-slate-100">{draftCount} RFQs ({draftPct}%)</span>
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-800 h-3 rounded-full overflow-hidden">
                <div
                  className="bg-slate-400 h-full rounded-full transition-all duration-500"
                  style={{ width: `${draftPct}%` }}
                />
              </div>
            </div>

            {/* Ready to Send Stage */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-extrabold">
                <span className="text-slate-700 dark:text-slate-300 flex items-center space-x-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0" />
                  <span>Ready to Send (Vendors Assigned)</span>
                </span>
                <span className="text-amber-700 dark:text-amber-400 font-black">{readyCount} RFQs ({readyPct}%)</span>
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-800 h-3 rounded-full overflow-hidden">
                <div
                  className="bg-amber-500 h-full rounded-full transition-all duration-500"
                  style={{ width: `${readyPct}%` }}
                />
              </div>
            </div>

            {/* Sent Stage */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-extrabold">
                <span className="text-slate-700 dark:text-slate-300 flex items-center space-x-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 shrink-0" />
                  <span>Sent to Vendors (Awaiting Quotes)</span>
                </span>
                <span className="text-indigo-700 dark:text-indigo-300 font-black">{sentCount} RFQs ({sentPct}%)</span>
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-800 h-3 rounded-full overflow-hidden">
                <div
                  className="bg-indigo-600 h-full rounded-full transition-all duration-500"
                  style={{ width: `${sentPct}%` }}
                />
              </div>
            </div>

            {/* Quoted Stage */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-extrabold">
                <span className="text-slate-700 dark:text-slate-300 flex items-center space-x-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
                  <span>Quotations Received / Completed</span>
                </span>
                <span className="text-emerald-700 dark:text-emerald-400 font-black">
                  {quotedCount + completedCount} RFQs ({quotedPct + completedPct}%)
                </span>
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-800 h-3 rounded-full overflow-hidden">
                <div
                  className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                  style={{ width: `${quotedPct + completedPct}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Communication Dispatch Breakdown (1 Col) */}
        <div className="bg-white dark:bg-[#111827] border border-slate-200/90 dark:border-slate-800/80 rounded-2xl p-5 sm:p-6 space-y-5 shadow-sm dark:shadow-xl">
          <div className="border-b border-slate-200 dark:border-slate-800 pb-4">
            <h3 className="font-extrabold text-slate-900 dark:text-slate-100 text-sm sm:text-base flex items-center space-x-2">
              <Send className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              <span>Dispatch Channels</span>
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">
              Comparison between Automated Emails & WhatsApp Web dispatches.
            </p>
          </div>

          <div className="space-y-4">
            {/* Email Dispatch Card */}
            <div className="p-4 bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-500/30 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="flex items-center space-x-2 font-extrabold text-xs text-indigo-900 dark:text-indigo-200">
                  <Mail className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                  <span>Official Email Requests</span>
                </span>
                <span className="font-mono text-sm font-black text-indigo-700 dark:text-indigo-300">
                  {totalEmailsSent}
                </span>
              </div>
              <p className="text-[11px] text-indigo-800 dark:text-indigo-300 font-medium">
                Sent via SMTP with full specification tables and attached PDF files.
              </p>
            </div>

            {/* WhatsApp Dispatch Card */}
            <div className="p-4 bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-500/30 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="flex items-center space-x-2 font-extrabold text-xs text-emerald-900 dark:text-emerald-200">
                  <Phone className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>WhatsApp Web Prefills</span>
                </span>
                <span className="font-mono text-sm font-black text-emerald-700 dark:text-emerald-300">
                  {totalWhatsAppPrepared}
                </span>
              </div>
              <p className="text-[11px] text-emerald-800 dark:text-emerald-300 font-medium">
                Clean deep-link messages generated with public PDF document links.
              </p>
            </div>

            {/* Pending Vendor Registrations Warning Banner */}
            {pendingRegistrations > 0 && (
              <Link
                href="/dashboard/vendors?tab=pending"
                className="p-3.5 bg-amber-50 dark:bg-amber-950/50 border border-amber-300 dark:border-amber-500/40 rounded-xl flex items-center justify-between text-amber-900 dark:text-amber-300 hover:bg-amber-100 transition-colors"
              >
                <div className="flex items-center space-x-2 text-xs font-extrabold">
                  <ShieldAlert className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                  <span>{pendingRegistrations} Vendor Application(s) Awaiting Review</span>
                </div>
                <ArrowRight className="w-4 h-4 shrink-0" />
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Row 3: Category Demand & Vendor Category Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category RFQ Demand & Unit Volume */}
        <div className="bg-white dark:bg-[#111827] border border-slate-200/90 dark:border-slate-800/80 rounded-2xl p-5 sm:p-6 space-y-4 shadow-sm dark:shadow-xl">
          <div className="border-b border-slate-200 dark:border-slate-800 pb-3">
            <h3 className="font-extrabold text-slate-900 dark:text-slate-100 text-sm sm:text-base flex items-center space-x-2">
              <PieChart className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span>Category RFQ Demand & Unit Volume</span>
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">
              Product requirements and total unit volume per procurement category ({activeLabel}).
            </p>
          </div>

          <div className="space-y-3">
            {leadsByCategory.length === 0 ? (
              <div className="py-8 text-center text-slate-500 text-xs font-semibold">
                No RFQ category data available for {activeLabel}.
              </div>
            ) : (
              leadsByCategory.map((item) => (
                <div
                  key={item.categoryId}
                  className="p-3.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl flex items-center justify-between text-xs"
                >
                  <div className="space-y-0.5">
                    <span className="font-extrabold text-slate-900 dark:text-slate-100">{item.categoryName}</span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 block font-medium">
                      {item.leadCount} RFQ requirement(s)
                    </span>
                  </div>

                  <div className="text-right">
                    <span className="font-mono text-sm font-black text-indigo-700 dark:text-indigo-300">
                      {item.totalUnits} Units
                    </span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-semibold">Total Volume</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Vendor Database by Category */}
        <div className="bg-white dark:bg-[#111827] border border-slate-200/90 dark:border-slate-800/80 rounded-2xl p-5 sm:p-6 space-y-4 shadow-sm dark:shadow-xl">
          <div className="border-b border-slate-200 dark:border-slate-800 pb-3">
            <h3 className="font-extrabold text-slate-900 dark:text-slate-100 text-sm sm:text-base flex items-center space-x-2">
              <Building2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>Vendor Capacity by Category</span>
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">
              Registered active vendor coverage across procurement categories ({activeLabel}).
            </p>
          </div>

          <div className="space-y-3">
            {vendorsByCategory.length === 0 ? (
              <div className="py-8 text-center text-slate-500 text-xs font-semibold">
                No categories registered yet.
              </div>
            ) : (
              vendorsByCategory.map((cat) => (
                <div
                  key={cat.categoryId}
                  className="p-3.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl flex items-center justify-between text-xs"
                >
                  <div>
                    <span className="font-extrabold text-slate-900 dark:text-slate-100">{cat.categoryName}</span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 block font-medium">
                      {cat.totalCount} total vendor partners
                    </span>
                  </div>

                  <div>
                    <span className="px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-200 dark:border-emerald-500/30 text-emerald-800 dark:text-emerald-300 font-black text-[11px]">
                      {cat.activeCount} Active
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Row 4: Top Volume RFQs Leaderboard Table (Responsive Table Wrapper) */}
      <div className="bg-white dark:bg-[#111827] border border-slate-200/90 dark:border-slate-800/80 rounded-2xl p-5 sm:p-6 space-y-4 shadow-sm dark:shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
          <div>
            <h3 className="font-extrabold text-slate-900 dark:text-slate-100 text-sm sm:text-base flex items-center space-x-2">
              <Award className="w-4 h-4 text-amber-500" />
              <span>Largest Procurement RFQ Requirements</span>
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">
              Top active RFQ requirements ranked by total unit quantity ({activeLabel}).
            </p>
          </div>

          <Link
            href="/dashboard/leads"
            className="text-xs text-indigo-700 dark:text-indigo-400 font-bold hover:underline self-start sm:self-auto"
          >
            View All RFQs →
          </Link>
        </div>

        <div className="overflow-x-auto -mx-5 sm:mx-0 px-5 sm:px-0">
          <table className="w-full text-left text-xs min-w-[640px]">
            <thead className="bg-slate-100 dark:bg-[#0d1322] border-b border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-400 font-extrabold uppercase text-[10px]">
              <tr>
                <th className="px-4 py-3">RFQ Ref & Customer</th>
                <th className="px-4 py-3">Product Breakdown</th>
                <th className="px-4 py-3">Total Volume</th>
                <th className="px-4 py-3">Assigned Vendors</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60 text-slate-800 dark:text-slate-300">
              {topLeadsByQuantity.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-slate-500 font-medium">
                    No RFQ requirements created for {activeLabel}.
                  </td>
                </tr>
              ) : (
                topLeadsByQuantity.map((lead) => (
                  <tr key={lead.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="px-4 py-3">
                      <span className="font-mono text-indigo-700 dark:text-indigo-400 font-extrabold block text-xs">
                        {lead.lead_number}
                      </span>
                      <div className="font-bold text-slate-900 dark:text-slate-100">{lead.customer_name}</div>
                    </td>
                    <td className="px-4 py-3 max-w-xs">
                      <div className="font-extrabold text-slate-900 dark:text-slate-200 truncate">
                        {cleanProductTitle(lead.product_item)}
                      </div>
                      <div className="text-[11px] text-slate-500 font-medium">
                        {lead.lineItemsCount} line item{lead.lineItemsCount > 1 ? 's' : ''}
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono font-bold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                      {lead.quantity} Unit{lead.quantity > 1 ? 's' : ''}
                    </td>
                    <td className="px-4 py-3">
                      {lead.vendorsCount > 0 ? (
                        <span className="px-2 py-0.5 rounded text-[11px] font-extrabold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/50">
                          {lead.vendorsCount} vendor{lead.vendorsCount > 1 ? 's' : ''}
                        </span>
                      ) : (
                        <span className="text-slate-400 text-[11px]">Unassigned</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold capitalize bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-300 whitespace-nowrap">
                        {lead.status.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/dashboard/leads/${lead.id}`}
                        className="px-3 py-1 bg-indigo-50 dark:bg-indigo-950 border border-indigo-200 dark:border-indigo-500/30 text-indigo-700 dark:text-indigo-300 font-bold rounded-lg text-xs hover:underline inline-block"
                      >
                        Manage
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
