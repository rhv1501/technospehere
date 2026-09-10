'use server';

import { createClient } from '@/lib/supabase/server';

export async function loginAdmin(formData: FormData) {
  const email = (formData.get('email') as string || '').trim();
  const password = formData.get('password') as string;

  if (!email || !password) {
    return { success: false, error: 'Email and password are required' };
  }

  try {
    const supabase = await createClient();

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return { success: false, error: error.message || 'Invalid login credentials' };
    }

    return { success: true };
  } catch (err: any) {
    console.error('Login action error:', err);
    return { success: false, error: err.message || 'An unexpected error occurred' };
  }
}

export async function logoutAdmin() {
  try {
    const supabase = await createClient();
    await supabase.auth.signOut();
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
