'use server';

import { createAdminClient } from '@/lib/supabase/admin';
import { generateLeadNumber } from '@/lib/utils';
import { revalidatePath } from 'next/cache';
import { formatReadableSpecifications, cleanProductTitle, parseLineItemsFromLead, cleanSpecifications, generateRfqEmailHtml } from '@/lib/leadUtils';
import { getSystemSettings } from '@/actions/settings';
import { ensureLeadRfqPdfInSupabase } from '@/actions/rfqPdf';
import nodemailer from 'nodemailer';

export interface LeadInput {
  customer_name: string;
  lead_name: string;
  product_item: string;
  quantity: number;
  specifications?: string;
  category_id?: string;
  unit_price_estimate?: number;
  expected_credit?: string;
  remarks?: string;
  winning_vendor_id?: string | null;
  winning_amount?: number | null;
  closure_notes?: string | null;
  closed_at?: string | null;
  status?: 'draft' | 'ready_to_send' | 'sent' | 'quoted' | 'completed' | 'cancelled';
}

export async function enrichLeadsWithWinningVendor(supabase: any, leads: any[]) {
  if (!leads || leads.length === 0) return leads;

  // Extract closure metadata from remarks if native columns are empty
  const parsedLeads = leads.map((lead) => {
    let updatedLead = { ...lead };
    const rawText = lead.remarks || lead.specifications || '';
    if (typeof rawText === 'string' && rawText.includes('[[CLOSURE_DATA:')) {
      try {
        const match = rawText.match(/\[\[CLOSURE_DATA:([\s\S]*?)\]\]/);
        if (match && match[1]) {
          const closureObj = JSON.parse(match[1]);
          if (!updatedLead.winning_vendor_id && closureObj.winning_vendor_id) {
            updatedLead.winning_vendor_id = closureObj.winning_vendor_id;
          }
          if (updatedLead.winning_amount == null && closureObj.winning_amount != null) {
            updatedLead.winning_amount = closureObj.winning_amount;
          }
          if (!updatedLead.closure_notes && closureObj.closure_notes) {
            updatedLead.closure_notes = closureObj.closure_notes;
          }
          if (!updatedLead.closed_at && closureObj.closed_at) {
            updatedLead.closed_at = closureObj.closed_at;
          }
          if (!updatedLead.closure_outcome && closureObj.closure_outcome) {
            updatedLead.closure_outcome = closureObj.closure_outcome;
          }
          if (!updatedLead.loss_reason && closureObj.loss_reason) {
            updatedLead.loss_reason = closureObj.loss_reason;
          }
          if (!updatedLead.closure_items && closureObj.closure_items) {
            updatedLead.closure_items = closureObj.closure_items;
          }
        }
      } catch (err) {
        console.error('Failed to parse CLOSURE_DATA from remarks:', err);
      }
    }

    if (updatedLead.remarks) {
      updatedLead.remarks = cleanSpecifications(updatedLead.remarks);
    }

    return updatedLead;
  });

  const missingVendorIds = Array.from(
    new Set(
      parsedLeads
        .filter((l) => l.winning_vendor_id && !l.winning_vendor)
        .map((l) => l.winning_vendor_id)
    )
  );

  const vendorMap = new Map<string, any>();

  for (const lead of parsedLeads) {
    if (lead.lead_vendors && Array.isArray(lead.lead_vendors)) {
      for (const lv of lead.lead_vendors) {
        if (lv.vendors && lv.vendors.id) {
          vendorMap.set(lv.vendors.id, lv.vendors);
        }
      }
    }
  }

  const fetchIds = missingVendorIds.filter((id) => !vendorMap.has(id));

  if (fetchIds.length > 0) {
    try {
      const { data: vendorsData } = await supabase
        .from('vendors')
        .select('id, company_name, contact_person, email, whatsapp_number, status')
        .in('id', fetchIds);

      if (vendorsData) {
        for (const v of vendorsData) {
          vendorMap.set(v.id, v);
        }
      }
    } catch (e) {
      console.error('Error fetching missing winning vendors:', e);
    }
  }

  return parsedLeads.map((lead) => {
    if (!lead.winning_vendor && lead.winning_vendor_id) {
      return {
        ...lead,
        winning_vendor: vendorMap.get(lead.winning_vendor_id) || null,
      };
    }
    return lead;
  });
}

export interface GetLeadsPaginatedParams {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: string;
  categoryId?: string;
}

