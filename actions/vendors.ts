'use server';

import { createAdminClient } from '@/lib/supabase/admin';
import { revalidatePath } from 'next/cache';
import { enrichLeadsWithWinningVendor } from './leads';

export interface VendorInput {
  company_name: string;
  contact_person: string;
  email: string;
  whatsapp_number: string;
  secondary_contact_person?: string;
  secondary_email?: string;
  secondary_phone?: string;
  address?: string;
  gst_number?: string;
  notes?: string;
  status?: 'active' | 'inactive';
  category_ids?: string[];
}

export async function getVendors(filters?: {
  search?: string;
  categoryId?: string;
  status?: string;
}) {
  try {
    const supabase = createAdminClient();

    let query = supabase
      .from('vendors')
      .select(`
        *,
        vendor_categories (
          category_id,
          categories (
            id,
            name
          )
        )
      `)
      .order('created_at', { ascending: false });

    if (filters?.status && filters.status !== 'all') {
      query = query.eq('status', filters.status);
    }

    if (filters?.search && filters.search.trim()) {
      const s = `%${filters.search.trim()}%`;
      query = query.or(`company_name.ilike.${s},contact_person.ilike.${s},email.ilike.${s},whatsapp_number.ilike.${s},secondary_contact_person.ilike.${s},secondary_email.ilike.${s}`);
    }

    const { data: rawVendors, error } = await query;

    if (error) throw error;

    let vendors = (rawVendors || []).map((v) => {
      const categoryList = v.vendor_categories
        ? v.vendor_categories.map((vc: any) => vc.categories).filter(Boolean)
        : [];
      return {
        ...v,
        categories: categoryList,
      };
    });

    if (filters?.categoryId && filters.categoryId !== 'all') {
      vendors = vendors.filter((v) =>
        v.categories.some((c: any) => c.id === filters.categoryId)
      );
    }

    return { success: true, vendors };
  } catch (error: any) {
    console.error('Error fetching vendors:', error);
    return { success: false, error: error.message || 'Failed to fetch vendors', vendors: [] };
  }
}

export async function createVendor(data: VendorInput) {
  try {
    if (!data.company_name?.trim() || !data.contact_person?.trim() || !data.email?.trim() || !data.whatsapp_number?.trim()) {
      return { success: false, error: 'Please provide all required vendor details (Company Name, Primary Contact Person, Email, WhatsApp Number).' };
    }

    const supabase = createAdminClient();

    const { data: vendor, error: vendorError } = await supabase
      .from('vendors')
      .insert({
        company_name: data.company_name.trim(),
        contact_person: data.contact_person.trim(),
        email: data.email.trim(),
        whatsapp_number: data.whatsapp_number.trim(),
        secondary_contact_person: data.secondary_contact_person?.trim() || null,
        secondary_email: data.secondary_email?.trim() || null,
        secondary_phone: data.secondary_phone?.trim() || null,
        address: data.address?.trim() || null,
        gst_number: data.gst_number?.trim() || null,
        notes: data.notes?.trim() || null,
        status: data.status || 'active',
        registration_status: 'approved',
      })
      .select()
      .single();

    if (vendorError) throw vendorError;

    if (data.category_ids && data.category_ids.length > 0) {
      const categoryRows = data.category_ids.map((catId) => ({
        vendor_id: vendor.id,
        category_id: catId,
      }));

      const { error: catError } = await supabase
        .from('vendor_categories')
        .insert(categoryRows);

      if (catError) console.error('Error inserting vendor categories:', catError);
    }

    revalidatePath('/dashboard/vendors');
    return { success: true, vendor };
  } catch (error: any) {
    console.error('Error creating vendor:', error);
    return { success: false, error: error.message || 'Failed to create vendor' };
  }
}

