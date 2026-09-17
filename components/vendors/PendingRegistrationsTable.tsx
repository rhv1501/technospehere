'use client';

import { useState } from 'react';
import {
  Loader2,
  Eye,
  Check,
  X,
  Building2,
  Mail,
  Phone,
  MapPin,
  FileText,
  Tag,
  ShieldAlert,
  Clock,
  ExternalLink,
  UserCheck,
  Hash,
} from 'lucide-react';
import { approveVendorRegistration, rejectVendorRegistration } from '@/actions/vendors';
import { formatDate } from '@/lib/utils';
import { toast } from 'sonner';

interface PendingRegistrationsTableProps {
  registrations: any[];
  categories: any[];
  onRefresh: () => void;
}

export function PendingRegistrationsTable({
  registrations,
  categories,
  onRefresh,
}: PendingRegistrationsTableProps) {
  const [selectedRegForView, setSelectedRegForView] = useState<any | null>(null);
  const [selectedRegForReject, setSelectedRegForReject] = useState<any | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const getCategoryObjects = (catIds: string[]) => {
    if (!catIds || catIds.length === 0) return [];
    return catIds
      .map((id) => categories.find((c) => c.id === id))
      .filter(Boolean);
  };

  const getCategoryNames = (catIds: string[]) => {
    const cats = getCategoryObjects(catIds);
    if (cats.length === 0) return 'General Category';
    return cats.map((c) => c.name).join(', ');
  };

  const handleApprove = async (regId: string) => {
    setLoadingId(regId);
    const res = await approveVendorRegistration(regId);
    setLoadingId(null);

    if (res.success) {
      toast.success('Vendor registration approved successfully!');
      setSelectedRegForView(null);
      onRefresh();
    } else {
      toast.error(res.error || 'Failed to approve registration');
    }
  };

  const handleConfirmReject = async () => {
    if (!selectedRegForReject) return;
    setLoadingId(selectedRegForReject.id);
    const res = await rejectVendorRegistration(selectedRegForReject.id, rejectionReason);
    setLoadingId(null);

    if (res.success) {
      toast.info('Vendor registration rejected');
      setSelectedRegForReject(null);
      setSelectedRegForView(null);
      setRejectionReason('');
      onRefresh();
    } else {
      toast.error(res.error || 'Failed to reject registration');
    }
  };

  if (!registrations || registrations.length === 0) {
    return (
      <div className="bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-slate-800/80 rounded-xl p-12 text-center shadow-xs space-y-2">
        <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">No Pending Registrations</h4>
        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
          Submissions from the public registration link will appear here for review.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="overflow-x-auto bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-slate-800/80 rounded-xl shadow-xs">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 dark:bg-[#0d1322] border-b border-slate-200/80 dark:border-slate-800/80 text-slate-500 dark:text-slate-400 font-semibold">
            <tr>
              <th className="px-4 py-3 min-w-[180px]">Company & Contact</th>
              <th className="px-4 py-3 min-w-[180px]">Contact Info</th>
              <th className="px-4 py-3 min-w-[160px]">Requested Categories</th>
              <th className="px-4 py-3 min-w-[120px]">Submitted</th>
              <th className="px-4 py-3 min-w-[100px]">Status</th>
              <th className="px-4 py-3 text-right min-w-[170px]">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200/60 dark:divide-slate-800/60 text-slate-700 dark:text-slate-300">
            {registrations.map((reg) => {
              const isPending = reg.status === 'pending';
              const isLoading = loadingId === reg.id;

              return (
                <tr key={reg.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                  <td className="px-4 py-3">
                    <button
                      onClick={() => setSelectedRegForView(reg)}
                      className="font-bold text-slate-900 dark:text-slate-100 hover:text-indigo-600 dark:hover:text-indigo-400 text-left transition-colors"
                    >
                      {reg.company_name}
                    </button>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                      {reg.contact_person}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-indigo-600 dark:text-indigo-400 text-xs truncate max-w-[180px] font-medium">
                      {reg.email}
                    </div>
                    <div className="text-slate-500 dark:text-slate-400 text-[11px] font-medium">
                      {reg.whatsapp_number}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200/60 dark:border-indigo-800/40 text-indigo-700 dark:text-indigo-300 rounded text-[11px] font-semibold truncate max-w-[160px] inline-block">
                      {getCategoryNames(reg.category_ids)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-500 dark:text-slate-400 font-medium">
                    {formatDate(reg.created_at)}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`px-2.5 py-0.5 rounded text-[11px] font-extrabold capitalize ${
                        reg.status === 'approved'
                          ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/40'
                          : reg.status === 'rejected'
                          ? 'bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800/40'
                          : 'bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/40'
                      }`}
                    >
                      {reg.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <div className="flex items-center justify-end space-x-1.5">
                      <button
                        onClick={() => setSelectedRegForView(reg)}
                        className="px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs flex items-center space-x-1 transition-colors shadow-xs"
                        title="View Vendor Registration Details"
                      >
                        <Eye className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                        <span>Details</span>
                      </button>

                      {isPending && (
                        <>
                          <button
                            onClick={() => handleApprove(reg.id)}
                            disabled={isLoading}
                            className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-colors flex items-center space-x-1 shadow-xs"
                          >
                            {isLoading ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Check className="w-3.5 h-3.5" />
                            )}
                            <span>Approve</span>
                          </button>

                          <button
                            onClick={() => {
                              setSelectedRegForReject(reg);
                            }}
                            disabled={isLoading}
                            className="px-2 py-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/50 hover:bg-rose-100 dark:hover:bg-rose-900/60 border border-rose-200 dark:border-rose-800/40 text-rose-700 dark:text-rose-300 font-bold text-xs transition-colors"
                          >
                            Reject
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* VENDOR REGISTRATION DETAILS & APPROVAL MODAL */}
      {selectedRegForView && (
        <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-md p-4 sm:p-6 flex items-center justify-center animate-fade-in">
          <div className="relative w-full max-w-2xl bg-white dark:bg-[#111827] border border-slate-200/90 dark:border-slate-800/90 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[88vh] my-auto">
            {/* Top Accent Gradient Line */}
            <div className="h-1.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-600 w-full shrink-0" />

            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-200/80 dark:border-slate-800/80 flex items-center justify-between bg-slate-50/90 dark:bg-[#0d1322]/90 shrink-0">
              <div className="flex items-center space-x-3">
                <div className="p-3 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800/40 text-indigo-600 dark:text-indigo-400 shrink-0">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-black text-slate-900 dark:text-slate-100 text-lg tracking-tight">
                      {selectedRegForView.company_name}
                    </h3>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                        selectedRegForView.status === 'approved'
                          ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700'
                          : selectedRegForView.status === 'rejected'
                          ? 'bg-rose-100 dark:bg-rose-950/80 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-700'
                          : 'bg-amber-100 dark:bg-amber-950/80 text-amber-900 dark:text-amber-300 border border-amber-300 dark:border-amber-700 animate-pulse'
                      }`}
                    >
                      {selectedRegForView.status === 'pending' ? 'Pending Review' : selectedRegForView.status}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium flex items-center space-x-2 mt-0.5">
                    <span className="flex items-center space-x-1">
                      <Clock className="w-3 h-3 text-slate-400" />
                      <span>Submitted: {formatDate(selectedRegForView.created_at)}</span>
                    </span>
                    <span>•</span>
                    <span className="flex items-center space-x-1 text-slate-400 font-mono">
                      <Hash className="w-3 h-3 text-slate-400" />
                      <span>ID: {selectedRegForView.id.substring(0, 8)}</span>
                    </span>
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSelectedRegForView(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                title="Close Modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body - Scrollable */}
            <div className="p-6 space-y-5 overflow-y-auto text-xs max-h-[calc(88vh-140px)] custom-scrollbar">
              {/* Primary Contact Person */}
              <div className="bg-indigo-50/60 dark:bg-indigo-950/40 p-4 rounded-xl border border-indigo-200/80 dark:border-indigo-900/50 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-indigo-700 dark:text-indigo-300 uppercase tracking-wider flex items-center space-x-1.5">
                    <UserCheck className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                    <span>Primary Contact Person (Mandatory)</span>
                  </span>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-indigo-100 dark:bg-indigo-900 text-indigo-800 dark:text-indigo-200">
                    Compulsory
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                  <div>
                    <span className="text-slate-400 dark:text-slate-500 font-medium block text-[10px]">Name</span>
                    <span className="font-extrabold text-slate-900 dark:text-slate-100 text-xs block">
                      {selectedRegForView.contact_person}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 dark:text-slate-500 font-medium block text-[10px]">Email</span>
                    <a
                      href={`mailto:${selectedRegForView.email}`}
                      className="font-extrabold text-indigo-600 dark:text-indigo-400 text-xs hover:underline block truncate"
                      title="Send Email"
                    >
                      {selectedRegForView.email}
                    </a>
                  </div>
                  <div>
                    <span className="text-slate-400 dark:text-slate-500 font-medium block text-[10px]">WhatsApp</span>
                    <a
                      href={`https://wa.me/${selectedRegForView.whatsapp_number?.replace(/[^0-9]/g, '')}`}
                      target="_blank"
                      rel="noreferrer"
                      className="font-extrabold text-emerald-700 dark:text-emerald-400 text-xs hover:underline flex items-center space-x-1"
                      title="Open WhatsApp Chat"
                    >
                      <span>{selectedRegForView.whatsapp_number}</span>
                      <ExternalLink className="w-3 h-3 text-slate-400" />
                    </a>
                  </div>
                </div>
              </div>

              {/* Secondary Contact Person (Optional) */}
              <div className="bg-slate-50 dark:bg-slate-900/80 p-4 rounded-xl border border-slate-200/80 dark:border-slate-800/80 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                    Secondary Contact Person (Optional)
                  </span>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                    Optional
                  </span>
                </div>
                {selectedRegForView.secondary_contact_person || selectedRegForView.secondary_email || selectedRegForView.secondary_phone ? (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                    <div>
                      <span className="text-slate-400 dark:text-slate-500 font-medium block text-[10px]">Name</span>
                      <span className="font-extrabold text-slate-900 dark:text-slate-100 text-xs block">
                        {selectedRegForView.secondary_contact_person || '—'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 dark:text-slate-500 font-medium block text-[10px]">Email</span>
                      <span className="font-semibold text-slate-700 dark:text-slate-300 text-xs block truncate">
                        {selectedRegForView.secondary_email || '—'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 dark:text-slate-500 font-medium block text-[10px]">Phone</span>
                      <span className="font-semibold text-slate-900 dark:text-slate-100 text-xs block">
                        {selectedRegForView.secondary_phone || '—'}
                      </span>
                    </div>
                  </div>
                ) : (
                  <p className="text-[11px] text-slate-400 italic">No secondary contact person provided in registration.</p>
                )}
              </div>

              <div className="p-4 bg-slate-50 dark:bg-slate-900/80 rounded-xl border border-slate-200/80 dark:border-slate-800/80 space-y-1">
                <span className="text-slate-400 dark:text-slate-500 font-bold block flex items-center space-x-1.5 text-[11px]">
                  <FileText className="w-3.5 h-3.5 text-indigo-500" />
                  <span>GST Number / GSTIN</span>
                </span>
                <span className="font-mono font-extrabold text-slate-900 dark:text-slate-100 text-xs block">
                  {selectedRegForView.gst_number || 'Not Provided / Exempt'}
                </span>
              </div>

              {/* Requested Categories Block */}
              <div className="p-4 bg-slate-50 dark:bg-slate-900/80 rounded-xl border border-slate-200/80 dark:border-slate-800/80 space-y-2">
                <span className="text-slate-500 dark:text-slate-400 font-extrabold block flex items-center space-x-1.5 text-xs">
                  <Tag className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                  <span>Requested Business Categories</span>
                </span>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {getCategoryObjects(selectedRegForView.category_ids).length > 0 ? (
                    getCategoryObjects(selectedRegForView.category_ids).map((c: any) => (
                      <span
                        key={c.id}
                        className="px-3 py-1 bg-indigo-50 dark:bg-indigo-950/80 text-indigo-800 dark:text-indigo-200 border border-indigo-200 dark:border-indigo-800/40 rounded-lg text-xs font-bold shadow-2xs"
                      >
                        {c.name}
                      </span>
                    ))
                  ) : (
                    <span className="text-slate-400 font-medium italic">General Procurement Category</span>
                  )}
                </div>
              </div>

              {/* Company Address */}
              <div className="p-4 bg-slate-50 dark:bg-slate-900/80 rounded-xl border border-slate-200/80 dark:border-slate-800/80 space-y-1.5">
                <span className="text-slate-500 dark:text-slate-400 font-extrabold block flex items-center space-x-1.5 text-xs">
                  <MapPin className="w-3.5 h-3.5 text-rose-500" />
                  <span>Registered Address</span>
                </span>
                <p className="text-slate-800 dark:text-slate-200 font-medium leading-relaxed">
                  {selectedRegForView.address || 'No physical address provided.'}
                </p>
              </div>

              {/* Additional Vendor Notes */}
              <div className="p-4 bg-slate-50 dark:bg-slate-900/80 rounded-xl border border-slate-200/80 dark:border-slate-800/80 space-y-1.5">
                <span className="text-slate-500 dark:text-slate-400 font-extrabold block text-xs">
                  Vendor Submission Notes / Description:
                </span>
                <p className="text-slate-800 dark:text-slate-200 font-medium whitespace-pre-line leading-relaxed">
                  {selectedRegForView.notes || 'No additional notes provided by vendor.'}
                </p>
              </div>

              {/* Rejection Log */}
              {selectedRegForView.status === 'rejected' && selectedRegForView.rejection_reason && (
                <div className="p-4 bg-rose-50 dark:bg-rose-950/40 rounded-xl border border-rose-200 dark:border-rose-800/40 space-y-1">
                  <span className="text-rose-700 dark:text-rose-400 font-extrabold block flex items-center space-x-1 text-xs">
                    <ShieldAlert className="w-4 h-4" />
                    <span>Rejection Reason Log:</span>
                  </span>
                  <p className="text-rose-900 dark:text-rose-200 font-semibold">
                    {selectedRegForView.rejection_reason}
                  </p>
                </div>
              )}
            </div>

            {/* Modal Actions Footer - Sticky Bottom */}
            <div className="px-6 py-4 border-t border-slate-200/80 dark:border-slate-800/80 flex items-center justify-between bg-slate-50/90 dark:bg-[#0d1322]/90 shrink-0">
              <button
                onClick={() => setSelectedRegForView(null)}
                className="px-4 py-2 rounded-xl text-xs font-extrabold text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
              >
                Close
              </button>

              {selectedRegForView.status === 'pending' && (
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => {
                      setSelectedRegForReject(selectedRegForView);
                    }}
                    disabled={loadingId === selectedRegForView.id}
                    className="px-4 py-2 rounded-xl bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-100 dark:hover:bg-rose-900/80 border border-rose-200 dark:border-rose-800/40 text-rose-700 dark:text-rose-300 font-extrabold text-xs transition-colors flex items-center space-x-1.5"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>Reject Registration</span>
                  </button>

                  <button
                    onClick={() => handleApprove(selectedRegForView.id)}
                    disabled={loadingId === selectedRegForView.id}
                    className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs shadow-lg shadow-emerald-600/30 flex items-center space-x-1.5 transition-all hover:scale-[1.02] active:scale-[0.98]"
                  >
                    {loadingId === selectedRegForView.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Check className="w-4 h-4" />
                    )}
                    <span>Approve Vendor Registration</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* REJECT REASON MODAL */}
      {selectedRegForReject && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
          <div className="relative w-full max-w-md bg-white dark:bg-[#111827] border border-slate-200/90 dark:border-slate-800/90 rounded-2xl p-6 space-y-4 shadow-2xl my-auto">
            <h4 className="font-extrabold text-slate-900 dark:text-slate-100 text-sm flex items-center space-x-2">
              <ShieldAlert className="w-4 h-4 text-rose-500" />
              <span>Reject Registration — {selectedRegForReject.company_name}</span>
            </h4>

            <div>
              <label className="block text-xs font-extrabold text-slate-700 dark:text-slate-300 mb-1">
                Reason for Rejection (Optional)
              </label>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Specify reason for rejection e.g. Invalid GSTIN or non-matching product category..."
                rows={3}
                className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-rose-500 font-medium"
              />
            </div>

            <div className="flex justify-end space-x-2 pt-2">
              <button
                onClick={() => {
                  setSelectedRegForReject(null);
                  setRejectionReason('');
                }}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmReject}
                disabled={loadingId === selectedRegForReject.id}
                className="px-4 py-2 rounded-xl text-xs font-extrabold bg-rose-600 hover:bg-rose-500 text-white shadow-md flex items-center space-x-1.5 transition-all"
              >
                {loadingId === selectedRegForReject.id && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Confirm Reject</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