export async function getLeadsPaginated({
  page = 1,
  pageSize = 15,
  search,
  status,
  categoryId,
}: GetLeadsPaginatedParams = {}) {
  try {
    const supabase = createAdminClient();

    const from = Math.max(0, (page - 1) * pageSize);
    const to = from + pageSize - 1;

    let query = supabase
      .from('leads')
      .select(`
        *,
        categories ( id, name ),
        lead_attachments ( id, file_name, file_path, file_size, file_type, created_at ),
        lead_vendors (
          id,
          vendor_id,
          email_sent,
          email_sent_at,
          whatsapp_prepared,
          whatsapp_prepared_at,
          vendors (
            id,
            company_name,
            contact_person,
            email,
            whatsapp_number,
            status
          )
        )
      `, { count: 'exact' })
      .order('created_at', { ascending: false });

    if (status && status !== 'all') {
      if (status === 'completed') {
        query = query.or('status.eq.completed,closure_outcome.eq.win,status.eq.won');
      } else if (status === 'cancelled') {
        query = query.or('status.eq.cancelled,closure_outcome.eq.lost,status.eq.lost');
      } else {
        query = query.eq('status', status);
      }
    }

    if (categoryId && categoryId !== 'all') {
      query = query.eq('category_id', categoryId);
    }

    if (search && search.trim()) {
      const s = `%${search.trim()}%`;
      query = query.or(`lead_number.ilike.${s},customer_name.ilike.${s},lead_name.ilike.${s},product_item.ilike.${s},expected_credit.ilike.${s}`);
    }

    query = query.range(from, to);

    const { data, count, error } = await query;
    if (error) throw error;

    const enrichedLeads = await enrichLeadsWithWinningVendor(supabase, data || []);
    const totalCount = count ?? 0;
    const hasMore = to < totalCount - 1;

    return {
      success: true,
      leads: enrichedLeads,
      totalCount,
      hasMore,
      page,
      pageSize,
    };
  } catch (error: any) {
    console.error('Error fetching paginated leads:', error);
    return {
      success: false,
      error: error.message || 'Failed to fetch leads',
      leads: [],
      totalCount: 0,
      hasMore: false,
      page,
      pageSize,
    };
  }
}

export async function getLeads(filters?: { search?: string; status?: string; categoryId?: string }) {
  try {
    const supabase = createAdminClient();

    let query = supabase
      .from('leads')
      .select(`
        *,
        categories ( id, name ),
        lead_attachments ( id, file_name, file_path, file_size, file_type, created_at ),
        lead_vendors (
          id,
          vendor_id,
          email_sent,
          email_sent_at,
          whatsapp_prepared,
          whatsapp_prepared_at,
          vendors (
            id,
            company_name,
            contact_person,
            email,
            whatsapp_number,
            status
          )
        )
      `)
      .order('created_at', { ascending: false });

    if (filters?.status && filters.status !== 'all') {
      query = query.eq('status', filters.status);
    }

    if (filters?.categoryId && filters.categoryId !== 'all') {
      query = query.eq('category_id', filters.categoryId);
    }

    if (filters?.search && filters.search.trim()) {
      const s = `%${filters.search.trim()}%`;
      query = query.or(`lead_number.ilike.${s},customer_name.ilike.${s},lead_name.ilike.${s},product_item.ilike.${s},expected_credit.ilike.${s}`);
    }

    const { data, error } = await query;
    if (error) throw error;

    const enrichedLeads = await enrichLeadsWithWinningVendor(supabase, data || []);

    return { success: true, leads: enrichedLeads };
  } catch (error: any) {
    console.error('Error fetching leads:', error);
    return { success: false, error: error.message || 'Failed to fetch leads', leads: [] };
  }
}

export async function getLeadById(id: string) {
  try {
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from('leads')
      .select(`
        *,
        categories ( id, name ),
        lead_attachments ( id, file_name, file_path, file_size, file_type, created_at ),
        lead_vendors (
          id,
          vendor_id,
          email_sent,
          email_sent_at,
          whatsapp_prepared,
          whatsapp_prepared_at,
          vendors (
            id,
            company_name,
            contact_person,
            email,
            whatsapp_number,
            status,
            address,
            gst_number
          )
        )
      `)
      .eq('id', id)
      .single();

    if (error) throw error;

    const [enrichedLead] = await enrichLeadsWithWinningVendor(supabase, [data]);

    return { success: true, lead: enrichedLead };
  } catch (error: any) {
    console.error('Error fetching lead details:', error);
    return { success: false, error: error.message || 'Lead not found', lead: null };
  }
}

