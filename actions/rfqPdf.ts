'use server';

import { createAdminClient } from '@/lib/supabase/admin';
import { getLeadById } from '@/actions/leads';
import { getSystemSettings } from '@/actions/settings';
import { generateRfqPdf } from '@/lib/pdf/generateRfqPdf';
import { revalidatePath } from 'next/cache';

export async function ensureLeadRfqPdfInSupabase(leadId: string) {
  try {
    const leadRes = await getLeadById(leadId);
    if (!leadRes.success || !leadRes.lead) {
      return { success: false, error: leadRes.error || 'Lead not found' };
    }

    const lead = leadRes.lead;
    const settingsRes = await getSystemSettings();
    const settings = settingsRes.settings;

    // Generate PDF Buffer using pdfkit engine
    const pdfBuffer = await generateRfqPdf(lead, settings);
    if (!pdfBuffer || pdfBuffer.length === 0) {
      return { success: false, error: 'Failed to generate PDF buffer' };
    }

    const supabase = createAdminClient();
    const fileName = `RFQ_${lead.lead_number}.pdf`;
    const storagePath = `${leadId}/rfq/${fileName}`;

    // Upload / Upsert file to Supabase Storage in lead-attachments bucket
    const { error: uploadErr } = await supabase.storage
      .from('lead-attachments')
      .upload(storagePath, pdfBuffer, {
        contentType: 'application/pdf',
        upsert: true,
      });

    if (uploadErr) {
      console.error('Supabase Storage RFQ PDF upload error:', uploadErr);
      throw uploadErr;
    }

    // Check if attachment metadata record exists in PostgreSQL
    const { data: existingAtt } = await supabase
      .from('lead_attachments')
      .select('id')
      .eq('lead_id', leadId)
      .eq('file_name', fileName)
      .maybeSingle();

    if (existingAtt) {
      await supabase
        .from('lead_attachments')
        .update({
          file_size: pdfBuffer.length,
          file_path: storagePath,
          file_type: 'application/pdf',
        })
        .eq('id', existingAtt.id);
    } else {
      await supabase.from('lead_attachments').insert({
        lead_id: leadId,
        file_name: fileName,
        file_path: storagePath,
        file_size: pdfBuffer.length,
        file_type: 'application/pdf',
      });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
    const publicUrl = `${supabaseUrl}/storage/v1/object/public/lead-attachments/${storagePath}`;

    revalidatePath(`/dashboard/leads/${leadId}`);
    return {
      success: true,
      buffer: pdfBuffer,
      storagePath,
      publicUrl,
      fileName,
    };
  } catch (error: any) {
    console.error('Error ensuring RFQ PDF in Supabase:', error);
    return {
      success: false,
      error: error.message || 'Failed to process RFQ PDF in Supabase Storage',
    };
  }
}
