'use server';

import { createAdminClient } from '@/lib/supabase/admin';
import { revalidatePath } from 'next/cache';

export interface VendorInput {
  company_name: string;
  contact_person: string;
  email: string;
  whatsapp_number: string;
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
      query = query.or(`company_name.ilike.${s},contact_person.ilike.${s},email.ilike.${s},whatsapp_number.ilike.${s}`);
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
      return { success: false, error: 'Please provide all required vendor details (Company Name, Contact Person, Email, WhatsApp Number).' };
    }

    const supabase = createAdminClient();

    const { data: vendor, error: vendorError } = await supabase
      .from('vendors')
      .insert({
        company_name: data.company_name.trim(),
        contact_person: data.contact_person.trim(),
        email: data.email.trim(),
        whatsapp_number: data.whatsapp_number.trim(),
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
