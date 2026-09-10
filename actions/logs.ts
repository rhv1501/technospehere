'use server';

import { createAdminClient } from '@/lib/supabase/admin';

export async function getMessageLogs(leadId?: string) {
  try {
    const supabase = createAdminClient();

    let query = supabase
      .from('message_logs')
      .select(`
        *,
        vendors ( id, company_name, contact_person, email ),
        leads ( id, lead_number, product_item )
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
