'use client';

import { useState } from 'react';
import {
  Search,
  Eye,
  Edit2,
  Power,
  Plus,
  Loader2,
} from 'lucide-react';
import { toggleVendorStatus } from '@/actions/vendors';
import { formatDate } from '@/lib/utils';
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

      {/* Vendor Table */}
      <div className="overflow-x-auto bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-slate-800/80 rounded-xl shadow-xs">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 dark:bg-[#0d1322] border-b border-slate-200/80 dark:border-slate-800/80 text-slate-500 dark:text-slate-400 font-semibold">
            <tr>
              <th className="px-4 py-3 min-w-[200px]">Company & Primary Contact</th>
              <th className="px-4 py-3 min-w-[180px]">Primary Contact Info</th>
              <th className="px-4 py-3 min-w-[180px]">Categories</th>
              <th className="px-4 py-3 min-w-[140px]">GST & Location</th>
              <th className="px-4 py-3 min-w-[100px]">Status</th>
              <th className="px-4 py-3 text-right min-w-[120px]">Actions</th>
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
                      <div className="font-semibold text-slate-900 dark:text-slate-100">
                        {vendor.company_name}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
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

                    <td className="px-4 py-3 text-right space-x-1 whitespace-nowrap">
                      <button
                        onClick={() => setSelectedVendorForView(vendor)}
                        className="px-2.5 py-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 font-medium text-xs transition-colors inline-flex items-center space-x-1"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>View</span>
                      </button>

                      <button
                        onClick={() => setSelectedVendorForEdit(vendor)}
                        className="p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
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

      {/* View Details Modal */}
      {selectedVendorForView && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-fade-in">
          <div className="bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-slate-800/80 rounded-xl w-full max-w-lg overflow-hidden shadow-xl space-y-0">
            <div className="px-6 py-4 border-b border-slate-200/80 dark:border-slate-800/80 flex items-center justify-between bg-slate-50 dark:bg-[#0d1322]">
              <div>
                <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                  {selectedVendorForView.company_name}
                </h3>
                <span className="text-[10px] text-slate-400 font-medium">Status: {selectedVendorForView.status}</span>
              </div>
              <button
                onClick={() => setSelectedVendorForView(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs max-h-[80vh] overflow-y-auto">
              {/* Primary Contact */}
              <div className="bg-indigo-50/50 dark:bg-indigo-950/30 p-3.5 rounded-lg border border-indigo-100 dark:border-indigo-900/50 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-indigo-700 dark:text-indigo-300 uppercase tracking-wider">
                    Primary Contact (Mandatory)
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[10px]">Name</span>
                    <span className="font-semibold text-slate-900 dark:text-slate-100">{selectedVendorForView.contact_person}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">WhatsApp</span>
                    <span className="font-medium text-slate-900 dark:text-slate-100">{selectedVendorForView.whatsapp_number}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-slate-400 block text-[10px]">Email</span>
                    <span className="text-indigo-600 dark:text-indigo-400 font-medium">{selectedVendorForView.email}</span>
                  </div>
                </div>
              </div>

              {/* Secondary Contact */}
              <div className="bg-slate-50 dark:bg-slate-900 p-3.5 rounded-lg border border-slate-200/80 dark:border-slate-800/80 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                    Secondary Contact (Optional)
                  </span>
                </div>
                {selectedVendorForView.secondary_contact_person || selectedVendorForView.secondary_email || selectedVendorForView.secondary_phone ? (
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-slate-400 block text-[10px]">Name</span>
                      <span className="font-semibold text-slate-900 dark:text-slate-100">{selectedVendorForView.secondary_contact_person || '—'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Phone</span>
                      <span className="font-medium text-slate-900 dark:text-slate-100">{selectedVendorForView.secondary_phone || '—'}</span>
                    </div>
                    <div className="col-span-2">
                      <span className="text-slate-400 block text-[10px]">Email</span>
                      <span className="text-slate-700 dark:text-slate-300 font-medium">{selectedVendorForView.secondary_email || '—'}</span>
                    </div>
                  </div>
                ) : (
                  <p className="text-[11px] text-slate-400 italic">No secondary contact person configured.</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3 bg-slate-50 dark:bg-slate-900 p-3.5 rounded-lg border border-slate-200/80 dark:border-slate-800/80">
                <div>
                  <span className="text-slate-400 block font-medium text-[10px]">GST Number</span>
                  <span className="text-slate-900 dark:text-slate-200 font-mono">
                    {selectedVendorForView.gst_number || 'N/A'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium text-[10px]">Added On</span>
                  <span className="text-slate-700 dark:text-slate-300">{formatDate(selectedVendorForView.created_at)}</span>
                </div>
              </div>

              <div>
                <span className="text-slate-500 block mb-1 font-medium text-[11px]">Assigned Categories</span>
                <div className="flex flex-wrap gap-1">
                  {selectedVendorForView.categories && selectedVendorForView.categories.length > 0 ? (
                    selectedVendorForView.categories.map((c: any) => (
                      <span
                        key={c.id}
                        className="px-2 py-0.5 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800/40 rounded text-[11px] font-medium"
                      >
                        {c.name}
                      </span>
                    ))
                  ) : (
                    <span className="text-slate-400">None</span>
                  )}
                </div>
              </div>

              {selectedVendorForView.address && (
                <div>
                  <span className="text-slate-500 block mb-1 font-medium text-[11px]">Address</span>
                  <p className="text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-900 p-3 rounded-lg border border-slate-200/80 dark:border-slate-800/80">
                    {selectedVendorForView.address}
                  </p>
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