export async function createLead(data: LeadInput) {
  try {
    if (!data.customer_name?.trim() || !data.lead_name?.trim() || !data.product_item?.trim() || !data.quantity) {
      return { success: false, error: 'Customer Name, Lead/PO Name, Product/Item, and Quantity are required.' };
    }

    const supabase = createAdminClient();
    const lead_number = generateLeadNumber();

    const { data: lead, error } = await supabase
      .from('leads')
      .insert({
        lead_number,
        customer_name: data.customer_name.trim(),
        lead_name: data.lead_name.trim(),
        product_item: data.product_item.trim(),
        quantity: Number(data.quantity) || 1,
        specifications: data.specifications?.trim() || null,
        category_id: data.category_id || null,
        unit_price_estimate: data.unit_price_estimate != null ? Number(data.unit_price_estimate) : null,
        expected_credit: data.expected_credit?.trim() || null,
        remarks: data.remarks?.trim() || null,
        status: data.status || 'draft',
      })
      .select()
      .single();

    if (error) throw error;

    // Auto-assign ALL active vendors belonging to the selected category
    if (lead && lead.category_id) {
      const { data: catVendors } = await supabase
        .from('vendor_categories')
        .select('vendor_id, vendors!inner(id, status)')
        .eq('category_id', lead.category_id)
        .eq('vendors.status', 'active');

      if (catVendors && catVendors.length > 0) {
        const rows = catVendors.map((cv: any) => ({
          lead_id: lead.id,
          vendor_id: cv.vendor_id,
          email_sent: false,
          whatsapp_prepared: false,
        }));
        await supabase.from('lead_vendors').insert(rows);
      }
    }

    revalidatePath('/dashboard/leads');
    revalidatePath('/dashboard');
    return { success: true, lead };
  } catch (error: any) {
    console.error('Error creating lead:', error);
    return { success: false, error: error.message || 'Failed to create lead' };
  }
}

export async function updateLead(id: string, data: Partial<LeadInput>) {
  try {
    const supabase = createAdminClient();

    const payload: any = {};
    if (data.customer_name !== undefined) payload.customer_name = data.customer_name.trim();
    if (data.lead_name !== undefined) payload.lead_name = data.lead_name.trim();
    if (data.product_item !== undefined) payload.product_item = data.product_item.trim();
    if (data.quantity !== undefined) payload.quantity = Number(data.quantity);
    if (data.specifications !== undefined) payload.specifications = data.specifications?.trim() || null;
    if (data.category_id !== undefined) payload.category_id = data.category_id || null;
    if (data.unit_price_estimate !== undefined) payload.unit_price_estimate = data.unit_price_estimate != null ? Number(data.unit_price_estimate) : null;
    if (data.expected_credit !== undefined) payload.expected_credit = data.expected_credit?.trim() || null;
    if (data.remarks !== undefined) payload.remarks = data.remarks?.trim() || null;
    if (data.winning_vendor_id !== undefined) payload.winning_vendor_id = data.winning_vendor_id || null;
    if (data.winning_amount !== undefined) payload.winning_amount = data.winning_amount != null ? Number(data.winning_amount) : null;
    if (data.closure_notes !== undefined) payload.closure_notes = data.closure_notes?.trim() || null;
    if (data.closed_at !== undefined) payload.closed_at = data.closed_at || null;
    if (data.status !== undefined) payload.status = data.status;

    const { data: updated, error } = await supabase
      .from('leads')
      .update(payload)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    revalidatePath('/dashboard/leads');
    revalidatePath(`/dashboard/leads/${id}`);
    revalidatePath('/dashboard');
    return { success: true, lead: updated };
  } catch (error: any) {
    console.error('Error updating lead:', error);
    return { success: false, error: error.message || 'Failed to update lead' };
  }
}

