'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import {
  Send,
  Mail,
  Phone,
  Search,
  Loader2,
  CheckCircle2,
  ChevronDown,
  Eye,
  X,
  FileText,
  AlertCircle,
} from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { getMessageLogsPaginated } from '@/actions/logs';

interface MessageLogsClientProps {
  initialLogs: any[];
  initialTotalCount?: number;
  initialHasMore?: boolean;
}

export function MessageLogsClient({
  initialLogs,
  initialTotalCount,
  initialHasMore,
}: MessageLogsClientProps) {
  // Primary logs dataset & pagination state
  const [logs, setLogs] = useState<any[]>(initialLogs || []);
  const [page, setPage] = useState<number>(1);
  const [hasMore, setHasMore] = useState<boolean>(initialHasMore ?? false);
  const [totalCount, setTotalCount] = useState<number>(
    initialTotalCount ?? (initialLogs?.length || 0)
  );

  // Search & Filter controls
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedChannel, setSelectedChannel] = useState<'all' | 'email' | 'whatsapp'>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');

  // Loading flags
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isFiltering, setIsFiltering] = useState(false);

  // Preview modal for message content
  const [previewLog, setPreviewLog] = useState<any | null>(null);

  // IntersectionObserver scroll sentinel
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const isFirstMount = useRef(true);

  // Sync with initial props
  useEffect(() => {
    if (initialLogs) {
      setLogs(initialLogs);
      if (initialTotalCount !== undefined) setTotalCount(initialTotalCount);
      if (initialHasMore !== undefined) setHasMore(initialHasMore);
    }
  }, [initialLogs, initialTotalCount, initialHasMore]);

  // Debounced server-side search and filtering
  useEffect(() => {
    if (isFirstMount.current) {
      isFirstMount.current = false;
      return;
    }

    const timer = setTimeout(async () => {
      setIsFiltering(true);
      const res = await getMessageLogsPaginated({
        page: 1,
        pageSize: 20,
        search: searchTerm,
        channel: selectedChannel,
        status: selectedStatus,
      });

      if (res.success) {
        setLogs(res.logs);
        setPage(1);
        setTotalCount(res.totalCount);
        setHasMore(res.hasMore);
      }
      setIsFiltering(false);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm, selectedChannel, selectedStatus]);

  // Amazon-style infinite scroll fetch handler
  const loadMore = useCallback(async () => {
    if (isLoadingMore || !hasMore || isFiltering) return;

    setIsLoadingMore(true);
    const nextPage = page + 1;
    const res = await getMessageLogsPaginated({
      page: nextPage,
      pageSize: 20,
      search: searchTerm,
      channel: selectedChannel,
      status: selectedStatus,
    });

    if (res.success && res.logs) {
      setLogs((prev) => {
        const existingIds = new Set(prev.map((l) => l.id));
        const newUnique = res.logs.filter((l: any) => !existingIds.has(l.id));
        return [...prev, ...newUnique];
      });
      setPage(nextPage);
      setHasMore(res.hasMore);
      setTotalCount(res.totalCount);
    }
    setIsLoadingMore(false);
  }, [page, hasMore, isLoadingMore, isFiltering, searchTerm, selectedChannel, selectedStatus]);

  // Attach IntersectionObserver to sentinel element with 250px rootMargin
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const first = entries[0];
        if (first.isIntersecting && hasMore && !isLoadingMore && !isFiltering) {
          loadMore();
        }
      },
      {
        rootMargin: '250px',
        threshold: 0.05,
      }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [loadMore, hasMore, isLoadingMore, isFiltering]);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header Banner */}
      <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800/80 p-6 rounded-2xl shadow-sm dark:shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-xs font-semibold text-indigo-600 dark:text-indigo-400 mb-1">
            <Send className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <span>Communication & Quotation Dispatch Log</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">Audit Trail & Message Logs</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Real-time audit trail of all email dispatches and WhatsApp Web deep-link preparation events.
          </p>
        </div>

        {/* Dynamic Metric Pill */}
        <div className="flex items-center space-x-2 self-start md:self-auto">
          <div className="px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-xs font-bold text-slate-600 dark:text-slate-300 shadow-2xs">
            Showing <strong className="text-indigo-600 dark:text-indigo-400 font-extrabold">{logs.length}</strong> of{' '}
            <strong className="text-slate-900 dark:text-slate-100">{totalCount}</strong> logs
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-slate-800/80 p-4 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-xs">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search recipient address, subject, or message notes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-9 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-lg text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 font-medium focus:outline-none focus:border-indigo-500"
          />
          {isFiltering && (
            <Loader2 className="w-3.5 h-3.5 text-indigo-500 animate-spin absolute right-3 top-2.5" />
          )}
        </div>

        <div className="flex flex-col sm:flex-row flex-wrap items-center gap-2">
          {/* Channel Filter Switcher */}
          <div className="flex items-center space-x-1 bg-slate-100 dark:bg-slate-900 p-1 rounded-xl border border-slate-200/80 dark:border-slate-800 self-start sm:self-auto shrink-0">
            <button
              type="button"
              onClick={() => setSelectedChannel('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                selectedChannel === 'all'
                  ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              All Channels
            </button>
            <button
              type="button"
              onClick={() => setSelectedChannel('email')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 ${
                selectedChannel === 'email'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40'
              }`}
            >
              <Mail className="w-3 h-3" />
              <span>Email</span>
            </button>
            <button
              type="button"
              onClick={() => setSelectedChannel('whatsapp')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 ${
                selectedChannel === 'whatsapp'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40'
              }`}
            >
              <Phone className="w-3 h-3" />
              <span>WhatsApp</span>
            </button>
          </div>

          {/* Status Filter */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="w-full sm:w-auto px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-300 focus:outline-none cursor-pointer"
          >
            <option value="all">All Delivery Statuses</option>
            <option value="sent">Sent</option>
            <option value="prepared">Prepared (WhatsApp Web)</option>
            <option value="failed">Failed</option>
          </select>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800/80 rounded-2xl overflow-x-auto shadow-sm dark:shadow-xl">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 dark:bg-[#0d1322] border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">
            <tr>
              <th className="px-4 py-3.5">Timestamp</th>
              <th className="px-4 py-3.5">Channel & Type</th>
              <th className="px-4 py-3.5">RFQ Reference</th>
              <th className="px-4 py-3.5">Vendor</th>
              <th className="px-4 py-3.5">Recipient Address</th>
              <th className="px-4 py-3.5">Delivery Status</th>
              <th className="px-4 py-3.5 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60 text-slate-700 dark:text-slate-300">
            {logs.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-slate-400 dark:text-slate-500 font-medium">
                  {isFiltering ? (
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
                      <span>Filtering communication logs...</span>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <p className="font-semibold text-slate-700 dark:text-slate-300">No communication logs recorded yet.</p>
                      <p className="text-[11px] text-slate-400">
                        When quotation requests are emailed or prepared via WhatsApp, audit logs appear here.
                      </p>
                    </div>
                  )}
                </td>
              </tr>
            ) : (
              logs.map((log: any) => {
                const isWhatsApp = log.channel === 'whatsapp';
                const isFailed = log.status === 'failed';
                const leadId = log.lead_id || log.leads?.id;
                const leadNumber = log.leads?.lead_name || log.leads?.lead_number || 'N/A';

                return (
                  <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="px-4 py-3.5 font-mono text-slate-500 dark:text-slate-400 font-medium whitespace-nowrap">
                      {formatDate(log.created_at)}
                    </td>

                    <td className="px-4 py-3.5">
                      <span
                        className={`inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                          isWhatsApp
                            ? 'bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-500/30'
                            : 'bg-indigo-50 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-500/30'
                        }`}
                      >
                        {isWhatsApp ? (
                          <Phone className="w-3 h-3 text-emerald-600 dark:text-emerald-400 mr-1" />
                        ) : (
                          <Mail className="w-3 h-3 text-indigo-600 dark:text-indigo-400 mr-1" />
                        )}
                        <span>{log.channel.toUpperCase()}</span>
                      </span>
                    </td>

                    <td className="px-4 py-3.5">
                      {leadId ? (
                        <Link
                          href={`/dashboard/leads/${leadId}`}
                          className="font-mono text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 font-bold hover:underline"
                        >
                          {leadNumber}
                        </Link>
                      ) : (
                        <span className="font-mono text-slate-400">{leadNumber}</span>
                      )}
                      {log.leads?.product_item && (
                        <div className="text-[10px] text-slate-400 truncate max-w-[150px]">
                          {log.leads.product_item}
                        </div>
                      )}
                    </td>

                    <td className="px-4 py-3.5">
                      <div className="font-bold text-slate-900 dark:text-slate-100">
                        {log.vendors?.company_name || 'Vendor'}
                      </div>
                      {log.vendors?.contact_person && (
                        <div className="text-[10px] text-slate-400">
                          {log.vendors.contact_person}
                        </div>
                      )}
                    </td>

                    <td className="px-4 py-3.5 text-slate-700 dark:text-slate-300 font-mono text-[11px]">
                      {log.recipient}
                    </td>

                    <td className="px-4 py-3.5">
                      <span
                        className={`px-2.5 py-1 rounded-md text-[10px] font-bold capitalize inline-flex items-center space-x-1 ${
                          isFailed
                            ? 'bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300'
                            : log.status === 'sent'
                            ? 'bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-300'
                            : 'bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300'
                        }`}
                      >
                        {isFailed ? (
                          <AlertCircle className="w-2.5 h-2.5 text-rose-500" />
                        ) : (
                          <CheckCircle2 className="w-2.5 h-2.5 text-emerald-500" />
                        )}
                        <span>{log.status}</span>
                      </span>
                    </td>

                    <td className="px-4 py-3.5 text-right">
                      {log.content && (
                        <button
                          type="button"
                          onClick={() => setPreviewLog(log)}
                          className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-[11px] font-bold inline-flex items-center space-x-1 transition-colors"
                          title="View message audit content"
                        >
                          <Eye className="w-3 h-3 text-slate-500" />
                          <span>View</span>
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Infinite Scroll Sentinel */}
      <div ref={sentinelRef} className="h-2 w-full" />

      {/* Infinite Scroll Progress & Triggers */}
      {isLoadingMore && (
        <div className="flex items-center justify-center py-3.5 space-x-2 text-indigo-600 dark:text-indigo-400 text-xs font-bold bg-indigo-50/60 dark:bg-indigo-950/40 rounded-xl border border-indigo-200/80 dark:border-indigo-800/60 shadow-2xs animate-pulse">
          <Loader2 className="w-4 h-4 animate-spin text-indigo-600 dark:text-indigo-400" />
          <span>Loading more communication logs...</span>
        </div>
      )}

      {!hasMore && logs.length > 0 && (
        <div className="flex items-center justify-center py-3 text-slate-400 dark:text-slate-500 text-xs font-medium space-x-1.5">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
          <span>All {totalCount} communication logs loaded</span>
        </div>
      )}

      {hasMore && !isLoadingMore && (
        <div className="flex justify-center pt-1">
          <button
            type="button"
            onClick={loadMore}
            className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 py-1.5 px-3.5 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-950/50 transition-colors inline-flex items-center space-x-1"
          >
            <span>Scroll down or click to load more ({totalCount - logs.length} remaining)</span>
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Message Content Preview Modal */}
      {previewLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-fade-in">
          <div className="bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-slate-800/80 rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh]">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-200/80 dark:border-slate-800/80 flex items-center justify-between bg-slate-50 dark:bg-[#0d1322] shrink-0">
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800/60 text-indigo-600 dark:text-indigo-400">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 dark:text-slate-100 text-sm">
                    {previewLog.channel === 'whatsapp' ? 'WhatsApp Message Content' : 'Dispatched Email Content'}
                  </h3>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
                    Recipient: <strong className="font-mono text-slate-700 dark:text-slate-300">{previewLog.recipient}</strong>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setPreviewLog(null)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800 text-sm font-bold transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <div className="p-6 space-y-4 text-xs overflow-y-auto">
              {previewLog.subject && (
                <div className="bg-slate-50 dark:bg-slate-900 p-3 rounded-xl border border-slate-200/80 dark:border-slate-800">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Subject</div>
                  <div className="font-bold text-slate-900 dark:text-slate-100 text-xs">{previewLog.subject}</div>
                </div>
              )}

              {previewLog.error_message && (
                <div className="bg-rose-50 dark:bg-rose-950/40 p-3 rounded-xl border border-rose-200 dark:border-rose-800/60 text-rose-800 dark:text-rose-300">
                  <div className="text-[10px] font-bold text-rose-600 uppercase tracking-wider mb-0.5">Error Details</div>
                  <div className="font-mono text-[11px]">{previewLog.error_message}</div>
                </div>
              )}

              <div>
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Message Body</div>
                <div className="bg-slate-50 dark:bg-slate-900/80 p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 font-mono text-[11px] text-slate-800 dark:text-slate-200 whitespace-pre-wrap leading-relaxed max-h-[350px] overflow-y-auto select-all">
                  {previewLog.content}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3 border-t border-slate-200/80 dark:border-slate-800/80 bg-slate-50/80 dark:bg-[#0d1322] flex justify-end shrink-0">
              <button
                onClick={() => setPreviewLog(null)}
                className="px-4 py-1.5 rounded-lg bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 font-bold text-xs text-slate-700 dark:text-slate-300 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
