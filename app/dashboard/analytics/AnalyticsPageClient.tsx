'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  BarChart3,
  TrendingUp,
  PieChart,
  Building2,
  FileText,
  Send,
  DollarSign,
  Users,
  CheckCircle2,
  Clock,
  Mail,
  Phone,
  Layers,
  ArrowUpRight,
  ShieldAlert,
  ArrowRight,
  Package,
  Award,
  RefreshCw,
} from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';
import { useRouter } from 'next/navigation';

interface AnalyticsPageClientProps {
  analytics: {
    totalLeads: number;
    totalVendors: number;
    activeVendors: number;
    inactiveVendors: number;
    pendingRegistrations: number;
    totalEstimatedBudget: number;
    avgLeadQuantity: number;
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
      totalBudget: number;
    }>;
    topLeadsByBudget: any[];
    recentActivityLogs: any[];
  };
}

export function AnalyticsPageClient({ analytics }: AnalyticsPageClientProps) {
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = () => {
    setRefreshing(true);
    router.refresh();
    setTimeout(() => setRefreshing(false), 600);
  };

  const {
    totalLeads,
    totalVendors,
    activeVendors,
    inactiveVendors,
    pendingRegistrations,
    totalEstimatedBudget,
    avgLeadQuantity,
    totalEmailsSent,
    totalWhatsAppPrepared,
    leadsByStatus,
    vendorsByCategory,
    leadsByCategory,
    topLeadsByBudget,
    recentActivityLogs,
  } = analytics;

  // Calculate percentages for Lead Status Pipeline
  const draftCount = leadsByStatus.draft || 0;
  const readyCount = leadsByStatus.ready_to_send || 0;
  const sentCount = leadsByStatus.sent || 0;
  const quotedCount = leadsByStatus.quoted || 0;
  const completedCount = leadsByStatus.completed || 0;

  const totalStatusCount = Math.max(totalLeads, 1);
  const draftPct = Math.round((draftCount / totalStatusCount) * 100);
  const readyPct = Math.round((readyCount / totalStatusCount) * 100);
  const sentPct = Math.round((sentCount / totalStatusCount) * 100);
  const quotedPct = Math.round((quotedCount / totalStatusCount) * 100);
  const completedPct = Math.round((completedCount / totalStatusCount) * 100);

  // Active vendor ratio
  const activeVendorRatio = totalVendors > 0 ? Math.round((activeVendors / totalVendors) * 100) : 0;

  // Total quotation dispatches
  const totalDispatches = totalEmailsSent + totalWhatsAppPrepared;

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Header Panel */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-[#111827] border border-slate-200/90 dark:border-slate-800/80 p-6 rounded-2xl shadow-sm dark:shadow-xl">
        <div>
          <div className="flex items-center space-x-2 text-xs font-extrabold text-indigo-600 dark:text-indigo-400 mb-1 uppercase tracking-wider">
            <BarChart3 className="w-4 h-4" />
            <span>Executive Analytics & Intelligence</span>
          </div>
          <h1 className="text-xl lg:text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
            System Performance Dashboard
          </h1>
          <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">
            Real-time analytics across vendor databases, lead quotation pipelines, category demand, and communication metrics.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={handleRefresh}
            className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center space-x-2 transition-all shadow-xs"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-indigo-600' : ''}`} />
            <span>Refresh Analytics</span>
          </button>

          <Link
            href="/dashboard/leads"
            className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-extrabold shadow-md shadow-indigo-600/30 flex items-center space-x-1.5 transition-all"
          >
            <span>Manage Leads</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>

      {/* KPI Cards Row (4 Columns) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Estimated Budget */}
        <div className="bg-white dark:bg-[#111827] border border-slate-200/90 dark:border-slate-800/80 p-5 rounded-2xl shadow-sm dark:shadow-xl space-y-3 relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Total Lead Volume Value
            </span>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-200 dark:border-emerald-500/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 font-extrabold shadow-xs">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div>
            <h3 className="text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
              {formatCurrency(totalEstimatedBudget)}
            </h3>
            <p className="text-[11px] text-slate-600 dark:text-slate-400 font-medium mt-1 flex items-center space-x-1">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 inline" />
              <span>Calculated across {totalLeads} active requirements</span>
            </p>
          </div>
        </div>

        {/* Card 2: Total Leads & Pipeline Status */}
        <div className="bg-white dark:bg-[#111827] border border-slate-200/90 dark:border-slate-800/80 p-5 rounded-2xl shadow-sm dark:shadow-xl space-y-3 relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Lead Requirements
            </span>
            <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/80 border border-indigo-200 dark:border-indigo-500/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-extrabold shadow-xs">
              <FileText className="w-5 h-5" />
            </div>
          </div>
          <div>
            <h3 className="text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
              {totalLeads} <span className="text-xs font-bold text-slate-500">Leads Total</span>
            </h3>
            <p className="text-[11px] text-slate-600 dark:text-slate-400 font-medium mt-1">
              <strong className="text-indigo-600 dark:text-indigo-400">{sentCount + quotedCount}</strong> dispatched to vendors
            </p>
          </div>
        </div>

        {/* Card 3: Vendor Network Database */}
        <div className="bg-white dark:bg-[#111827] border border-slate-200/90 dark:border-slate-800/80 p-5 rounded-2xl shadow-sm dark:shadow-xl space-y-3 relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Vendor Database Network
            </span>
            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/80 border border-blue-200 dark:border-blue-500/30 flex items-center justify-center text-blue-600 dark:text-blue-400 font-extrabold shadow-xs">
              <Building2 className="w-5 h-5" />
            </div>
          </div>
          <div>
            <h3 className="text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
              {activeVendors} <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">Active</span>
            </h3>
            <p className="text-[11px] text-slate-600 dark:text-slate-400 font-medium mt-1">
              {totalVendors} total registered ({activeVendorRatio}% compliance rate)
            </p>
          </div>
        </div>

        {/* Card 4: Dispatch Communications */}
        <div className="bg-white dark:bg-[#111827] border border-slate-200/90 dark:border-slate-800/80 p-5 rounded-2xl shadow-sm dark:shadow-xl space-y-3 relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Quotation Dispatches
            </span>
            <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/80 border border-purple-200 dark:border-purple-500/30 flex items-center justify-center text-purple-600 dark:text-purple-400 font-extrabold shadow-xs">
              <Send className="w-5 h-5" />
            </div>
          </div>
          <div>
            <h3 className="text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
              {totalDispatches} <span className="text-xs font-bold text-slate-500">Actions</span>
            </h3>
            <p className="text-[11px] text-slate-600 dark:text-slate-400 font-medium mt-1">
              {totalEmailsSent} Emails • {totalWhatsAppPrepared} WhatsApp messages
            </p>
          </div>
        </div>
      </div>

      {/* Row 2: Lead Status Funnel & Quotation Dispatch Channel Split */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Lead Requirement Status Pipeline (2 Cols) */}
        <div className="lg:col-span-2 bg-white dark:bg-[#111827] border border-slate-200/90 dark:border-slate-800/80 rounded-2xl p-6 space-y-5 shadow-sm dark:shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
            <div>
              <h3 className="font-extrabold text-slate-900 dark:text-slate-100 text-base flex items-center space-x-2">
                <Layers className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <span>Lead Quotation Workflow Pipeline</span>
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                Distribution of lead requirements across operational stages (Steps 2 to 4).
              </p>
            </div>
            <span className="px-3 py-1 bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 rounded-full text-xs font-extrabold border border-indigo-200 dark:border-indigo-500/30">
              {totalLeads} Total Requirements
            </span>
          </div>

          <div className="space-y-4">
            {/* Draft Stage */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-extrabold">
                <span className="text-slate-700 dark:text-slate-300 flex items-center space-x-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-slate-400" />
                  <span>Draft Requirements</span>
                </span>
                <span className="text-slate-900 dark:text-slate-100">{draftCount} leads ({draftPct}%)</span>
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
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                  <span>Ready to Send (Vendors Assigned)</span>
                </span>
                <span className="text-amber-700 dark:text-amber-400 font-black">{readyCount} leads ({readyPct}%)</span>
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
                  <span className="w-2.5 h-2.5 rounded-full bg-indigo-600" />
                  <span>Sent to Vendors (Awaiting Quotes)</span>
                </span>
                <span className="text-indigo-700 dark:text-indigo-300 font-black">{sentCount} leads ({sentPct}%)</span>
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
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  <span>Quotations Received / Completed</span>
                </span>
                <span className="text-emerald-700 dark:text-emerald-400 font-black">
                  {quotedCount + completedCount} leads ({quotedPct + completedPct}%)
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
        <div className="bg-white dark:bg-[#111827] border border-slate-200/90 dark:border-slate-800/80 rounded-2xl p-6 space-y-5 shadow-sm dark:shadow-xl">
          <div className="border-b border-slate-200 dark:border-slate-800 pb-4">
            <h3 className="font-extrabold text-slate-900 dark:text-slate-100 text-base flex items-center space-x-2">
              <Send className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              <span>Quotation Dispatch Channels</span>
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
                  <Mail className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  <span>Official Email Requests</span>
                </span>
                <span className="font-mono text-sm font-black text-indigo-700 dark:text-indigo-300">
                  {totalEmailsSent}
                </span>
              </div>
              <p className="text-[11px] text-indigo-800 dark:text-indigo-300 font-medium">
                Sent via SMTP with full specification tables and public attachment links.
              </p>
            </div>

            {/* WhatsApp Dispatch Card */}
            <div className="p-4 bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-500/30 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="flex items-center space-x-2 font-extrabold text-xs text-emerald-900 dark:text-emerald-200">
                  <Phone className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>WhatsApp Web Prefills</span>
                </span>
                <span className="font-mono text-sm font-black text-emerald-700 dark:text-emerald-300">
                  {totalWhatsAppPrepared}
                </span>
              </div>
              <p className="text-[11px] text-emerald-800 dark:text-emerald-300 font-medium">
                Direct deep-links generated for manual WhatsApp Web messaging.
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
                <ArrowRight className="w-4 h-4" />
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Row 3: Category Demand & Vendor Category Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category Lead Demand */}
        <div className="bg-white dark:bg-[#111827] border border-slate-200/90 dark:border-slate-800/80 rounded-2xl p-6 space-y-4 shadow-sm dark:shadow-xl">
          <div className="border-b border-slate-200 dark:border-slate-800 pb-3">
            <h3 className="font-extrabold text-slate-900 dark:text-slate-100 text-base flex items-center space-x-2">
              <PieChart className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span>Category Lead Demand & Budget Distribution</span>
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">
              Product volume and estimated transaction value per category.
            </p>
          </div>

          <div className="space-y-3">
            {leadsByCategory.length === 0 ? (
              <div className="py-8 text-center text-slate-500 text-xs font-semibold">
                No lead category data available yet.
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
                      {item.leadCount} lead requirement(s)
                    </span>
                  </div>

                  <div className="text-right">
                    <span className="font-mono text-sm font-black text-indigo-700 dark:text-indigo-300">
                      {formatCurrency(item.totalBudget)}
                    </span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-semibold">Est. Value</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Vendor Database by Category */}
        <div className="bg-white dark:bg-[#111827] border border-slate-200/90 dark:border-slate-800/80 rounded-2xl p-6 space-y-4 shadow-sm dark:shadow-xl">
          <div className="border-b border-slate-200 dark:border-slate-800 pb-3">
            <h3 className="font-extrabold text-slate-900 dark:text-slate-100 text-base flex items-center space-x-2">
              <Building2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>Vendor Capacity by Category</span>
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">
              Registered active vendor coverage across procurement categories.
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

      {/* Row 4: Top Value Leads Leaderboard Table */}
      <div className="bg-white dark:bg-[#111827] border border-slate-200/90 dark:border-slate-800/80 rounded-2xl p-6 space-y-4 shadow-sm dark:shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
          <div>
            <h3 className="font-extrabold text-slate-900 dark:text-slate-100 text-base flex items-center space-x-2">
              <Award className="w-4 h-4 text-amber-500" />
              <span>Highest Value Lead Requirements</span>
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">
              Top lead requirements ranked by total estimated order value.
            </p>
          </div>

          <Link
            href="/dashboard/leads"
            className="text-xs text-indigo-700 dark:text-indigo-400 font-bold hover:underline"
          >
            View All Leads →
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100 dark:bg-[#0d1322] border-b border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-400 font-extrabold uppercase text-[10px]">
              <tr>
                <th className="px-4 py-3">Lead ID & Customer</th>
                <th className="px-4 py-3">Product & Qty</th>
                <th className="px-4 py-3">Unit Estimate</th>
                <th className="px-4 py-3">Calculated Value</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60 text-slate-800 dark:text-slate-300">
              {topLeadsByBudget.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-slate-500 font-medium">
                    No lead requirements created yet.
                  </td>
                </tr>
              ) : (
                topLeadsByBudget.map((lead) => (
                  <tr key={lead.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="px-4 py-3">
                      <span className="font-mono text-indigo-700 dark:text-indigo-400 font-extrabold">{lead.lead_number}</span>
                      <div className="font-bold text-slate-900 dark:text-slate-100">{lead.customer_name}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-extrabold text-slate-900 dark:text-slate-200">{lead.product_item}</div>
                      <div className="text-[11px] text-slate-500 font-medium">{lead.quantity} units</div>
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-300">
                      {lead.unit_price_estimate ? formatCurrency(lead.unit_price_estimate) : 'N/A'}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs font-black text-emerald-700 dark:text-emerald-400">
                      {lead.total_value > 0 ? formatCurrency(lead.total_value) : 'N/A'}
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold capitalize bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-300">
                        {lead.status.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/dashboard/leads/${lead.id}`}
                        className="px-3 py-1 bg-indigo-50 dark:bg-indigo-950 border border-indigo-200 dark:border-indigo-500/30 text-indigo-700 dark:text-indigo-300 font-bold rounded-lg text-xs hover:underline"
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