export async function closeAndAwardRfq(params: {
  leadId: string;
  outcome: 'win' | 'lost';
  winningVendorId?: string | null;
  winningAmount?: number | null;
  closureNotes?: string | null;
  lossReason?: string | null;
  itemPricing?: Array<{ id: string; winning_unit_price: number; winning_total: number }>;
  status?: string;
}) {
  try {
    const { leadId, outcome, winningVendorId, winningAmount, closureNotes, lossReason, itemPricing } = params;
    const supabase = createAdminClient();

    const closedAtStr = new Date().toISOString();
    const finalStatus = params.status || (outcome === 'win' ? 'completed' : 'cancelled');

    const fullPayload: any = {
      status: finalStatus,
      closed_at: closedAtStr,
      closure_outcome: outcome,
      winning_vendor_id: outcome === 'win' ? (winningVendorId || null) : null,
      winning_amount: outcome === 'win' && winningAmount != null ? Number(winningAmount) : null,
      closure_notes: closureNotes?.trim() || null,
      loss_reason: outcome === 'lost' ? (lossReason?.trim() || 'Requirement Dropped') : null,
      closure_items: outcome === 'win' ? (itemPricing || null) : null,
    };

    // 1. First, attempt native column update
    let res = await supabase
      .from('leads')
      .update(fullPayload)
      .eq('id', leadId)
      .select()
      .single();

    // 2. Fallback: If PostgREST schema cache error indicates missing columns, store CLOSURE_DATA JSON in remarks
    if (res.error) {
      console.warn('Native update failed (likely missing schema columns), using fallback remarks payload:', res.error.message);

      const { data: existingLead } = await supabase
        .from('leads')
        .select('remarks, specifications')
        .eq('id', leadId)
        .single();

      let currentRemarks = existingLead?.remarks || existingLead?.specifications || '';
      // Strip out any existing CLOSURE_DATA block
      currentRemarks = currentRemarks.replace(/\[\[CLOSURE_DATA:[\s\S]*?\]\]/g, '').trim();

      const closureDataJson = JSON.stringify({
        closure_outcome: outcome,
        winning_vendor_id: outcome === 'win' ? (winningVendorId || null) : null,
        winning_amount: outcome === 'win' && winningAmount != null ? Number(winningAmount) : null,
        closure_notes: closureNotes?.trim() || null,
        loss_reason: outcome === 'lost' ? (lossReason?.trim() || 'Requirement Dropped') : null,
        closure_items: outcome === 'win' ? (itemPricing || null) : null,
        closed_at: closedAtStr,
      });

      const updatedRemarks = `${currentRemarks}\n\n[[CLOSURE_DATA:${closureDataJson}]]`.trim();

      res = await supabase
        .from('leads')
        .update({
          status: finalStatus,
          remarks: updatedRemarks,
        })
        .eq('id', leadId)
        .select()
        .single();
    }

    if (res.error) throw res.error;

    // Enrich lead with winning vendor object before returning
    const [enriched] = await enrichLeadsWithWinningVendor(supabase, [res.data]);

    revalidatePath(`/dashboard/leads/${leadId}`);
    revalidatePath('/dashboard/leads');
    revalidatePath('/dashboard');
    revalidatePath('/dashboard/vendors');

    return { success: true, lead: enriched };
  } catch (error: any) {
    console.error('Error closing RFQ:', error);
    return { success: false, error: error.message || 'Failed to close RFQ' };
  }
}

export async function reopenLead(leadId: string) {
  try {
    const supabase = createAdminClient();

    // Fetch existing remarks to clean up any CLOSURE_DATA fallback
    const { data: existingLead } = await supabase
      .from('leads')
      .select('remarks')
      .eq('id', leadId)
      .single();

    let cleanRemarks = existingLead?.remarks || '';
    cleanRemarks = cleanRemarks.replace(/\[\[CLOSURE_DATA:[\s\S]*?\]\]/g, '').trim();

    let res = await supabase
      .from('leads')
      .update({
        status: 'draft',
        closed_at: null,
        closure_outcome: null,
        winning_vendor_id: null,
        winning_amount: null,
        closure_notes: null,
        loss_reason: null,
        closure_items: null,
        remarks: cleanRemarks,
      })
      .eq('id', leadId)
      .select()
      .single();

    if (res.error) {
      res = await supabase
        .from('leads')
        .update({
          status: 'draft',
          remarks: cleanRemarks,
        })
        .eq('id', leadId)
        .select()
        .single();
    }

    if (res.error) throw res.error;

    revalidatePath(`/dashboard/leads/${leadId}`);
    revalidatePath('/dashboard/leads');
    revalidatePath('/dashboard');
    revalidatePath('/dashboard/vendors');

    return { success: true, lead: res.data };
  } catch (error: any) {
    console.error('Error reopening RFQ:', error);
    return { success: false, error: error.message || 'Failed to reopen RFQ' };
  }
}

export async function deleteLead(id: string) {
  try {
    const supabase = createAdminClient();

    // Fetch attachments to remove files from storage
    const { data: attachments } = await supabase
      .from('lead_attachments')
      .select('file_path')
      .eq('lead_id', id);

    if (attachments && attachments.length > 0) {
      const paths = attachments.map((a) => a.file_path);
      await supabase.storage.from('lead-attachments').remove(paths);
    }

    // Delete associated relations
    await supabase.from('lead_attachments').delete().eq('lead_id', id);
    await supabase.from('lead_vendors').delete().eq('lead_id', id);
    await supabase.from('message_logs').delete().eq('lead_id', id);

    const { error } = await supabase.from('leads').delete().eq('id', id);

    if (error) throw error;

    revalidatePath('/dashboard/leads');
    revalidatePath('/dashboard');
    return { success: true };
  } catch (error: any) {
    console.error('Error deleting lead:', error);
    return { success: false, error: error.message || 'Failed to delete lead' };
  }
}

