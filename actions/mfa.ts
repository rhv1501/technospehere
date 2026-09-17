'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getSystemSettings } from '@/actions/settings';
import crypto from 'crypto';
import nodemailer from 'nodemailer';

function hashCode(code: string): string {
  return crypto.createHash('sha256').update(code.trim().toUpperCase()).digest('hex');
}

function generateRandomNumericCode(): string {
  const bytes = crypto.randomBytes(3);
  const num = (bytes.readUIntBE(0, 3) % 900000) + 100000;
  return num.toString();
}

function generateSingleBackupCode(): string {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  let result = '';
  const bytes = crypto.randomBytes(8);
  for (let i = 0; i < 8; i++) {
    result += chars[bytes[i] % chars.length];
  }
  return `${result.substring(0, 4)}-${result.substring(4, 8)}`;
}

// Ensure database tables exist dynamically if migration hasn't executed
async function ensureMfaTablesExist() {
  const supabase = createAdminClient();
  try {
    await (supabase.rpc as any)('exec_sql', {
      sql_query: `
        CREATE TABLE IF NOT EXISTS public.mfa_backup_codes (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
          code_hash TEXT NOT NULL,
          used BOOLEAN NOT NULL DEFAULT FALSE,
          used_at TIMESTAMPTZ,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
        CREATE TABLE IF NOT EXISTS public.email_otp_challenges (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
          code_hash TEXT NOT NULL,
          expires_at TIMESTAMPTZ NOT NULL,
          used BOOLEAN NOT NULL DEFAULT FALSE,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
        CREATE TABLE IF NOT EXISTS public.user_mfa_settings (
          user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
          email_otp_enabled BOOLEAN NOT NULL DEFAULT FALSE,
          totp_enabled BOOLEAN NOT NULL DEFAULT FALSE,
          preferred_method TEXT NOT NULL DEFAULT 'totp',
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
      `,
    });
  } catch {
    // Ignore if rpc not present
  }
}

export async function getMfaSecurityOverview() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'Unauthorized' };
    }

    // Check TOTP Factor
    const { data: factorsData } = await supabase.auth.mfa.listFactors();
    const isTotpEnabled = (factorsData?.totp || []).some((f) => (f.status as string) === 'verified');

    // Check SMTP Settings
    const settingsRes = await getSystemSettings();
    const smtp = settingsRes.settings;
    const isSmtpConfigured = Boolean(
      smtp?.smtp_host?.trim() &&
      smtp?.smtp_port &&
      smtp?.smtp_from_email?.trim()
    );

    // Check User MFA Settings
    const adminSupabase = createAdminClient();
    const { data: mfaRecord } = await adminSupabase
      .from('user_mfa_settings')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    // Check Backup Codes Count
    const { data: backupCodes } = await adminSupabase
      .from('mfa_backup_codes')
      .select('id')
      .eq('user_id', user.id)
      .eq('used', false);

    return {
      success: true,
      userEmail: user.email,
      isTotpEnabled,
      isEmailOtpEnabled: Boolean(mfaRecord?.email_otp_enabled),
      isSmtpConfigured,
      backupCodesCount: backupCodes?.length || 0,
      preferredMethod: mfaRecord?.preferred_method || 'totp',
    };
  } catch (err: any) {
    console.error('Error in getMfaSecurityOverview:', err);
    return { success: false, error: err.message };
  }
}

