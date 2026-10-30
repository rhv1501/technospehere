'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import {
  Search,
  Eye,
  Edit2,
  Power,
  Plus,
  Loader2,
  Trophy,
  ExternalLink,
  FileText,
  CheckCircle2,
  XCircle,
  ChevronDown,
} from 'lucide-react';
import { toggleVendorStatus, getVendorRfqsPaginated } from '@/actions/vendors';
import { formatDate } from '@/lib/utils';
import { isLeadWon, cleanProductTitle } from '@/lib/leadUtils';
import { toast } from 'sonner';
import { EditVendorModal } from './EditVendorModal';

interface VendorTableProps {
  vendors: any[];
  categories: any[];
  onRefresh: () => void;
  onOpenAddModal: () => void;
  onOpenCategoryModal: () => void;
}

export function VendorTable({
  vendors,
  categories,
  onRefresh,
  onOpenAddModal,
  onOpenCategoryModal,
}: VendorTableProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedVendorForView, setSelectedVendorForView] = useState<any | null>(null);
  const [selectedVendorForEdit, setSelectedVendorForEdit] = useState<any | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  // Vendor RFQs history state with Amazon-style continuous infinite scrolling
  const [vendorRfqs, setVendorRfqs] = useState<any[]>([]);
  const [loadingRfqs, setLoadingRfqs] = useState(false);
  const [loadingMoreRfqs, setLoadingMoreRfqs] = useState(false);
  const [rfqFilter, setRfqFilter] = useState<'all' | 'won'>('all');
  const [rfqPage, setRfqPage] = useState(1);
  const [rfqHasMore, setRfqHasMore] = useState(false);
  const [rfqTotalCount, setRfqTotalCount] = useState(0);
  const [rfqWonCount, setRfqWonCount] = useState(0);
  const [rfqAllCount, setRfqAllCount] = useState(0);
  const [modalTab, setModalTab] = useState<'rfqs' | 'details'>('rfqs');

  const rfqSentinelRef = useRef<HTMLDivElement | null>(null);
  const modalScrollContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!selectedVendorForView?.id) {
      setVendorRfqs([]);
      setRfqPage(1);
      setRfqHasMore(false);
      setRfqTotalCount(0);
      setRfqWonCount(0);
      setRfqAllCount(0);
      return;
    }

    let isCurrent = true;
    setLoadingRfqs(true);
    setRfqPage(1);

    getVendorRfqsPaginated({
      vendorId: selectedVendorForView.id,
      page: 1,
      pageSize: 15,
      filter: rfqFilter,
    }).then((res) => {
      if (!isCurrent) return;
      if (res.success && res.rfqs) {
        setVendorRfqs(res.rfqs);
        setRfqTotalCount(res.totalCount);
        setRfqHasMore(res.hasMore);
        setRfqWonCount(res.wonCount ?? 0);
        setRfqAllCount(res.allCount ?? 0);
      } else {
        setVendorRfqs([]);
        setRfqTotalCount(0);
        setRfqHasMore(false);
        setRfqWonCount(0);
        setRfqAllCount(0);
      }
      setLoadingRfqs(false);
    });

    return () => {
      isCurrent = false;
    };
  }, [selectedVendorForView?.id, rfqFilter]);

  const loadMoreVendorRfqs = useCallback(async () => {
    if (!selectedVendorForView?.id || loadingMoreRfqs || loadingRfqs || !rfqHasMore) return;

    setLoadingMoreRfqs(true);
    const nextPage = rfqPage + 1;

    try {
      const res = await getVendorRfqsPaginated({
        vendorId: selectedVendorForView.id,
        page: nextPage,
        pageSize: 15,
        filter: rfqFilter,
      });

      if (res.success && res.rfqs) {
        setVendorRfqs((prev) => {
          const existingIds = new Set(prev.map((r) => r.id));
          const uniqueNew = res.rfqs.filter((r) => !existingIds.has(r.id));
          return [...prev, ...uniqueNew];
        });
        setRfqPage(nextPage);
        setRfqHasMore(res.hasMore);
        setRfqTotalCount(res.totalCount);
        if (res.wonCount !== undefined) setRfqWonCount(res.wonCount);
        if (res.allCount !== undefined) setRfqAllCount(res.allCount);
      } else {
        setRfqHasMore(false);
      }
    } catch (err) {
      console.error('Error loading more vendor RFQs:', err);
    } finally {
      setLoadingMoreRfqs(false);
    }
  }, [selectedVendorForView?.id, loadingMoreRfqs, loadingRfqs, rfqHasMore, rfqPage, rfqFilter]);

  useEffect(() => {
    const sentinel = rfqSentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const first = entries[0];
        if (first.isIntersecting && rfqHasMore && !loadingMoreRfqs && !loadingRfqs) {
          loadMoreVendorRfqs();
        }
      },
      {
        root: modalScrollContainerRef.current || null,
        rootMargin: '200px',
        threshold: 0.05,
      }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [loadMoreVendorRfqs, rfqHasMore, loadingMoreRfqs, loadingRfqs]);

  const filteredVendors = vendors.filter((vendor) => {
    const matchesSearch =
      !searchTerm ||
      vendor.company_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vendor.contact_person?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vendor.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vendor.whatsapp_number?.includes(searchTerm) ||
      vendor.secondary_contact_person?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vendor.secondary_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vendor.secondary_phone?.includes(searchTerm);

    const matchesCategory =
      selectedCategory === 'all' ||
      (vendor.categories && vendor.categories.some((c: any) => c.id === selectedCategory));

    const matchesStatus = selectedStatus === 'all' || vendor.status === selectedStatus;

    return matchesSearch && matchesCategory && matchesStatus;
  });

  const handleToggleStatus = async (vendor: any) => {
    setLoadingId(vendor.id);
    const res = await toggleVendorStatus(vendor.id, vendor.status);
    setLoadingId(null);

    if (res.success) {
      toast.success(
        `Vendor "${vendor.company_name}" status set to ${vendor.status === 'active' ? 'Inactive' : 'Active'}`
      );
      onRefresh();
    } else {
      toast.error(res.error || 'Failed to update vendor status');
    }
  };

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Top Filter & Control Panel */}
      <div className="bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-slate-800/80 p-4 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-xs">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search vendors by name, contact, email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-lg text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 font-medium focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-300 focus:outline-none cursor-pointer"
          >
            <option value="all">All Categories ({categories.length})</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-300 focus:outline-none cursor-pointer"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>

          <button
            onClick={onOpenCategoryModal}
            className="px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-medium transition-colors"
          >
            Categories
          </button>

          <button
            onClick={onOpenAddModal}
            className="px-3.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium flex items-center space-x-1.5 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Add Vendor</span>
          </button>
        </div>
      </div>

      {/* Info Banner for RFQ History */}
      <div className="bg-gradient-to-r from-indigo-50 to-blue-50 dark:from-indigo-950/50 dark:to-blue-950/40 border border-indigo-200 dark:border-indigo-800/80 rounded-xl px-4 py-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs text-indigo-950 dark:text-indigo-200 shadow-xs">
        <div className="flex items-center space-x-2.5">
          <div className="p-1.5 rounded-lg bg-indigo-100 dark:bg-indigo-900/60 text-indigo-600 dark:text-indigo-400 shrink-0">
            <FileText className="w-4 h-4" />
          </div>
          <div>
            <strong className="text-indigo-900 dark:text-indigo-100 font-bold">Vendor-wise RFQ & Won Orders History:</strong>
            <span className="ml-1 text-slate-600 dark:text-slate-300">
              Click any vendor&apos;s company name or the solid <span className="font-bold text-indigo-700 dark:text-indigo-300">View RFQs</span> button to view all assigned RFQs and filter by <span className="font-bold text-amber-600 dark:text-amber-400">Won</span> POs.
            </span>
          </div>
        </div>
      </div>

      {/* Vendor Table */}
      <div className="overflow-x-auto bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-slate-800/80 rounded-xl shadow-xs">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 dark:bg-[#0d1322] border-b border-slate-200/80 dark:border-slate-800/80 text-slate-500 dark:text-slate-400 font-semibold">
            <tr>
              <th className="px-4 py-3 min-w-[200px]">Company</th>
              <th className="px-4 py-3 min-w-[180px]">Primary Contact Info</th>
              <th className="px-4 py-3 min-w-[180px]">Categories</th>
              <th className="px-4 py-3 min-w-[140px]">GST & Location</th>
              <th className="px-4 py-3 min-w-[100px]">Status</th>
              <th className="px-4 py-3 text-right min-w-[140px]">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200/60 dark:divide-slate-800/60 text-slate-700 dark:text-slate-300">
            {filteredVendors.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-500 font-medium">
                  No matching vendors found.
                </td>
              </tr>
            ) : (
              filteredVendors.map((vendor) => {
                const isActive = vendor.status === 'active';
                const hasCategories = vendor.categories && vendor.categories.length > 0;

                return (
                  <tr key={vendor.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => {
                          setModalTab('rfqs');
                          setSelectedVendorForView(vendor);
                        }}
                        className="font-bold text-left text-slate-900 dark:text-slate-100 hover:text-indigo-600 dark:hover:text-indigo-400 hover:underline transition-colors cursor-pointer text-sm block"
                        title="Click to view vendor RFQs & details"
                      >
                        {vendor.company_name}
                      </button>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mt-0.5">
                        <span>{vendor.contact_person}</span>
                        {vendor.secondary_contact_person && (
                          <span className="px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-[9px] font-semibold text-slate-500">
                            +1 contact
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="px-4 py-3">
                      <div className="text-indigo-600 dark:text-indigo-400 text-xs truncate max-w-[180px]">
                        {vendor.email}
                      </div>
                      <div className="text-slate-500 dark:text-slate-400 text-[11px]">
                        {vendor.whatsapp_number}
                      </div>
                    </td>

                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1 max-w-[200px]">
                        {hasCategories ? (
                          vendor.categories.map((c: any) => (
                            <span
                              key={c.id}
                              className="px-2 py-0.5 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800/40 rounded text-[10px] font-medium"
                            >
                              {c.name}
                            </span>
                          ))
                        ) : (
                          <span className="text-slate-400 text-[11px]">Unassigned</span>
                        )}
                      </div>
                    </td>

                    <td className="px-4 py-3">
                      <div className="font-mono text-[11px] text-slate-800 dark:text-slate-300">
                        {vendor.gst_number || 'N/A'}
                      </div>
                      <div className="text-slate-500 text-[11px] truncate max-w-[140px]">
                        {vendor.address || '—'}
                      </div>
                    </td>

                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[11px] font-medium ${
                          isActive
                            ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/40'
                            : 'bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800/40'
                        }`}
                      >
                        {vendor.status}
                      </span>
                    </td>

                    <td className="px-4 py-3 text-right space-x-1.5 whitespace-nowrap">
                      <button
                        onClick={() => {
                          setModalTab('rfqs');
                          setSelectedVendorForView(vendor);
                        }}
                        className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs transition-colors inline-flex items-center space-x-1.5 shadow-xs"
                        title="View assigned RFQs & won purchase orders"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>View RFQs</span>
                      </button>

                      <button
                        onClick={() => setSelectedVendorForEdit(vendor)}
                        className="p-1.5 rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        title="Edit vendor details"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => handleToggleStatus(vendor)}
                        disabled={loadingId === vendor.id}
                        title={isActive ? 'Deactivate' : 'Activate'}
                        className={`p-1 rounded transition-colors ${
                          isActive
                            ? 'text-slate-400 hover:text-rose-600 dark:hover:text-rose-400'
                            : 'text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400'
                        }`}
                      >
                        {loadingId === vendor.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Power className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* View Details Modal with RFQs list and Won filter */}
      {selectedVendorForView && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-fade-in">
          <div className="bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-slate-800/80 rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-200/80 dark:border-slate-800/80 flex items-center justify-between bg-slate-50 dark:bg-[#0d1322] shrink-0">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800/60 text-indigo-600 dark:text-indigo-400">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 dark:text-slate-100 text-base">
                    {selectedVendorForView.company_name}
                  </h3>
                  <div className="flex items-center space-x-2 text-[11px] text-slate-500 dark:text-slate-400">
                    <span>Contact: <strong className="text-slate-700 dark:text-slate-300">{selectedVendorForView.contact_person}</strong></span>
                    <span>•</span>
                    <span className={`font-bold capitalize ${selectedVendorForView.status === 'active' ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {selectedVendorForView.status}
                    </span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setSelectedVendorForView(null)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800 text-sm font-bold transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Modal Tabs Navigation */}
            <div className="px-6 bg-slate-50/80 dark:bg-[#0d1322] border-b border-slate-200/80 dark:border-slate-800/80 flex items-center space-x-2 shrink-0">
              <button
                type="button"
                onClick={() => setModalTab('rfqs')}
                className={`py-3 px-4 border-b-2 font-bold text-xs transition-all flex items-center space-x-2 ${
                  modalTab === 'rfqs'
                    ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 bg-white/70 dark:bg-slate-800/60 rounded-t-lg shadow-2xs'
                    : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <FileText className="w-4 h-4" />
                <span>RFQs & Purchase Orders</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-extrabold">
                  {rfqAllCount}
                </span>
                {rfqWonCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 font-extrabold flex items-center space-x-1">
                    <Trophy className="w-2.5 h-2.5" />
                    <span>{rfqWonCount} Won</span>
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setModalTab('details')}
                className={`py-3 px-4 border-b-2 font-bold text-xs transition-all flex items-center space-x-2 ${
                  modalTab === 'details'
                    ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 bg-white/70 dark:bg-slate-800/60 rounded-t-lg shadow-2xs'
                    : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <span>Company & Contact Details</span>
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <div ref={modalScrollContainerRef} className="p-6 space-y-5 text-xs overflow-y-auto max-h-[calc(90vh-140px)]">
              {modalTab === 'details' ? (
                /* Tab 2: Vendor Details View */
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {/* Primary Contact */}
                    <div className="bg-indigo-50/50 dark:bg-indigo-950/30 p-3.5 rounded-xl border border-indigo-100 dark:border-indigo-900/50 space-y-1.5">
                      <div className="text-[10px] font-bold text-indigo-700 dark:text-indigo-300 uppercase tracking-wider">
                        Primary Contact
                      </div>
                      <div className="text-xs space-y-1">
                        <div className="flex justify-between">
                          <span className="text-slate-400 text-[11px]">Phone / WhatsApp:</span>
                          <span className="font-bold text-slate-900 dark:text-slate-100">{selectedVendorForView.whatsapp_number}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400 text-[11px]">Email:</span>
                          <span className="font-medium text-indigo-600 dark:text-indigo-400">{selectedVendorForView.email}</span>
                        </div>
                      </div>
                    </div>

                    {/* Secondary Contact & GST */}
                    <div className="bg-slate-50 dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800/80 space-y-1.5">
                      <div className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                        Tax & Secondary Details
                      </div>
                      <div className="text-xs space-y-1">
                        <div className="flex justify-between">
                          <span className="text-slate-400 text-[11px]">GST Number:</span>
                          <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{selectedVendorForView.gst_number || 'N/A'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400 text-[11px]">Secondary Contact:</span>
                          <span className="font-medium text-slate-700 dark:text-slate-300">
                            {selectedVendorForView.secondary_contact_person || '—'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Categories & Address */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 dark:bg-slate-900/70 p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800/80">
                    <div>
                      <span className="text-slate-500 block mb-1 font-bold text-[10px] uppercase tracking-wider">Assigned Categories</span>
                      <div className="flex flex-wrap gap-1">
                        {selectedVendorForView.categories && selectedVendorForView.categories.length > 0 ? (
                          selectedVendorForView.categories.map((c: any) => (
                            <span
                              key={c.id}
                              className="px-2 py-0.5 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800/40 rounded text-[10px] font-semibold"
                            >
                              {c.name}
                            </span>
                          ))
                        ) : (
                          <span className="text-slate-400">None</span>
                        )}
                      </div>
                    </div>
                    <div>
                      <span className="text-slate-500 block mb-1 font-bold text-[10px] uppercase tracking-wider">Office Address</span>
                      <p className="text-slate-700 dark:text-slate-300 text-[11px] leading-relaxed">
                        {selectedVendorForView.address || 'No address provided'}
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                /* Tab 1: VENDOR RFQS SECTION WITH WON FILTER */
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/80 dark:bg-slate-900/60 p-3 rounded-xl border border-slate-200/80 dark:border-slate-800/80">
                    <div>
                      <div className="flex items-center space-x-2">
                        <h4 className="font-extrabold text-sm text-slate-900 dark:text-slate-100 flex items-center space-x-2">
                          <FileText className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                          <span>Assigned RFQs & Won Purchase Orders</span>
                        </h4>
                        {rfqTotalCount > 0 && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                            Showing {vendorRfqs.length} of {rfqTotalCount}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        Listing requisitions for <strong>{selectedVendorForView.company_name}</strong>. Filter by Won to see awarded purchase orders.
                      </p>
                    </div>

                    {/* Filter Tabs: All vs Won */}
                    <div className="flex items-center space-x-1.5 bg-white dark:bg-slate-950 p-1 rounded-xl border border-slate-200 dark:border-slate-800 shrink-0 shadow-2xs">
                      <button
                        type="button"
                        onClick={() => setRfqFilter('all')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                          rfqFilter === 'all'
                            ? 'bg-indigo-600 text-white shadow-xs'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                        }`}
                      >
                        All RFQs ({rfqAllCount})
                      </button>
                      <button
                        type="button"
                        onClick={() => setRfqFilter('won')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 ${
                          rfqFilter === 'won'
                            ? 'bg-amber-500 text-white shadow-xs'
                            : 'text-amber-700 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-950/40'
                        }`}
                      >
                        <Trophy className="w-3.5 h-3.5" />
                        <span>
                          Won ({rfqWonCount})
                        </span>
                      </button>
                    </div>
                  </div>

                  {/* RFQs List */}
                  {loadingRfqs ? (
                    <div className="py-14 flex flex-col items-center justify-center space-y-2 text-slate-400">
                      <Loader2 className="w-7 h-7 animate-spin text-indigo-600" />
                      <span className="text-xs font-medium">Fetching assigned RFQs...</span>
                    </div>
                  ) : vendorRfqs.length === 0 ? (
                    <div className="py-10 px-4 text-center rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-dashed border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400">
                      <FileText className="w-8 h-8 mx-auto text-slate-400 mb-2 opacity-50" />
                      <p className="font-bold text-xs text-slate-700 dark:text-slate-300">
                        {rfqFilter === 'won'
                          ? `No won purchase orders recorded yet for ${selectedVendorForView.company_name}.`
                          : `No RFQs currently assigned to ${selectedVendorForView.company_name}.`}
                      </p>
                      <p className="text-[11px] text-slate-400 mt-1">
                        {rfqFilter === 'won'
                          ? 'When an RFQ is closed and awarded to this vendor, it will appear here.'
                          : 'Assign this vendor to an RFQ in the RFQs tab to track it here.'}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="overflow-hidden rounded-xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-[#111827]">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-slate-50 dark:bg-[#0d1322] border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-semibold text-[11px]">
                            <tr>
                              <th className="px-3.5 py-2.5">RFQ Reference</th>
                              <th className="px-3.5 py-2.5">Customer & Item</th>
                              <th className="px-3.5 py-2.5">Status / PO Award</th>
                              <th className="px-3.5 py-2.5">Date</th>
                              <th className="px-3.5 py-2.5 text-right">Action</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                            {vendorRfqs.map((rfq) => {
                              const isWonByThisVendor =
                                isLeadWon(rfq) || rfq.winning_vendor_id === selectedVendorForView.id;

                              return (
                                <tr
                                  key={rfq.id}
                                  className={`transition-colors ${
                                    isWonByThisVendor
                                      ? 'bg-amber-50/50 dark:bg-amber-950/20 hover:bg-amber-50/80 dark:hover:bg-amber-950/40'
                                      : 'hover:bg-slate-50/60 dark:hover:bg-slate-800/40'
                                  }`}
                                >
                                  <td className="px-3.5 py-3">
                                    <div className="font-mono font-bold text-indigo-600 dark:text-indigo-400 text-xs">
                                      {rfq.lead_name || rfq.lead_number}
                                    </div>
                                    <div className="text-[10px] text-slate-400 font-mono">
                                      ID: {rfq.lead_number}
                                    </div>
                                  </td>

                                  <td className="px-3.5 py-3">
                                    <div className="font-semibold text-slate-900 dark:text-slate-100">
                                      {rfq.customer_name}
                                    </div>
                                    <div className="text-[11px] text-slate-500 dark:text-slate-400">
                                      {cleanProductTitle(rfq.product_item)}{' '}
                                      <span className="font-bold text-slate-700 dark:text-slate-300">
                                        (Qty: {rfq.quantity})
                                      </span>
                                    </div>
                                  </td>

                                  <td className="px-3.5 py-3">
                                    {isWonByThisVendor ? (
                                      <div className="space-y-0.5">
                                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-100 dark:bg-amber-900/80 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-700 inline-flex items-center space-x-1">
                                          <Trophy className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                                          <span>Won / Awarded PO</span>
                                        </span>
                                        {rfq.winning_amount && (
                                          <div className="text-xs font-black text-emerald-700 dark:text-emerald-400">
                                            ₹{Number(rfq.winning_amount).toLocaleString('en-IN')}
                                          </div>
                                        )}
                                      </div>
                                    ) : (
                                      <span className="px-2 py-0.5 rounded text-[10px] font-bold capitalize bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                                        {rfq.status ? rfq.status.replace(/_/g, ' ') : 'Draft'}
                                      </span>
                                    )}
                                  </td>

                                  <td className="px-3.5 py-3 text-slate-500 dark:text-slate-400 text-[11px] whitespace-nowrap">
                                    {formatDate(rfq.created_at)}
                                  </td>

                                  <td className="px-3.5 py-3 text-right">
                                    <Link
                                      href={`/dashboard/leads/${rfq.id}`}
                                      className="px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/80 hover:bg-indigo-100 dark:hover:bg-indigo-900 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/60 font-bold text-[11px] inline-flex items-center space-x-1 transition-all"
                                    >
                                      <span>View RFQ</span>
                                      <ExternalLink className="w-3 h-3" />
                                    </Link>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>

                      {/* Infinite Scroll Sentinel */}
                      <div ref={rfqSentinelRef} className="h-2 w-full" />

                      {/* Infinite Scroll Loading State */}
                      {loadingMoreRfqs && (
                        <div className="flex items-center justify-center py-3 space-x-2 text-indigo-600 dark:text-indigo-400 text-xs font-bold bg-indigo-50/60 dark:bg-indigo-950/40 rounded-xl border border-indigo-200/80 dark:border-indigo-800/60 shadow-2xs animate-pulse">
                          <Loader2 className="w-4 h-4 animate-spin text-indigo-600 dark:text-indigo-400" />
                          <span>Loading more vendor RFQs...</span>
                        </div>
                      )}

                      {/* All Loaded State */}
                      {!rfqHasMore && vendorRfqs.length > 0 && (
                        <div className="flex items-center justify-center py-2.5 text-slate-400 dark:text-slate-500 text-xs font-medium space-x-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                          <span>
                            All {rfqTotalCount} {rfqFilter === 'won' ? 'won purchase orders' : 'assigned RFQs'} loaded
                          </span>
                        </div>
                      )}

                      {/* Fallback Manual Trigger */}
                      {rfqHasMore && !loadingMoreRfqs && (
                        <div className="flex justify-center pt-1">
                          <button
                            type="button"
                            onClick={loadMoreVendorRfqs}
                            className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 py-1.5 px-3.5 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-950/50 transition-colors inline-flex items-center space-x-1"
                          >
                            <span>
                              Scroll down or click to load more ({rfqTotalCount - vendorRfqs.length} remaining)
                            </span>
                            <ChevronDown className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Edit Vendor Modal */}
      {selectedVendorForEdit && (
        <EditVendorModal
          isOpen={!!selectedVendorForEdit}
          onClose={() => setSelectedVendorForEdit(null)}
          vendor={selectedVendorForEdit}
          categories={categories}
          onSuccess={onRefresh}
        />
      )}
    </div>
  );
}
