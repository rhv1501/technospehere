'use server';

import { createAdminClient } from '@/lib/supabase/admin';
import { parseLineItemsFromLead } from '@/lib/leadUtils';

export interface AnalyticsSummary {
  leads: any[];
  vendors: any[];
  categories: any[];
  registrations: any[];
  logs: any[];
  totalLeads: number;
  totalVendors: number;
  activeVendors: number;
  inactiveVendors: number;
  pendingRegistrations: number;
  totalUnits: number;
  totalLineItemsCount: number;
  avgUnitsPerRfq: number;
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
    totalUnits: number;
  }>;
  topLeadsByQuantity: Array<{
    id: string;
    lead_number: string;
    customer_name: string;
    product_item: string;
    quantity: number;
    lineItemsCount: number;
    status: string;
    vendorsCount: number;
    created_at: string;
  }>;
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
      `).order('created_at', { ascending: false }).limit(20),
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

    // Unit Volume & Line Items
    let totalUnits = 0;
    let totalLineItemsCount = 0;

    leads.forEach((l) => {
      const items = parseLineItemsFromLead(l);
      totalLineItemsCount += items.length || 1;
      const rfqUnits = items.reduce((acc, item) => acc + (Number(item.quantity) || 1), 0);
      totalUnits += rfqUnits || l.quantity || 0;
    });

    const avgUnitsPerRfq = totalLeads > 0 ? Math.round(totalUnits / totalLeads) : 0;

    // Message dispatch counts
    let totalEmailsSent = 0;
    let totalWhatsAppPrepared = 0;
    leads.forEach((l) => {
      (l.lead_vendors || []).forEach((lv: any) => {
        if (lv.email_sent) totalEmailsSent++;
        if (lv.whatsapp_prepared) totalWhatsAppPrepared++;
      });
    });

    // RFQ Status Breakdown
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

    // RFQs by Category
    const leadsByCategory = categories.map((cat) => {
      const catLeads = leads.filter((l) => l.category_id === cat.id);
      let catUnits = 0;
      catLeads.forEach((l) => {
        const items = parseLineItemsFromLead(l);
        const rfqUnits = items.reduce((acc, item) => acc + (Number(item.quantity) || 1), 0);
        catUnits += rfqUnits || l.quantity || 0;
      });

      return {
        categoryId: cat.id,
        categoryName: cat.name,
        leadCount: catLeads.length,
        totalUnits: catUnits,
      };
    }).filter((c) => c.leadCount > 0);

    // Unassigned category leads
    const unassignedLeads = leads.filter((l) => !l.category_id);
    if (unassignedLeads.length > 0) {
      let unassignedUnits = 0;
      unassignedLeads.forEach((l) => {
        const items = parseLineItemsFromLead(l);
        const rfqUnits = items.reduce((acc, item) => acc + (Number(item.quantity) || 1), 0);
        unassignedUnits += rfqUnits || l.quantity || 0;
      });
      leadsByCategory.push({
        categoryId: 'unassigned',
        categoryName: 'Unassigned Category',
        leadCount: unassignedLeads.length,
        totalUnits: unassignedUnits,
      });
    }

    // Top RFQs by unit quantity volume
    const topLeadsByQuantity = [...leads]
      .map((l) => {
        const items = parseLineItemsFromLead(l);
        const quantity = items.reduce((acc, item) => acc + (Number(item.quantity) || 1), 0) || l.quantity || 1;
        return {
          id: l.id,
          lead_number: l.lead_number,
          customer_name: l.customer_name,
          product_item: l.product_item,
          quantity,
          lineItemsCount: items.length || 1,
          status: l.status || 'draft',
          vendorsCount: (l.lead_vendors || []).length,
          created_at: l.created_at,
        };
      })
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 6);

    return {
      success: true,
      data: {
        leads,
        vendors,
        categories,
        registrations,
        logs,
        totalLeads,
        totalVendors,
        activeVendors,
        inactiveVendors,
        pendingRegistrations,
        totalUnits,
        totalLineItemsCount,
        avgUnitsPerRfq,
        totalEmailsSent,
        totalWhatsAppPrepared,
        leadsByStatus,
        vendorsByCategory,
        leadsByCategory,
        topLeadsByQuantity,
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
