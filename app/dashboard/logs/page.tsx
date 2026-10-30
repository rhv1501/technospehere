import { getMessageLogsPaginated } from '@/actions/logs';
import { MessageLogsClient } from './MessageLogsClient';

export const revalidate = 0;

export default async function AuditLogsPage() {
  const logsRes = await getMessageLogsPaginated({ page: 1, pageSize: 20 });

  return (
    <MessageLogsClient
      initialLogs={logsRes.logs || []}
      initialTotalCount={logsRes.totalCount || 0}
      initialHasMore={logsRes.hasMore ?? false}
    />
  );
}
