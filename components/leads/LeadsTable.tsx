'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Search,
  Plus,
  Trash2,
  Eye,
  Loader2,
  AlertTriangle,
  Trophy,
} from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { cleanProductTitle } from '@/lib/leadUtils';
import { deleteLead } from '@/actions/leads';
import { toast } from 'sonner';

interface LeadsTableProps {
  leads: any[];
  categories: any[];
  onOpenCreateModal: () => void;
}

export function LeadsTable({ leads, categories, onOpenCreateModal }: LeadsTableProps) {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');

  const [selectedLeadForDelete, setSelectedLeadForDelete] = useState<any | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const filteredLeads = leads.filter((lead) => {
    const winnerName = lead.winning_vendor?.company_name || '';
    const matchesSearch =
      !searchTerm ||
      lead.lead_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.lead_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.product_item?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      winnerName.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCategory =
      selectedCategory === 'all' || lead.category_id === selectedCategory;

    const matchesStatus = selectedStatus === 'all' || lead.status === selectedStatus;

    return matchesSearch && matchesCategory && matchesStatus;
  });

  const handleDeleteConfirm = async () => {
    if (!selectedLeadForDelete) return;

    setDeleteLoading(true);
    const res = await deleteLead(selectedLeadForDelete.id);
    setDeleteLoading(false);

    if (res.success) {
      toast.success(`RFQ "${selectedLeadForDelete.lead_number}" deleted`);
      setSelectedLeadForDelete(null);
      router.refresh();
    } else {
      toast.error(res.error || 'Failed to delete RFQ');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'draft':
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
            Draft
          </span>
        );
      case 'ready_to_send':
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/40">
            Ready
          </span>
        );
      case 'sent':
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/40">
            Sent
          </span>
        );
      case 'quoted':
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/40">
            Quoted
          </span>
        );
      case 'completed':
        return (
          <span className="px-2.5 py-1 rounded-full text-[11px] font-black bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700/60 inline-flex items-center space-x-1 shadow-2xs">
            <Trophy className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
            <span>Closed & Awarded</span>
          </span>
        );
      case 'cancelled':
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800/40">
            Cancelled
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Search & Filter Header */}
      <div className="bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-slate-800/80 p-4 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-xs">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search RFQs, customers, or winning vendors..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-lg text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 font-medium focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div className="flex flex-col sm:flex-row flex-wrap items-center gap-2">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full sm:w-auto px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-300 focus:outline-none cursor-pointer"
          >
            <option value="all">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="w-full sm:w-auto px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-300 focus:outline-none cursor-pointer"
          >
            <option value="all">All Statuses</option>
            <option value="draft">Drafts</option>
            <option value="ready_to_send">Ready</option>
            <option value="sent">Sent</option>
            <option value="completed">Completed & Awarded 🏆</option>
            <option value="cancelled">Cancelled</option>
          </select>

          <button
            onClick={onOpenCreateModal}
            className="w-full sm:w-auto justify-center px-3.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium flex items-center space-x-1.5 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Create RFQ</span>
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-slate-800/80 rounded-xl shadow-xs">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 dark:bg-[#0d1322] border-b border-slate-200/80 dark:border-slate-800/80 text-slate-500 dark:text-slate-400 font-semibold">
            <tr>
              <th className="px-4 py-3">RFQ Reference</th>
              <th className="px-4 py-3">Product & Qty</th>
              <th className="px-4 py-3">Category</th>
              <th className="px-4 py-3">Vendors / Winner</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200/60 dark:divide-slate-800/60 text-slate-700 dark:text-slate-300">
            {filteredLeads.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-500 font-medium">
                  No RFQs found.
                </td>
              </tr>
            ) : (
              filteredLeads.map((lead) => {
                const assignedVendorsCount = lead.lead_vendors ? lead.lead_vendors.length : 0;
                const attachmentCount = lead.lead_attachments ? lead.lead_attachments.length : 0;
                const winner =
                  lead.winning_vendor ||
                  (lead.winning_vendor_id && lead.lead_vendors
                    ? lead.lead_vendors.find(
                        (lv: any) =>
                          lv.vendor_id === lead.winning_vendor_id ||
                          (lv.vendors && lv.vendors.id === lead.winning_vendor_id)
                      )?.vendors
                    : null);

                return (
                  <tr key={lead.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-mono text-indigo-600 dark:text-indigo-400 font-semibold text-xs">
                        {lead.lead_number}
                      </div>
                      <div className="font-medium text-slate-900 dark:text-slate-100">{lead.customer_name}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-900 dark:text-slate-200">{cleanProductTitle(lead.product_item)}</div>
                      <div className="text-slate-500 dark:text-slate-400 text-[11px] flex items-center space-x-2">
                        <span>Qty: {lead.quantity}</span>
                        {attachmentCount > 0 && (
                          <span className="text-indigo-600 dark:text-indigo-400 text-[10px]">
                            • {attachmentCount} file{attachmentCount > 1 ? 's' : ''}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded text-[11px] font-medium">
                        {lead.categories?.name || 'General'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {lead.winning_vendor_id || lead.status === 'completed' ? (
                        <div className="space-y-0.5">
                          <div className="flex items-center space-x-1.5 font-black text-amber-700 dark:text-amber-300 text-xs">
                            <Trophy className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                            <span className="truncate max-w-[160px]" title={winner?.company_name || 'Awarded Vendor'}>
                              {winner?.company_name || 'Awarded Vendor'}
                            </span>
                          </div>
                          {lead.winning_amount && (
                            <div className="text-[11px] font-black text-emerald-700 dark:text-emerald-400 pl-5">
                              ₹{Number(lead.winning_amount).toLocaleString('en-IN')}
                            </div>
                          )}
                          <div className="text-[10px] text-slate-500 dark:text-slate-400 pl-5 font-medium">
                            {assignedVendorsCount} vendor{assignedVendorsCount !== 1 ? 's' : ''} assigned
                          </div>
                        </div>
                      ) : assignedVendorsCount > 0 ? (
                        <span className="text-emerald-600 dark:text-emerald-400 text-[11px] font-medium">
                          {assignedVendorsCount} assigned
                        </span>
                      ) : (
                        <span className="text-slate-400 text-[11px]">None</span>
                      )}
                    </td>
                    <td className="px-4 py-3">{getStatusBadge(lead.status)}</td>
                    <td className="px-4 py-3 text-right space-x-1.5 whitespace-nowrap">
                      <Link
                        href={`/dashboard/leads/${lead.id}`}
                        className="px-2.5 py-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 font-medium text-xs transition-colors inline-flex items-center space-x-1"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Manage</span>
                      </Link>

                      <button
                        onClick={() => setSelectedLeadForDelete(lead)}
                        title="Delete RFQ"
                        className="p-1 rounded text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Delete Confirmation Modal */}
      {selectedLeadForDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-fade-in">
          <div className="bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-slate-800/80 rounded-xl p-6 max-w-sm w-full space-y-4 shadow-xl">
            <div className="flex items-center space-x-2 text-rose-600 dark:text-rose-400">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <h4 className="font-bold text-slate-900 dark:text-slate-100 text-sm">Delete RFQ</h4>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300">
              Are you sure you want to delete RFQ <strong className="font-mono">{selectedLeadForDelete.lead_number}</strong>?
            </p>

            <div className="flex justify-end space-x-2 pt-2">
              <button
                onClick={() => setSelectedLeadForDelete(null)}
                className="px-3.5 py-1.5 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                disabled={deleteLoading}
                className="px-4 py-1.5 rounded-lg text-xs font-medium bg-rose-600 hover:bg-rose-500 text-white flex items-center space-x-1.5"
              >
                {deleteLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Delete</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