export interface AttachmentPayload {
  leadId: string;
  fileName: string;
  fileType: string;
  fileSize?: number;
  base64Data: string;
}

export async function uploadLeadAttachment(
  leadIdOrPayload: string | AttachmentPayload,
  optionalFormData?: FormData
) {
  try {
    const supabase = createAdminClient();

    let leadId: string;
    let fileName: string;
    let fileType: string;
    let fileSize: number;
    let buffer: Buffer;

    if (typeof leadIdOrPayload === 'object' && leadIdOrPayload !== null) {
      leadId = leadIdOrPayload.leadId;
      fileName = leadIdOrPayload.fileName;
      fileType = leadIdOrPayload.fileType || 'application/octet-stream';
      fileSize = leadIdOrPayload.fileSize || 0;
      buffer = Buffer.from(leadIdOrPayload.base64Data, 'base64');
    } else {
      leadId = leadIdOrPayload;
      const file = optionalFormData?.get('file') as File;
      if (!file) {
        return { success: false, error: 'No file provided in form data' };
      }
      fileName = file.name;
      fileType = file.type || 'application/octet-stream';
      fileSize = file.size;
      buffer = Buffer.from(await file.arrayBuffer());
    }

    if (!leadId || !fileName || !buffer || buffer.length === 0) {
      return { success: false, error: 'Invalid file payload provided.' };
    }

    // Security Check 1: 15MB File Size Limit
    const MAX_FILE_SIZE_BYTES = 15 * 1024 * 1024;
    if (buffer.length > MAX_FILE_SIZE_BYTES || (fileSize && fileSize > MAX_FILE_SIZE_BYTES)) {
      return { success: false, error: 'File size exceeds maximum allowed limit of 15MB.' };
    }

    // Security Check 2: Block Dangerous Executable File Extensions
    const extMatch = fileName.match(/\.([a-zA-Z0-9]+)$/);
    const fileExt = extMatch ? extMatch[1].toLowerCase() : '';
    const BANNED_EXTENSIONS = [
      'exe', 'dll', 'bat', 'cmd', 'sh', 'php', 'js', 'vbs',
      'ps1', 'html', 'htm', 'jar', 'asp', 'aspx', 'cgi', 'py', 'pl'
    ];

    if (BANNED_EXTENSIONS.includes(fileExt)) {
      return { success: false, error: `Executable or script files (.${fileExt}) are blocked for system security.` };
    }

    const cleanFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
    const storagePath = `${leadId}/${Date.now()}_${cleanFileName}`;

    const { error: uploadErr } = await supabase.storage
      .from('lead-attachments')
      .upload(storagePath, buffer, {
        contentType: fileType,
        upsert: true,
      });

    if (uploadErr) {
      console.error('Supabase Storage upload error:', uploadErr);
      throw uploadErr;
    }

    const { data: attachment, error: dbErr } = await supabase
      .from('lead_attachments')
      .insert({
        lead_id: leadId,
        file_name: fileName,
        file_path: storagePath,
        file_size: fileSize || buffer.length,
        file_type: fileType,
      })
      .select()
      .single();

    if (dbErr) {
      console.error('Supabase DB attachment insert error:', dbErr);
      throw dbErr;
    }

    revalidatePath(`/dashboard/leads/${leadId}`);
    return { success: true, attachment };
  } catch (error: any) {
    console.error('Error uploading attachment:', error);
    return { success: false, error: error.message || 'Failed to upload attachment' };
  }
}

export async function deleteLeadAttachment(attachmentId: string, filePath: string, leadId: string) {
  try {
    const supabase = createAdminClient();

    await supabase.storage.from('lead-attachments').remove([filePath]);
    const { error } = await supabase.from('lead_attachments').delete().eq('id', attachmentId);

    if (error) throw error;

    revalidatePath(`/dashboard/leads/${leadId}`);
    return { success: true };
  } catch (error: any) {
    console.error('Error deleting attachment:', error);
    return { success: false, error: error.message || 'Failed to delete attachment' };
  }
}

