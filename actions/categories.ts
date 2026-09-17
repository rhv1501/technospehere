'use server';

import { createAdminClient } from '@/lib/supabase/admin';
import { revalidatePath } from 'next/cache';

export async function getCategories() {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('name', { ascending: true });

    if (error) throw error;
    return { success: true, categories: data || [] };
  } catch (error: any) {
    console.error('Error fetching categories:', error);
    return { success: false, error: error.message || 'Failed to fetch categories', categories: [] };
  }
}

export async function getCategoriesWithStats() {
  try {
    const supabase = createAdminClient();

    const [catRes, vcRes, leadsRes] = await Promise.all([
      supabase.from('categories').select('*').order('name', { ascending: true }),
      supabase.from('vendor_categories').select('category_id'),
      supabase.from('leads').select('category_id'),
    ]);

    if (catRes.error) throw catRes.error;

    const categories = catRes.data || [];
    const vendorCategories = vcRes.data || [];
    const leads = leadsRes.data || [];

    const categoriesWithStats = categories.map((cat) => {
      const vendorCount = vendorCategories.filter((vc) => vc.category_id === cat.id).length;
      const leadCount = leads.filter((l) => l.category_id === cat.id).length;

      return {
        ...cat,
        vendorCount,
        leadCount,
      };
    });

    return { success: true, categories: categoriesWithStats };
  } catch (error: any) {
    console.error('Error fetching categories with stats:', error);
    return { success: false, error: error.message || 'Failed to fetch category statistics', categories: [] };
  }
}

export async function createCategory(formData: { name: string; description?: string }) {
  try {
    const trimmedName = formData.name?.trim();
    if (!trimmedName) {
      return { success: false, error: 'Category name is required' };
    }

    const supabase = createAdminClient();

    // Case-insensitive duplicate check
    const { data: existingCategories } = await supabase
      .from('categories')
      .select('id, name');

    const isDuplicate = (existingCategories || []).some(
      (c) => c.name.trim().toLowerCase() === trimmedName.toLowerCase()
    );

    if (isDuplicate) {
      return {
        success: false,
        error: `Category "${trimmedName}" already exists. Duplicate category names are not allowed.`,
      };
    }

    const { data, error } = await supabase
      .from('categories')
      .insert({
        name: trimmedName,
        description: formData.description?.trim() || null,
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return { success: false, error: `Category "${trimmedName}" already exists. Duplicate category names are not allowed.` };
      }
      throw error;
    }

    revalidatePath('/dashboard/settings');
    revalidatePath('/dashboard/vendors');
    revalidatePath('/dashboard/leads');
    revalidatePath('/dashboard/analytics');
    return { success: true, category: data };
  } catch (error: any) {
    console.error('Error creating category:', error);
    return { success: false, error: error.message || 'Failed to create category' };
  }
}

export async function updateCategory(id: string, formData: { name: string; description?: string }) {
  try {
    const trimmedName = formData.name?.trim();
    if (!trimmedName) {
      return { success: false, error: 'Category name is required' };
    }

    const supabase = createAdminClient();

    // Case-insensitive duplicate check
    const { data: existingCategories } = await supabase
      .from('categories')
      .select('id, name');

    const isDuplicate = (existingCategories || []).some(
      (c) => c.id !== id && c.name.trim().toLowerCase() === trimmedName.toLowerCase()
    );

    if (isDuplicate) {
      return {
        success: false,
        error: `Category "${trimmedName}" already exists. Duplicate category names are not allowed.`,
      };
    }

    const { data, error } = await supabase
      .from('categories')
      .update({
        name: trimmedName,
        description: formData.description?.trim() || null,
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return { success: false, error: `Category "${trimmedName}" already exists. Duplicate category names are not allowed.` };
      }
      throw error;
    }

    revalidatePath('/dashboard/settings');
    revalidatePath('/dashboard/vendors');
    revalidatePath('/dashboard/leads');
    revalidatePath('/dashboard/analytics');
    return { success: true, category: data };
  } catch (error: any) {
    console.error('Error updating category:', error);
    return { success: false, error: error.message || 'Failed to update category' };
  }
}

export async function deleteCategory(id: string) {
  try {
    const supabase = createAdminClient();

    // Check if category is linked to active leads
    const { count: leadCount } = await supabase
      .from('leads')
      .select('id', { count: 'exact', head: true })
      .eq('category_id', id);

    if (leadCount && leadCount > 0) {
      return {
        success: false,
        error: `Cannot delete category because ${leadCount} lead(s) are currently assigned to it. Reassign or delete those leads first.`,
      };
    }

    // Delete vendor category assignments
    await supabase.from('vendor_categories').delete().eq('category_id', id);

    const { error } = await supabase.from('categories').delete().eq('id', id);

    if (error) throw error;

    revalidatePath('/dashboard/settings');
    revalidatePath('/dashboard/vendors');
    revalidatePath('/dashboard/leads');
    revalidatePath('/dashboard/analytics');
    return { success: true };
  } catch (error: any) {
    console.error('Error deleting category:', error);
    return { success: false, error: error.message || 'Failed to delete category' };
  }
}