export async function updateVendor(id: string, data: Partial<VendorInput>) {
  try {
    const supabase = createAdminClient();

    const updatePayload: any = {};
    if (data.company_name !== undefined) updatePayload.company_name = data.company_name.trim();
    if (data.contact_person !== undefined) updatePayload.contact_person = data.contact_person.trim();
    if (data.email !== undefined) updatePayload.email = data.email.trim();
    if (data.whatsapp_number !== undefined) updatePayload.whatsapp_number = data.whatsapp_number.trim();
    if (data.secondary_contact_person !== undefined) updatePayload.secondary_contact_person = data.secondary_contact_person?.trim() || null;
    if (data.secondary_email !== undefined) updatePayload.secondary_email = data.secondary_email?.trim() || null;
    if (data.secondary_phone !== undefined) updatePayload.secondary_phone = data.secondary_phone?.trim() || null;
    if (data.address !== undefined) updatePayload.address = data.address?.trim() || null;
    if (data.gst_number !== undefined) updatePayload.gst_number = data.gst_number?.trim() || null;
    if (data.notes !== undefined) updatePayload.notes = data.notes?.trim() || null;
    if (data.status !== undefined) updatePayload.status = data.status;

    const { data: updatedVendor, error: vendorError } = await supabase
      .from('vendors')
      .update(updatePayload)
      .eq('id', id)
      .select()
      .single();

    if (vendorError) throw vendorError;

    if (data.category_ids !== undefined) {
      await supabase.from('vendor_categories').delete().eq('vendor_id', id);

      if (data.category_ids.length > 0) {
        const categoryRows = data.category_ids.map((catId) => ({
          vendor_id: id,
          category_id: catId,
        }));
        await supabase.from('vendor_categories').insert(categoryRows);
      }
    }

    revalidatePath('/dashboard/vendors');
    return { success: true, vendor: updatedVendor };
  } catch (error: any) {
    console.error('Error updating vendor:', error);
    return { success: false, error: error.message || 'Failed to update vendor' };
  }
}

export async function toggleVendorStatus(id: string, currentStatus: string) {
  const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
  return updateVendor(id, { status: newStatus as 'active' | 'inactive' });
}

export async function getPendingRegistrations() {
  try {
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from('vendor_registrations')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    return { success: true, registrations: data || [] };
  } catch (error: any) {
    console.error('Error fetching registrations:', error);
    return { success: false, error: error.message || 'Failed to fetch registrations', registrations: [] };
  }
}

export async function submitVendorRegistration(data: VendorInput) {
  try {
    if (!data.company_name?.trim() || !data.contact_person?.trim() || !data.email?.trim() || !data.whatsapp_number?.trim()) {
      return { success: false, error: 'Company Name, Contact Person, Email, and WhatsApp Number are required.' };
    }

    const supabase = createAdminClient();

    const { data: reg, error } = await supabase
      .from('vendor_registrations')
      .insert({
        company_name: data.company_name.trim(),
        contact_person: data.contact_person.trim(),
        email: data.email.trim(),
        whatsapp_number: data.whatsapp_number.trim(),
        secondary_contact_person: data.secondary_contact_person?.trim() || null,
        secondary_email: data.secondary_email?.trim() || null,
        secondary_phone: data.secondary_phone?.trim() || null,
        category_ids: data.category_ids || [],
        address: data.address?.trim() || null,
        gst_number: data.gst_number?.trim() || null,
        notes: data.notes?.trim() || null,
        status: 'pending',
      })
      .select()
      .single();

    if (error) throw error;

    revalidatePath('/dashboard/vendors');
    return { success: true, registration: reg };
  } catch (error: any) {
    console.error('Error submitting vendor registration:', error);
    return { success: false, error: error.message || 'Failed to submit registration' };
  }
}

export async function approveVendorRegistration(registrationId: string) {
  try {
    const supabase = createAdminClient();

    const { data: reg, error: fetchErr } = await supabase
      .from('vendor_registrations')
      .select('*')
      .eq('id', registrationId)
      .single();

    if (fetchErr || !reg) throw new Error('Registration record not found');

    const { data: newVendor, error: vendorErr } = await supabase
      .from('vendors')
      .insert({
        company_name: reg.company_name,
        contact_person: reg.contact_person,
        email: reg.email,
        whatsapp_number: reg.whatsapp_number,
        secondary_contact_person: reg.secondary_contact_person,
        secondary_email: reg.secondary_email,
        secondary_phone: reg.secondary_phone,
        address: reg.address,
        gst_number: reg.gst_number,
        notes: reg.notes,
        status: 'active',
        registration_status: 'approved',
      })
      .select()
      .single();

    if (vendorErr) throw vendorErr;

    if (reg.category_ids && reg.category_ids.length > 0) {
      const categoryRows = reg.category_ids.map((catId: string) => ({
        vendor_id: newVendor.id,
        category_id: catId,
      }));
      await supabase.from('vendor_categories').insert(categoryRows);
    }

    await supabase
      .from('vendor_registrations')
      .update({
        status: 'approved',
        vendor_id: newVendor.id,
      })
      .eq('id', registrationId);

    revalidatePath('/dashboard/vendors');
    return { success: true, vendor: newVendor };
  } catch (error: any) {
    console.error('Error approving registration:', error);
    return { success: false, error: error.message || 'Failed to approve registration' };
  }
}

