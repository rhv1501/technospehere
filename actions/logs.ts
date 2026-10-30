'use server';

import { createAdminClient } from '@/lib/supabase/admin';

export interface GetMessageLogsPaginatedParams {
  page?: number;
  pageSize?: number;
  search?: string;
  channel?: string; // 'all' | 'email' | 'whatsapp'
  status?: string;
  leadId?: string;
}

export async function getMessageLogsPaginated({
  page = 1,
  pageSize = 20,
  search,
  channel,
  status,
  leadId,
}: GetMessageLogsPaginatedParams = {}) {
  try {
    const supabase = createAdminClient();

    const from = Math.max(0, (page - 1) * pageSize);
    const to = from + pageSize - 1;

    let query = supabase
      .from('message_logs')
      .select(`
        *,
        vendors ( id, company_name, contact_person, email ),
        leads ( id, lead_number, product_item, lead_name )
      `, { count: 'exact' })
      .order('created_at', { ascending: false });

    if (leadId) {
      query = query.eq('lead_id', leadId);
    }

    if (channel && channel !== 'all') {
      query = query.eq('channel', channel);
    }

    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    if (search && search.trim()) {
      const s = `%${search.trim()}%`;
      query = query.or(`recipient.ilike.${s},subject.ilike.${s}`);
    }

    query = query.range(from, to);

    const { data, count, error } = await query;
    if (error) throw error;

    const totalCount = count ?? 0;
    const hasMore = to < totalCount - 1;

    return {
      success: true,
      logs: data || [],
      totalCount,
      hasMore,
      page,
      pageSize,
    };
  } catch (error: any) {
    console.error('Error fetching paginated message logs:', error);
    return {
      success: false,
      error: error.message || 'Failed to fetch logs',
      logs: [],
      totalCount: 0,
      hasMore: false,
      page,
      pageSize,
    };
  }
}

export async function getMessageLogs(leadId?: string) {
  try {
    const supabase = createAdminClient();

    let query = supabase
      .from('message_logs')
      .select(`
        *,
        vendors ( id, company_name, contact_person, email ),
        leads ( id, lead_number, product_item, lead_name )
      `)
      .order('created_at', { ascending: false });

    if (leadId) {
      query = query.eq('lead_id', leadId);
    }

    const { data, error } = await query;
    if (error) throw error;

    return { success: true, logs: data || [] };
  } catch (error: any) {
    console.error('Error fetching message logs:', error);
    return { success: false, error: error.message || 'Failed to fetch logs', logs: [] };
  }
}