export async function sendEmailOtpVerificationCode() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user || !user.email) {
      return { success: false, error: 'User email not found.' };
    }

    const settingsRes = await getSystemSettings();
    const smtp = settingsRes.settings;

    if (!smtp?.smtp_host?.trim() || !smtp?.smtp_port || !smtp?.smtp_from_email?.trim()) {
      return {
        success: false,
        error: 'SMTP credentials are not configured. Please enter SMTP credentials under the SMTP tab first.',
        requiresSmtp: true,
      };
    }

    const code = generateRandomNumericCode();
    const codeHash = hashCode(code);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 minutes

    const adminSupabase = createAdminClient();
    await ensureMfaTablesExist();

    // Store challenge
    await adminSupabase.from('email_otp_challenges').insert({
      user_id: user.id,
      code_hash: codeHash,
      expires_at: expiresAt,
      used: false,
    });

    // Send email using Nodemailer
    const transporter = nodemailer.createTransport({
      host: smtp.smtp_host.trim(),
      port: Number(smtp.smtp_port),
      secure: Boolean(smtp.smtp_secure),
      auth: smtp.smtp_user?.trim()
        ? { user: smtp.smtp_user.trim(), pass: smtp.smtp_pass || '' }
        : undefined,
    });

    const fromName = smtp.smtp_from_name || 'TechnoSphere Procurement';
    const fromEmail = smtp.smtp_from_email.trim();

    await transporter.sendMail({
      from: `"${fromName}" <${fromEmail}>`,
      to: user.email,
      subject: 'TechnoSphere 2FA — Email Verification Code',
      html: `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff;">
          <div style="text-align: center; margin-bottom: 20px;">
            <div style="width: 44px; h-44px; background: #4f46e5; border-radius: 12px; display: inline-flex; align-items: center; justify-content: center; color: #ffffff; font-weight: bold; font-size: 20px; margin-bottom: 8px;">T</div>
            <h2 style="margin: 0; color: #0f172a; font-size: 20px; font-weight: 800;">Email 2FA Verification</h2>
            <p style="margin: 4px 0 0 0; color: #64748b; font-size: 13px;">Confirm your email address to enable Email OTP 2FA</p>
          </div>

          <div style="background-color: #f8fafc; border: 1px dashed #cbd5e1; border-radius: 12px; padding: 20px; text-align: center; margin: 20px 0;">
            <span style="font-family: monospace; font-size: 32px; font-weight: 900; letter-spacing: 8px; color: #4f46e5;">${code}</span>
            <p style="margin: 8px 0 0 0; font-size: 11px; color: #64748b; font-weight: 600;">Valid for 10 minutes</p>
          </div>

          <p style="font-size: 12px; color: #475569; line-height: 1.5; margin: 0 0 16px 0;">
            Enter this 6-digit code in your TechnoSphere Settings panel to finalize turning on Email Two-Factor Authentication.
          </p>
        </div>
      `,
    });

    return { success: true, message: `Verification code sent to ${user.email}` };
  } catch (err: any) {
    console.error('Error sending Email OTP:', err);
    return { success: false, error: err.message || 'Failed to send verification email' };
  }
}

export async function verifyAndEnableEmailOtp(code: string) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'Unauthorized' };
    }

    const cleanCode = code.trim();
    if (!cleanCode || cleanCode.length !== 6) {
      return { success: false, error: 'Please enter a valid 6-digit code' };
    }

    const codeHash = hashCode(cleanCode);
    const adminSupabase = createAdminClient();

    // Verify challenge
    const { data: challenge, error: challengeErr } = await adminSupabase
      .from('email_otp_challenges')
      .select('*')
      .eq('user_id', user.id)
      .eq('code_hash', codeHash)
      .eq('used', false)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (challengeErr || !challenge) {
      return { success: false, error: 'Invalid or expired verification code.' };
    }

    // Mark challenge used
    await adminSupabase
      .from('email_otp_challenges')
      .update({ used: true })
      .eq('id', challenge.id);

    // Update user MFA settings
    await adminSupabase.from('user_mfa_settings').upsert({
      user_id: user.id,
      email_otp_enabled: true,
      updated_at: new Date().toISOString(),
    });

    return { success: true, message: 'Email OTP 2FA Enabled Successfully!' };
  } catch (err: any) {
    console.error('Error verifying Email OTP:', err);
    return { success: false, error: err.message };
  }
}

export async function disableEmailOtp() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { success: false, error: 'Unauthorized' };

    const adminSupabase = createAdminClient();
    await adminSupabase.from('user_mfa_settings').upsert({
      user_id: user.id,
      email_otp_enabled: false,
      updated_at: new Date().toISOString(),
    });

    return { success: true, message: 'Email OTP 2FA Disabled.' };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function generateEmergencyBackupCodes() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { success: false, error: 'Unauthorized' };

    const rawCodes: string[] = [];
    const dbRecords: { user_id: string; code_hash: string }[] = [];

    for (let i = 0; i < 8; i++) {
      const code = generateSingleBackupCode();
      rawCodes.push(code);
      dbRecords.push({
        user_id: user.id,
        code_hash: hashCode(code.replace('-', '')),
      });
    }

    const adminSupabase = createAdminClient();
    await ensureMfaTablesExist();

    // Delete existing backup codes for user
    await adminSupabase.from('mfa_backup_codes').delete().eq('user_id', user.id);

    // Insert new hashed backup codes
    const { error } = await adminSupabase.from('mfa_backup_codes').insert(dbRecords);
    if (error) throw error;

    return { success: true, codes: rawCodes };
  } catch (err: any) {
    console.error('Error generating backup codes:', err);
    return { success: false, error: err.message || 'Failed to generate backup codes' };
  }
}