export async function assignVendorsToLead(leadId: string, vendorIds: string[]) {
  try {
    const supabase = createAdminClient();

    // Verify vendor IDs belong to ACTIVE vendors
    const { data: activeVendors, error: activeErr } = await supabase
      .from('vendors')
      .select('id, status')
      .in('id', vendorIds)
      .eq('status', 'active');

    if (activeErr) throw activeErr;

    const validActiveIds = (activeVendors || []).map((v) => v.id);

    if (validActiveIds.length !== vendorIds.length) {
      return { success: false, error: 'One or more selected vendors are inactive. Only active vendors can be assigned.' };
    }

    // Delete existing lead_vendors that are no longer selected
    const { data: existing } = await supabase.from('lead_vendors').select('vendor_id').eq('lead_id', leadId);
    const existingIds = (existing || []).map((e) => e.vendor_id);

    const toDelete = existingIds.filter((id) => !validActiveIds.includes(id));
    if (toDelete.length > 0) {
      await supabase.from('lead_vendors').delete().eq('lead_id', leadId).in('vendor_id', toDelete);
    }

    const toInsert = validActiveIds.filter((id) => !existingIds.includes(id));
    if (toInsert.length > 0) {
      const rows = toInsert.map((vId) => ({
        lead_id: leadId,
        vendor_id: vId,
      }));
      await supabase.from('lead_vendors').insert(rows);
    }

    // Update lead status to ready_to_send if draft
    await supabase.from('leads').update({ status: 'ready_to_send' }).eq('id', leadId).eq('status', 'draft');

    revalidatePath(`/dashboard/leads/${leadId}`);
    revalidatePath('/dashboard/leads');
    return { success: true };
  } catch (error: any) {
    console.error('Error assigning vendors to lead:', error);
    return { success: false, error: error.message || 'Failed to assign vendors' };
  }
}