export async function rejectVendorRegistration(registrationId: string, reason?: string) {
  try {
    const supabase = createAdminClient();

    const { data: updatedReg, error } = await supabase
      .from('vendor_registrations')
      .update({
        status: 'rejected',
        rejection_reason: reason?.trim() || 'Did not meet onboard requirements',
      })
      .eq('id', registrationId)
      .select()
      .single();

    if (error) throw error;

    revalidatePath('/dashboard/vendors');
    return { success: true, registration: updatedReg };
  } catch (error: any) {
    console.error('Error rejecting registration:', error);
    return { success: false, error: error.message || 'Failed to reject registration' };
  }
}

export interface GetVendorRfqsPaginatedParams {
  vendorId: string;
  page?: number;
  pageSize?: number;
  filter?: 'all' | 'won';
}

export async function getVendorRfqsPaginated({
  vendorId,
  page = 1,
  pageSize = 15,
  filter = 'all',
}: GetVendorRfqsPaginatedParams) {
  try {
    const supabase = createAdminClient();

    // 1. Fetch assigned lead IDs from lead_vendors
    const { data: leadVendors } = await supabase
      .from('lead_vendors')
      .select('lead_id')
      .eq('vendor_id', vendorId);

    const assignedLeadIds = (leadVendors || []).map((lv: any) => lv.lead_id);

    // 2. Fetch leads where winning_vendor_id = vendorId
    let winningLeadIds: string[] = [];
    try {
      const { data: wonLeads } = await supabase
        .from('leads')
        .select('id')
        .eq('winning_vendor_id', vendorId);
      if (wonLeads) {
        winningLeadIds = wonLeads.map((l: any) => l.id);
      }
    } catch (e) {}

    // Check if remarks contains winning closure data for this vendor
    try {
      const { data: remarksWonLeads } = await supabase
        .from('leads')
        .select('id')
        .ilike('remarks', `%"winning_vendor_id":"${vendorId}"%`);
      if (remarksWonLeads) {
        for (const r of remarksWonLeads) {
          if (!winningLeadIds.includes(r.id)) {
            winningLeadIds.push(r.id);
          }
        }
      }
    } catch (e) {}

    const allAssignedOrWonIds = Array.from(new Set([...assignedLeadIds, ...winningLeadIds]));
    const targetLeadIds = filter === 'won' ? winningLeadIds : allAssignedOrWonIds;

    if (targetLeadIds.length === 0) {
      // Check fallback in remarks
      let fallbackQuery = supabase
        .from('leads')
        .select(`
          id,
          lead_number,
          lead_name,
          customer_name,
          product_item,
          quantity,
          status,
          remarks,
          specifications,
          winning_vendor_id,
          winning_amount,
          closure_outcome,
          loss_reason,
          closure_items,
          created_at,
          categories ( id, name )
        `, { count: 'exact' })
        .ilike('remarks', `%${vendorId}%`)
        .order('created_at', { ascending: false });

      if (filter === 'won') {
        fallbackQuery = fallbackQuery.or(`winning_vendor_id.eq.${vendorId},closure_outcome.eq.win`);
      }

      const from = Math.max(0, (page - 1) * pageSize);
      const to = from + pageSize - 1;
      fallbackQuery = fallbackQuery.range(from, to);

      const { data: fbData, count: fbCount } = await fallbackQuery;
      const enriched = await enrichLeadsWithWinningVendor(supabase, fbData || []);
      const totalCount = fbCount ?? 0;
      const hasMore = to < totalCount - 1;

      return {
        success: true,
        rfqs: enriched,
        totalCount,
        hasMore,
        page,
        pageSize,
        wonCount: winningLeadIds.length,
        allCount: allAssignedOrWonIds.length,
      };
    }

    const from = Math.max(0, (page - 1) * pageSize);
    const to = from + pageSize - 1;

    let query = supabase
      .from('leads')
      .select(`
        id,
        lead_number,
        lead_name,
        customer_name,
        product_item,
        quantity,
        status,
        remarks,
        specifications,
        winning_vendor_id,
        winning_amount,
        closure_outcome,
        loss_reason,
        closure_items,
        created_at,
        categories ( id, name )
      `, { count: 'exact' })
      .in('id', targetLeadIds)
      .order('created_at', { ascending: false })
      .range(from, to);

    const { data, count, error } = await query;
    if (error) {
      const { data: fallbackLeads, count: fbCount, error: fbError } = await supabase
        .from('leads')
        .select(`
          id,
          lead_number,
          lead_name,
          customer_name,
          product_item,
          quantity,
          status,
          remarks,
          specifications,
          created_at,
          categories ( id, name )
        `, { count: 'exact' })
        .in('id', targetLeadIds)
        .order('created_at', { ascending: false })
        .range(from, to);

      if (fbError) throw fbError;
      const enriched = await enrichLeadsWithWinningVendor(supabase, fallbackLeads || []);
      const totalCount = fbCount ?? targetLeadIds.length;
      const hasMore = to < totalCount - 1;

      return {
        success: true,
        rfqs: enriched,
        totalCount,
        hasMore,
        page,
        pageSize,
        wonCount: winningLeadIds.length,
        allCount: allAssignedOrWonIds.length,
      };
    }

    const enriched = await enrichLeadsWithWinningVendor(supabase, data || []);
    const totalCount = count ?? targetLeadIds.length;
    const hasMore = to < totalCount - 1;

    return {
      success: true,
      rfqs: enriched,
      totalCount,
      hasMore,
      page,
      pageSize,
      wonCount: winningLeadIds.length,
      allCount: allAssignedOrWonIds.length,
    };
  } catch (error: any) {
    console.error('Error fetching paginated vendor RFQs:', error);
    return {
      success: false,
      error: error.message || 'Failed to fetch vendor RFQs',
      rfqs: [],
      totalCount: 0,
      hasMore: false,
      page,
      pageSize,
      wonCount: 0,
      allCount: 0,
    };
  }
}

