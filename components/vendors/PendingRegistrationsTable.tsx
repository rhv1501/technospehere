'use client';

import { useState } from 'react';
import { Loader2 } from 'lucide-react';
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
  const [selectedReg, setSelectedReg] = useState<any | null>(null);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const getCategoryNames = (catIds: string[]) => {
    if (!catIds || catIds.length === 0) return 'General';
    return catIds
      .map((id) => categories.find((c) => c.id === id)?.name)
      .filter(Boolean)
      .join(', ');
  };

  const handleApprove = async (regId: string) => {
    setLoadingId(regId);
    const res = await approveVendorRegistration(regId);
    setLoadingId(null);

    if (res.success) {
      toast.success('Vendor registration approved');
      setSelectedReg(null);
      onRefresh();
    } else {
      toast.error(res.error || 'Failed to approve registration');
    }
  };

  const handleConfirmReject = async () => {
    if (!selectedReg) return;
    setLoadingId(selectedReg.id);
    const res = await rejectVendorRegistration(selectedReg.id, rejectionReason);
    setLoadingId(null);

    if (res.success) {
      toast.info('Vendor registration rejected');
      setRejectModalOpen(false);
      setSelectedReg(null);
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
              <th className="px-4 py-3 text-right min-w-[140px]">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200/60 dark:divide-slate-800/60 text-slate-700 dark:text-slate-300">
            {registrations.map((reg) => {
              const isPending = reg.status === 'pending';
              const isLoading = loadingId === reg.id;

              return (
                <tr key={reg.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                  <td className="px-4 py-3">
                    <div className="font-semibold text-slate-900 dark:text-slate-100">
                      {reg.company_name}
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">
                      {reg.contact_person}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-indigo-600 dark:text-indigo-400 text-xs truncate max-w-[180px]">
                      {reg.email}
                    </div>
                    <div className="text-slate-500 text-[11px]">
                      {reg.whatsapp_number}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200/60 dark:border-indigo-800/40 text-indigo-700 dark:text-indigo-300 rounded text-[11px] font-medium truncate max-w-[160px] inline-block">
                      {getCategoryNames(reg.category_ids)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-500">
                    {formatDate(reg.created_at)}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`px-2 py-0.5 rounded text-[11px] font-medium ${
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
                    {isPending ? (
                      <div className="flex items-center justify-end space-x-1.5">
                        <button
                          onClick={() => handleApprove(reg.id)}
                          disabled={isLoading}
                          className="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs transition-colors flex items-center space-x-1"
                        >
                          {isLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                          <span>Approve</span>
                        </button>
                        <button
                          onClick={() => {
                            setSelectedReg(reg);
                            setRejectModalOpen(true);
                          }}
                          disabled={isLoading}
                          className="px-2.5 py-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/50 dark:hover:text-rose-400 font-medium text-xs transition-colors"
                        >
                          Reject
                        </button>
                      </div>
                    ) : (
                      <span className="text-slate-400 text-[11px]">Reviewed</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Reject Modal */}
      {rejectModalOpen && selectedReg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-fade-in">
          <div className="bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-slate-800/80 rounded-xl p-6 max-w-sm w-full space-y-4 shadow-xl">
            <h4 className="font-bold text-slate-900 dark:text-slate-100 text-sm">
              Reject Registration — {selectedReg.company_name}
            </h4>

            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                Reason for Rejection (Optional)
              </label>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="e.g. Did not meet compliance standards..."
                rows={3}
                className="w-full p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-lg text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="flex justify-end space-x-2 pt-2">
              <button
                onClick={() => {
                  setRejectModalOpen(false);
                  setSelectedReg(null);
                }}
                className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmReject}
                disabled={loadingId === selectedReg.id}
                className="px-4 py-1.5 rounded-lg text-xs font-medium bg-rose-600 hover:bg-rose-500 text-white flex items-center space-x-1.5"
              >
                {loadingId === selectedReg.id && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Confirm Reject</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
