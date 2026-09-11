import { getMessageLogs } from '@/actions/logs';
import { formatDate } from '@/lib/utils';
import { Send, Mail, Phone } from 'lucide-react';

export const revalidate = 0;

export default async function AuditLogsPage() {
  const logsRes = await getMessageLogs();
  const logs = logsRes.logs || [];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800/80 p-6 rounded-2xl shadow-sm dark:shadow-xl">
        <div className="flex items-center space-x-2 text-xs font-semibold text-indigo-600 dark:text-indigo-400 mb-1">
          <Send className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          <span>Communication & Quotation Dispatch Log</span>
        </div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">Audit Trail & Message Logs</h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          Track all email transmissions and WhatsApp Web deep-link preparation events across vendors.
        </p>
      </div>

      <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800/80 rounded-2xl overflow-x-auto shadow-sm dark:shadow-xl">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 dark:bg-[#0d1322] border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">
            <tr>
              <th className="px-4 py-3.5">Timestamp</th>
              <th className="px-4 py-3.5">Channel & Type</th>
              <th className="px-4 py-3.5">Lead Number</th>
              <th className="px-4 py-3.5">Vendor</th>
              <th className="px-4 py-3.5">Recipient Address</th>
              <th className="px-4 py-3.5 text-right">Delivery Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60 text-slate-700 dark:text-slate-300">
            {logs.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-slate-400 dark:text-slate-500 font-medium">
                  No communication logs recorded yet.
                </td>
              </tr>
            ) : (
              logs.map((log: any) => (
                <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                  <td className="px-4 py-3.5 font-mono text-slate-500 dark:text-slate-400 font-medium">{formatDate(log.created_at)}</td>
                  <td className="px-4 py-3.5">
                    <span
                      className={`inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                        log.channel === 'whatsapp'
                          ? 'bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-500/30'
                          : 'bg-indigo-50 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-500/30'
                      }`}
                    >
                      {log.channel === 'whatsapp' ? (
                        <Phone className="w-3 h-3 text-emerald-600 dark:text-emerald-400 mr-1" />
                      ) : (
                        <Mail className="w-3 h-3 text-indigo-600 dark:text-indigo-400 mr-1" />
                      )}
                      <span>{log.channel.toUpperCase()}</span>
                    </span>
                  </td>
                  <td className="px-4 py-3.5 font-mono text-indigo-600 dark:text-indigo-400 font-bold">
                    {log.leads?.lead_number || 'N/A'}
                  </td>
                  <td className="px-4 py-3.5 font-bold text-slate-900 dark:text-slate-100">
                    {log.vendors?.company_name || 'Vendor'}
                  </td>
                  <td className="px-4 py-3.5 text-slate-700 dark:text-slate-300 font-mono text-[11px]">
                    {log.recipient}
                  </td>
                  <td className="px-4 py-3.5 text-right">
                    <span className="px-2.5 py-1 rounded-md text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-300 capitalize">
                      {log.status}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
