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

    // Check if user requires MFA (aal2 or Email OTP / Backup Codes)
    const { data: aalData, error: aalError } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
      const { createAdminClient } = await import('@/lib/supabase/admin');
      const adminSupabase = createAdminClient();

      const { data: mfaSettings } = await adminSupabase
        .from('user_mfa_settings')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      const { data: backupCodes } = await adminSupabase
        .from('mfa_backup_codes')
        .select('id')
        .eq('user_id', user.id)
        .eq('used', false);

      const hasTotp = aalData?.nextLevel === 'aal2';
      const hasEmailOtp = Boolean(mfaSettings?.email_otp_enabled);
      const hasBackupCodes = Boolean(backupCodes && backupCodes.length > 0);

      const requiresMfa = hasTotp || hasEmailOtp;

      if (requiresMfa && aalData?.currentLevel !== 'aal2') {
        const availableMethods: ('totp' | 'email' | 'backup')[] = [];
        if (hasTotp) availableMethods.push('totp');
        if (hasEmailOtp) availableMethods.push('email');
        if (hasBackupCodes) availableMethods.push('backup');

        return {
          success: true,
          requiresMfa: true,
          email: user.email,
          availableMethods,
        };
      }
    }

    return { success: true, requiresMfa: false };
  } catch (err: any) {
    console.error('Login action error:', err);
    return { success: false, error: err.message || 'An unexpected error occurred' };
  }
}

export async function checkUserMfaStatus() {
  try {
    const supabase = await createClient();
    const { data: aalData, error: aalError } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    const { data: factorsData, error: factorsError } = await supabase.auth.mfa.listFactors();

    if (aalError || factorsError) {
      return { success: false, error: aalError?.message || factorsError?.message };
    }

    const verifiedTotpFactors = (factorsData?.totp || []).filter((f) => (f.status as string) === 'verified');

    return {
      success: true,
      currentLevel: aalData?.currentLevel,
      nextLevel: aalData?.nextLevel,
      hasMfaEnabled: verifiedTotpFactors.length > 0,
      factors: factorsData?.totp || [],
    };
  } catch (err: any) {
    return { success: false, error: err.message };
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