export async function sendLoginEmailOtp(email: string) {
  try {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) return { success: false, error: 'Email address is required' };

    const adminSupabase = createAdminClient();
    const { data: usersData, error: userError } = await adminSupabase.auth.admin.listUsers();
    if (userError || !usersData?.users) return { success: false, error: 'User account not found' };

    const user = usersData.users.find((u) => u.email?.toLowerCase() === cleanEmail);
    if (!user) return { success: false, error: 'User account not found' };

    const settingsRes = await getSystemSettings();
    const smtp = settingsRes.settings;

    if (!smtp?.smtp_host?.trim() || !smtp?.smtp_port || !smtp?.smtp_from_email?.trim()) {
      return { success: false, error: 'SMTP server is not configured. Email OTP unavailable.' };
    }

    const code = generateRandomNumericCode();
    const codeHash = hashCode(code);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    await ensureMfaTablesExist();
    await adminSupabase.from('email_otp_challenges').insert({
      user_id: user.id,
      code_hash: codeHash,
      expires_at: expiresAt,
      used: false,
    });

    const transporter = nodemailer.createTransport({
      host: smtp.smtp_host.trim(),
      port: Number(smtp.smtp_port),
      secure: Boolean(smtp.smtp_secure),
      auth: smtp.smtp_user?.trim()
        ? { user: smtp.smtp_user.trim(), pass: smtp.smtp_pass || '' }
        : undefined,
    });

    const fromName = smtp.smtp_from_name || 'TechnoSphere Portal';
    const fromEmail = smtp.smtp_from_email.trim();

    await transporter.sendMail({
      from: `"${fromName}" <${fromEmail}>`,
      to: cleanEmail,
      subject: 'TechnoSphere Login — 2FA Code',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff;">
          <h3 style="color: #4f46e5; margin-top: 0;">TechnoSphere Portal Login</h3>
          <p style="font-size: 13px; color: #334155;">Your 6-digit Two-Factor Authentication login code is:</p>
          <div style="font-size: 30px; font-weight: bold; letter-spacing: 6px; padding: 15px; background: #f1f5f9; text-align: center; border-radius: 8px; font-family: monospace; color: #0f172a;">${code}</div>
          <p style="font-size: 11px; color: #94a3b8; margin-top: 15px;">Valid for 10 minutes. Do not share this code with anyone.</p>
        </div>
      `,
    });

    return { success: true, message: `Login 2FA code sent to ${cleanEmail}` };
  } catch (err: any) {
    console.error('Error sending login Email OTP:', err);
    return { success: false, error: err.message || 'Failed to send login code' };
  }
}

export async function verifyLoginEmailOtp(email: string, code: string) {
  try {
    const cleanEmail = email.trim().toLowerCase();
    const cleanCode = code.trim();
    if (!cleanEmail || !cleanCode) return { success: false, error: 'Email and code are required' };

    const adminSupabase = createAdminClient();
    const { data: usersData } = await adminSupabase.auth.admin.listUsers();
    const user = usersData?.users?.find((u) => u.email?.toLowerCase() === cleanEmail);

    if (!user) return { success: false, error: 'User account not found' };

    const codeHash = hashCode(cleanCode);

    const { data: challenge } = await adminSupabase
      .from('email_otp_challenges')
      .select('*')
      .eq('user_id', user.id)
      .eq('code_hash', codeHash)
      .eq('used', false)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!challenge) {
      return { success: false, error: 'Invalid or expired Email OTP code' };
    }

    await adminSupabase
      .from('email_otp_challenges')
      .update({ used: true })
      .eq('id', challenge.id);

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function verifyBackupCodeForLogin(email: string, backupCode: string) {
  try {
    const cleanEmail = email.trim().toLowerCase();
    const cleanCode = backupCode.trim().replace(/-/g, '').toUpperCase();
    if (!cleanEmail || !cleanCode) return { success: false, error: 'Email and backup code are required' };

    const adminSupabase = createAdminClient();
    const { data: usersData } = await adminSupabase.auth.admin.listUsers();
    const user = usersData?.users?.find((u) => u.email?.toLowerCase() === cleanEmail);

    if (!user) return { success: false, error: 'User account not found' };

    const codeHash = hashCode(cleanCode);

    const { data: codeRecord } = await adminSupabase
      .from('mfa_backup_codes')
      .select('*')
      .eq('user_id', user.id)
      .eq('code_hash', codeHash)
      .eq('used', false)
      .maybeSingle();

    if (!codeRecord) {
      return { success: false, error: 'Invalid or already used emergency backup code' };
    }

    // Mark as used
    await adminSupabase
      .from('mfa_backup_codes')
      .update({ used: true, used_at: new Date().toISOString() })
      .eq('id', codeRecord.id);

    // Count remaining unused codes
    const { data: remaining } = await adminSupabase
      .from('mfa_backup_codes')
      .select('id')
      .eq('user_id', user.id)
      .eq('used', false);

    return { success: true, remainingCount: remaining?.length || 0 };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
