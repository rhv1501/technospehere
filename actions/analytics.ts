'use server';

import { createAdminClient } from '@/lib/supabase/admin';

export interface AnalyticsSummary {
  totalLeads: number;
  totalVendors: number;
  activeVendors: number;
  inactiveVendors: number;
  pendingRegistrations: number;
  totalEstimatedBudget: number;
  avgLeadQuantity: number;
  totalEmailsSent: number;
  totalWhatsAppPrepared: number;
  leadsByStatus: Record<string, number>;
  vendorsByCategory: Array<{
    categoryId: string;
    categoryName: string;
    totalCount: number;
    activeCount: number;
  }>;
  leadsByCategory: Array<{
    categoryId: string;
    categoryName: string;
    leadCount: number;
    totalBudget: number;
  }>;
  topLeadsByBudget: any[];
  recentActivityLogs: any[];
}

export async function getAnalyticsData() {
  try {
    const supabase = createAdminClient();

    // Parallel data queries for optimal performance
    const [
      leadsRes,
      vendorsRes,
      categoriesRes,
      registrationsRes,
      logsRes,
    ] = await Promise.all([
      supabase.from('leads').select(`
        *,
        categories ( id, name ),
        lead_vendors ( id, email_sent, whatsapp_prepared )
      `),
      supabase.from('vendors').select(`
        *,
        vendor_categories ( category_id )
      `),
      supabase.from('categories').select('*').order('name'),
      supabase.from('vendor_registrations').select('*'),
      supabase.from('message_logs').select(`
        *,
        leads ( lead_number, customer_name ),
        vendors ( company_name )
      `).order('created_at', { ascending: false }).limit(10),
    ]);

    const leads = leadsRes.data || [];
    const vendors = vendorsRes.data || [];
    const categories = categoriesRes.data || [];
    const registrations = registrationsRes.data || [];
    const logs = logsRes.data || [];

    // Basic Metrics
    const totalLeads = leads.length;
    const totalVendors = vendors.length;
    const activeVendors = vendors.filter((v) => v.status === 'active').length;
    const inactiveVendors = vendors.filter((v) => v.status === 'inactive').length;
    const pendingRegistrations = registrations.filter((r) => r.status === 'pending').length;

    // Financials & Quantities
    let totalEstimatedBudget = 0;
    let totalQuantity = 0;
    leads.forEach((l) => {
      totalQuantity += l.quantity || 0;
      if (l.unit_price_estimate && l.quantity) {
        totalEstimatedBudget += Number(l.unit_price_estimate) * Number(l.quantity);
      }
    });

    const avgLeadQuantity = totalLeads > 0 ? Math.round(totalQuantity / totalLeads) : 0;

    // Message dispatch counts
    let totalEmailsSent = 0;
    let totalWhatsAppPrepared = 0;
    leads.forEach((l) => {
      (l.lead_vendors || []).forEach((lv: any) => {
        if (lv.email_sent) totalEmailsSent++;
        if (lv.whatsapp_prepared) totalWhatsAppPrepared++;
      });
    });

    // Lead Status Breakdown
    const leadsByStatus: Record<string, number> = {
      draft: 0,
      ready_to_send: 0,
      sent: 0,
      quoted: 0,
      completed: 0,
      cancelled: 0,
    };
    leads.forEach((l) => {
      const st = l.status || 'draft';
      leadsByStatus[st] = (leadsByStatus[st] || 0) + 1;
    });

    // Vendors by Category
    const vendorsByCategory = categories.map((cat) => {
      const matchingVendors = vendors.filter((v) =>
        v.vendor_categories?.some((vc: any) => vc.category_id === cat.id)
      );
      const activeCount = matchingVendors.filter((v) => v.status === 'active').length;

      return {
        categoryId: cat.id,
        categoryName: cat.name,
        totalCount: matchingVendors.length,
        activeCount,
      };
    });

    // Leads by Category
    const leadsByCategory = categories.map((cat) => {
      const catLeads = leads.filter((l) => l.category_id === cat.id);
      let catBudget = 0;
      catLeads.forEach((l) => {
        if (l.unit_price_estimate && l.quantity) {
          catBudget += Number(l.unit_price_estimate) * Number(l.quantity);
        }
      });

      return {
        categoryId: cat.id,
        categoryName: cat.name,
        leadCount: catLeads.length,
        totalBudget: catBudget,
      };
    }).filter((c) => c.leadCount > 0);

    // Unassigned category leads
    const unassignedLeads = leads.filter((l) => !l.category_id);
    if (unassignedLeads.length > 0) {
      let unassignedBudget = 0;
      unassignedLeads.forEach((l) => {
        if (l.unit_price_estimate && l.quantity) {
          unassignedBudget += Number(l.unit_price_estimate) * Number(l.quantity);
        }
      });
      leadsByCategory.push({
        categoryId: 'unassigned',
        categoryName: 'Unassigned Category',
        leadCount: unassignedLeads.length,
        totalBudget: unassignedBudget,
      });
    }

    // Top 5 leads by calculated estimated value
    const topLeadsByBudget = [...leads]
      .map((l) => ({
        ...l,
        total_value: (l.quantity || 1) * (l.unit_price_estimate || 0),
      }))
      .sort((a, b) => b.total_value - a.total_value)
      .slice(0, 5);

    return {
      success: true,
      data: {
        totalLeads,
        totalVendors,
        activeVendors,
        inactiveVendors,
        pendingRegistrations,
        totalEstimatedBudget,
        avgLeadQuantity,
        totalEmailsSent,
        totalWhatsAppPrepared,
        leadsByStatus,
        vendorsByCategory,
        leadsByCategory,
        topLeadsByBudget,
        recentActivityLogs: logs,
      },
    };
  } catch (error: any) {
    console.error('Error fetching analytics data:', error);
    return {
      success: false,
      error: error.message || 'Failed to fetch analytics data',
      data: null,
    };
  }
}
