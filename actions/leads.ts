'use server';

import { createAdminClient } from '@/lib/supabase/admin';
import { generateLeadNumber } from '@/lib/utils';
import { revalidatePath } from 'next/cache';
import { formatReadableSpecifications } from '@/lib/leadUtils';
import { getSystemSettings } from '@/actions/settings';
import nodemailer from 'nodemailer';

export interface LeadInput {
  customer_name: string;
  lead_name: string;
  product_item: string;
  quantity: number;
  specifications?: string;
  due_date?: string;
  category_id?: string;
  delivery_terms?: string;
  warranty?: string;
  unit_price_estimate?: number;
  gst_rate?: number;
  remarks?: string;
  status?: 'draft' | 'ready_to_send' | 'sent' | 'quoted' | 'completed' | 'cancelled';
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
      query = query.or(`lead_number.ilike.${s},customer_name.ilike.${s},lead_name.ilike.${s},product_item.ilike.${s}`);
    }

    const { data, error } = await query;
    if (error) throw error;

    return { success: true, leads: data || [] };
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

    return { success: true, lead: data };
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
        due_date: data.due_date || null,
        category_id: data.category_id || null,
        delivery_terms: data.delivery_terms?.trim() || null,
        warranty: data.warranty?.trim() || null,
        unit_price_estimate: data.unit_price_estimate != null ? Number(data.unit_price_estimate) : null,
        gst_rate: data.gst_rate != null ? Number(data.gst_rate) : 18.0,
        remarks: data.remarks?.trim() || null,
        status: data.status || 'draft',
      })
      .select()
      .single();

    if (error) throw error;

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
    if (data.due_date !== undefined) payload.due_date = data.due_date || null;
    if (data.category_id !== undefined) payload.category_id = data.category_id || null;
    if (data.delivery_terms !== undefined) payload.delivery_terms = data.delivery_terms?.trim() || null;
    if (data.warranty !== undefined) payload.warranty = data.warranty?.trim() || null;
    if (data.unit_price_estimate !== undefined) payload.unit_price_estimate = data.unit_price_estimate != null ? Number(data.unit_price_estimate) : null;
    if (data.gst_rate !== undefined) payload.gst_rate = data.gst_rate != null ? Number(data.gst_rate) : 18.0;
    if (data.remarks !== undefined) payload.remarks = data.remarks?.trim() || null;
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

    const attachmentLinks = (lead.lead_attachments || [])
      .map((att: any) => `- ${att.file_name}: ${supabaseUrl}/storage/v1/object/public/lead-attachments/${att.file_path}`)
      .join('\n');

    const emailSubject = `Quotation Request: ${lead.lead_number} - ${lead.product_item} (${lead.lead_name})`;

    // Fetch system settings for SMTP configuration
    const settingsRes = await getSystemSettings();
    const settings = settingsRes.settings;

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

    for (const vendor of vendors) {
      const emailBody = `
Dear ${vendor.contact_person},

We request your official quotation for the following requirement:

---------------------------------------------------------
LEAD DETAILS
---------------------------------------------------------
Lead ID: ${lead.lead_number}
Customer / PO Name: ${lead.lead_name}
Product / Item: ${lead.product_item}
Quantity: ${lead.quantity}
Category: ${lead.categories?.name || 'General'}
Required Delivery Timeline / Due Date: ${lead.due_date || 'ASAP'}

---------------------------------------------------------
TECHNICAL SPECIFICATIONS
---------------------------------------------------------
${formatReadableSpecifications(lead)}

---------------------------------------------------------
COMMERCIAL TERMS REQUESTED
---------------------------------------------------------
- Unit Price (INR)
- GST (${lead.gst_rate || 18}%)
- Delivery Terms: ${lead.delivery_terms || 'Standard shipping'}
- Warranty Required: ${lead.warranty || '1 Year Standard Warranty'}
- Stock Availability / Lead Time

---------------------------------------------------------
REMARKS & ATTACHMENTS
---------------------------------------------------------
${lead.remarks || 'None'}

${attachmentLinks ? `Attached Files:\n${attachmentLinks}` : ''}

Please submit your quotation with best pricing and lead time at your earliest convenience.

Best regards,
${fromName}
${settings?.company_name || 'TechnoSphere Business Solutions'}
`;

      let mailStatus: 'sent' | 'failed' = 'sent';
      let mailErrorMsg: string | null = null;

      if (transporter) {
        try {
          await transporter.sendMail({
            from: `"${fromName}" <${fromAddress}>`,
            to: vendor.email,
            subject: emailSubject,
            text: emailBody,
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

    const messageText = `*QUOTATION REQUEST - TechnoSphere*
📌 *Lead ID:* ${lead.lead_number}
📦 *Product:* ${lead.product_item}
🔢 *Quantity:* ${lead.quantity}
🏢 *Client Ref:* ${lead.lead_name}
📅 *Due Date:* ${lead.due_date || 'ASAP'}

*Specifications:*
${formatReadableSpecifications(lead)}

*Commercial Terms Requested:*
- Unit Price & GST (${lead.gst_rate || 18}%)
- Delivery Terms: ${lead.delivery_terms || 'Standard'}
- Warranty: ${lead.warranty || '1 Year'}

Please send your best price and estimated delivery timeline. Thank you!`;

    const cleanPhone = vendor.whatsapp_number.replace(/[^0-9+]/g, '').replace(/^\+/, '');
    const webWhatsAppUrl = `https://web.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(messageText)}`;

    // Record WhatsApp prepared action in message logs
    await supabase.from('message_logs').insert({
      lead_id: leadId,
      vendor_id: vendorId,
      channel: 'whatsapp',
      recipient: vendor.whatsapp_number,
      subject: `WhatsApp Quotation Request (${lead.lead_number})`,
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