export async function getVendorRfqs(vendorId: string) {
  try {
    const supabase = createAdminClient();

    // 1. Fetch assigned lead IDs from lead_vendors
    const { data: leadVendors, error: lvError } = await supabase
      .from('lead_vendors')
      .select('lead_id, email_sent, whatsapp_prepared, created_at')
      .eq('vendor_id', vendorId);

    if (lvError) throw lvError;

    const leadIdsFromLv = (leadVendors || []).map((lv: any) => lv.lead_id);

    // 2. Fetch leads where winning_vendor_id = vendorId
    let winningLeadIds: string[] = [];
    try {
      const { data: wonLeads } = await supabase
        .from('leads')
        .select('id')
        .eq('winning_vendor_id', vendorId);
      if (wonLeads) {
        winningLeadIds = wonLeads.map((l: any) => l.id);
      }
    } catch (e) {
      // Column may not exist on remote schema yet
    }

    const allLeadIds = Array.from(new Set([...leadIdsFromLv, ...winningLeadIds]));

    if (allLeadIds.length === 0) {
      // Also check fallback in remarks
      const { data: fallbackLeads } = await supabase
        .from('leads')
        .select(`
          id,
          lead_number,
          lead_name,
          customer_name,
          product_item,
          quantity,
          status,
          remarks,
          specifications,
          winning_vendor_id,
          winning_amount,
          created_at,
          categories (
            id,
            name
          )
        `)
        .ilike('remarks', `%${vendorId}%`);

      if (fallbackLeads && fallbackLeads.length > 0) {
        const enriched = await enrichLeadsWithWinningVendor(supabase, fallbackLeads);
        return { success: true, rfqs: enriched };
      }

      return { success: true, rfqs: [] };
    }

    // 3. Fetch full lead details
    const { data: leads, error: leadsError } = await supabase
      .from('leads')
      .select(`
        id,
        lead_number,
        lead_name,
        customer_name,
        product_item,
        quantity,
        status,
        remarks,
        specifications,
        winning_vendor_id,
        winning_amount,
        closure_outcome,
        loss_reason,
        closure_items,
        created_at,
        categories (
          id,
          name
        )
      `)
      .in('id', allLeadIds)
      .order('created_at', { ascending: false });

    if (leadsError) {
      const { data: fallbackLeads, error: fbError } = await supabase
        .from('leads')
        .select(`
          id,
          lead_number,
          lead_name,
          customer_name,
          product_item,
          quantity,
          status,
          remarks,
          specifications,
          created_at,
          categories (
            id,
            name
          )
        `)
        .in('id', allLeadIds)
        .order('created_at', { ascending: false });

      if (fbError) throw fbError;
      const enriched = await enrichLeadsWithWinningVendor(supabase, fallbackLeads || []);
      return { success: true, rfqs: enriched };
    }

    const enriched = await enrichLeadsWithWinningVendor(supabase, leads || []);
    return { success: true, rfqs: enriched };
  } catch (error: any) {
    console.error('Error fetching vendor RFQs:', error);
    return { success: false, error: error.message || 'Failed to fetch vendor RFQs', rfqs: [] };
  }
}