export async function sendLeadToVendors(leadId: string, vendorIds: string[]) {
  try {
    const supabase = createAdminClient();

    const { data: lead, error: leadErr } = await supabase
      .from('leads')
      .select(`
        *,
        categories ( name ),
        lead_attachments ( id, file_name, file_path )
      `)
      .eq('id', leadId)
      .single();

    if (leadErr || !lead) throw new Error('Lead not found');

    const { data: vendors, error: vendorErr } = await supabase
      .from('vendors')
      .select('*')
      .in('id', vendorIds)
      .eq('status', 'active');

    if (vendorErr || !vendors || vendors.length === 0) {
      throw new Error('No active vendors selected for sending quotation request');
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';

    // Ensure fresh RFQ PDF is generated and synced to Supabase Storage
    const rfqPdfRes = await ensureLeadRfqPdfInSupabase(leadId);
    const rfqPdfBuffer = rfqPdfRes.success ? rfqPdfRes.buffer : null;
    const rfqFileName = (rfqPdfRes.success && rfqPdfRes.fileName) ? rfqPdfRes.fileName : `RFQ_${lead.lead_name || lead.lead_number}.pdf`;

    // Fetch system settings for company branding & SMTP configuration
    const settingsRes = await getSystemSettings();
    const settings = settingsRes.settings;

    const poReference = lead.lead_name?.trim() || lead.lead_number || 'N/A';
    const createdDate = lead.created_at
      ? new Date(lead.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
      : new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    const categoryName = lead.categories?.name || 'General Procurement';
    const companyName = settings?.company_name || 'TECHNOSPHERE BUSINESS SOLUTIONS';
    const rawAddress = settings?.office_address || (settings as any)?.company_address || '';
    const companyAddress = rawAddress ? rawAddress.replace(/\r?\n+/g, ', ').replace(/\s+,/g, ',').replace(/,\s*,/g, ',').trim() : '';
    const companyEmail = settings?.official_email || 'sales@technosphere.in';
    const companyPhone = settings?.phone_number || (settings as any)?.official_phone || '+91 98765 43210';

    const lineItems = parseLineItemsFromLead(lead);
    const itemsFormattedEmail = lineItems
      .map((item, idx) => {
        const qty = Number(item.quantity) || 1;
        const title = cleanProductTitle(item.product_item) || 'Item Requirement';
        let spec = item.specifications?.trim() || '';
        if (!spec && lineItems.length === 1 && lead.specifications) {
          spec = cleanSpecifications(lead.specifications);
        }
        let line = `#${idx + 1}. ${title}\n   Quantity: ${qty} unit${qty > 1 ? 's' : ''}`;
        if (spec) {
          line += `\n   Technical Specifications:\n   ${spec.split('\n').join('\n   ')}`;
        }
        return line;
      })
      .join('\n\n');

    const expectedCredit = lead.expected_credit?.trim() || '';
    const generalRemarks = cleanSpecifications(lead.remarks);

    const otherAttachmentLinks = (lead.lead_attachments || [])
      .filter((att: any) => !att.file_name?.startsWith('RFQ_'))
      .map((att: any) => `- ${att.file_name}: ${supabaseUrl}/storage/v1/object/public/lead-attachments/${att.file_path}`)
      .join('\n');

    const emailSubject = `Quotation Request: ${poReference} - ${cleanProductTitle(lead.product_item)}`;

    let transporter: nodemailer.Transporter | null = null;
    if (settings?.smtp_host?.trim() && settings?.smtp_user?.trim()) {
      transporter = nodemailer.createTransport({
        host: settings.smtp_host.trim(),
        port: Number(settings.smtp_port) || 587,
        secure: Boolean(settings.smtp_secure),
        auth: {
          user: settings.smtp_user.trim(),
          pass: settings.smtp_pass || '',
        },
        connectionTimeout: 10000,
      });
    }

    const fromAddress = settings?.smtp_from_email || settings?.official_email || 'sales@technosphere.in';
    const fromName = settings?.smtp_from_name || 'TechnoSphere Procurement';

    let successCount = 0;
    let failedCount = 0;
    const errors: string[] = [];

    // Construct Mail Attachments array (Direct file attachment, NO URL in email body)
    const mailAttachments: any[] = [];
    if (rfqPdfBuffer) {
      mailAttachments.push({
        filename: rfqFileName,
        content: rfqPdfBuffer,
        contentType: 'application/pdf',
      });
    }

    for (const vendor of vendors) {
      const emailBody = `Dear ${vendor.contact_person || vendor.company_name},

We request your official quotation for the following requirement:

=========================================================
REQUEST FOR QUOTATION
=========================================================
Date Issued: ${createdDate}
PR Reference No: ${poReference}
Category: ${categoryName}

RFQ REQUESTED BY:
Purchase Team
${companyName}
${companyAddress}
Email: ${companyEmail} | Phone: ${companyPhone}

=========================================================
BILLS OF MATERIAL
=========================================================
${itemsFormattedEmail}

${expectedCredit ? `=========================================================\nEXPECTED CREDIT TERMS\n=========================================================\n${expectedCredit}\n\n` : ''}${generalRemarks ? `=========================================================\nGENERAL REMARKS & TERMS\n=========================================================\n${generalRemarks}\n\n` : ''}=========================================================
QUOTATION SUBMISSION GUIDELINES
=========================================================
1. Please submit net unit pricing.
2. Indicate stock availability and dispatch timeline.
3. Quotations should remain valid for a minimum of 15 days from submission.

${otherAttachmentLinks ? `Other Attached Files:\n${otherAttachmentLinks}\n\n` : ''}Please find attached the official Request for Quotation (RFQ) PDF document for your records. Submit your quotation with best pricing and lead time at your earliest convenience.

Best regards,
${fromName}
${companyName}
`;

      const emailHtml = generateRfqEmailHtml({
        lead,
        vendor,
        settings,
        supabaseUrl,
        rfqFileName,
      });

      let mailStatus: 'sent' | 'failed' = 'sent';
      let mailErrorMsg: string | null = null;

      if (transporter) {
        try {
          await transporter.sendMail({
            from: `"${fromName}" <${fromAddress}>`,
            to: vendor.email || '',
            subject: emailSubject,
            text: emailBody,
            html: emailHtml,
            attachments: mailAttachments,
          });
          successCount++;
        } catch (err: any) {
          mailStatus = 'failed';
          mailErrorMsg = err.message || 'SMTP delivery failed';
          failedCount++;
          errors.push(`${vendor.company_name}: ${mailErrorMsg}`);
        }
      } else {
        // No SMTP configured yet - record log as prepared/sent draft
        successCount++;
      }

      // Log email message in database
      const { error: logErr } = await supabase
        .from('message_logs')
        .insert({
          lead_id: leadId,
          vendor_id: vendor.id,
          channel: 'email',
          recipient: vendor.email,
          subject: emailSubject,
          content: emailBody,
          status: mailStatus,
          error_message: mailErrorMsg,
        });

      if (logErr) console.error('Message log error:', logErr);

      if (mailStatus === 'sent') {
        await supabase
          .from('lead_vendors')
          .update({
            email_sent: true,
            email_sent_at: new Date().toISOString(),
          })
          .eq('lead_id', leadId)
          .eq('vendor_id', vendor.id);
      }
    }

    // Update overall lead status to 'sent' if at least one email was processed
    if (successCount > 0) {
      await supabase.from('leads').update({ status: 'sent' }).eq('id', leadId);
    }

    revalidatePath(`/dashboard/leads/${leadId}`);
    revalidatePath('/dashboard/leads');

    if (failedCount > 0 && successCount === 0) {
      return { success: false, error: `SMTP Delivery Failed: ${errors.join('; ')}` };
    }

    return {
      success: true,
      count: successCount,
      warning: errors.length > 0 ? `Some emails failed: ${errors.join('; ')}` : undefined,
    };
  } catch (error: any) {
    console.error('Error sending lead to vendors:', error);
    return { success: false, error: error.message || 'Failed to send lead to vendors' };
  }
}

export async function prepareWhatsAppMessage(leadId: string, vendorId: string) {
  try {
    const supabase = createAdminClient();

    const { data: lead, error: leadErr } = await supabase
      .from('leads')
      .select('*, categories ( name )')
      .eq('id', leadId)
      .single();

    if (leadErr || !lead) throw new Error('Lead not found');

    const { data: vendor, error: vendorErr } = await supabase
      .from('vendors')
      .select('*')
      .eq('id', vendorId)
      .single();

    if (vendorErr || !vendor) throw new Error('Vendor not found');

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';

    // Ensure fresh RFQ PDF is generated & stored in Supabase Storage
    const rfqPdfRes = await ensureLeadRfqPdfInSupabase(leadId);
    const rfqPdfPublicUrl = rfqPdfRes.success ? rfqPdfRes.publicUrl : null;

    const poReference = lead.lead_name?.trim() || lead.lead_number || 'N/A';
    
    // Format date as DD-MMM-YYYY (e.g. 31-JUL-2026)
    const d = lead.created_at ? new Date(lead.created_at) : new Date();
    const day = String(d.getDate()).padStart(2, '0');
    const monthNames = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
    const month = monthNames[d.getMonth()];
    const year = d.getFullYear();
    const formattedDate = `${day}-${month}-${year}`;

    const categoryName = (lead.categories?.name || 'GENERAL').toUpperCase();

    const lineItems = parseLineItemsFromLead(lead);
    const itemsFormattedWhatsApp = lineItems
      .map((item, idx) => {
        const qty = Number(item.quantity) || 1;
        const title = cleanProductTitle(item.product_item) || 'Item Requirement';
        let spec = item.specifications?.trim() || '';
        if (!spec && lineItems.length === 1 && lead.specifications) {
          spec = cleanSpecifications(lead.specifications);
        }
        const qtyLabel = `${qty} No${qty > 1 ? 's' : ''}`;
        let line = `${idx + 1}. ${title} –  ${qtyLabel}`;
        if (spec) {
          line += `\n${spec}`;
        }
        return line;
      })
      .join('\n\n');

    const expectedCredit = lead.expected_credit?.trim() || '';
    const generalRemarks = cleanSpecifications(lead.remarks);

    // Fetch existing lead attachments for document links
    const { data: attachments } = await supabase
      .from('lead_attachments')
      .select('file_name, file_path')
      .eq('lead_id', leadId);

    const documentLinks: string[] = [];
    if (rfqPdfPublicUrl) {
      documentLinks.push(`RFQ PDF: ${rfqPdfPublicUrl}`);
    }

    if (attachments && attachments.length > 0) {
      attachments.forEach((att: any) => {
        if (!att.file_name.startsWith('RFQ_')) {
          documentLinks.push(`Attachment (${att.file_name}): ${supabaseUrl}/storage/v1/object/public/lead-attachments/${att.file_path}`);
        }
      });
    }

    const headerLine = `RFQ | ${formattedDate} | ${categoryName} | ${poReference.toUpperCase()}`;

    const messageText = `${headerLine}

${itemsFormattedWhatsApp}

${expectedCredit ? `Expected Credit: ${expectedCredit}\n\n` : ''}${generalRemarks ? `Remarks: ${generalRemarks}\n\n` : ''}${documentLinks.length > 0 ? documentLinks.join('\n') : ''}`.trim();

    const cleanPhone = vendor.whatsapp_number.replace(/[^0-9+]/g, '').replace(/^\+/, '');
    const webWhatsAppUrl = `https://web.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(messageText)}`;

    // Record WhatsApp prepared action in message logs
    await supabase.from('message_logs').insert({
      lead_id: leadId,
      vendor_id: vendorId,
      channel: 'whatsapp',
      recipient: vendor.whatsapp_number,
      subject: `WhatsApp Quotation Request (${poReference})`,
      content: messageText,
      status: 'prepared',
    });

    // Update lead_vendors
    await supabase
      .from('lead_vendors')
      .update({
        whatsapp_prepared: true,
        whatsapp_prepared_at: new Date().toISOString(),
      })
      .eq('lead_id', leadId)
      .eq('vendor_id', vendorId);

    revalidatePath(`/dashboard/leads/${leadId}`);
    return { success: true, whatsappUrl: webWhatsAppUrl, messageText };
  } catch (error: any) {
    console.error('Error preparing WhatsApp message:', error);
    return { success: false, error: error.message || 'Failed to prepare WhatsApp message' };
  }
}
