-- Migration: Emergency Backup Codes & Email OTP 2FA Tables

CREATE TABLE IF NOT EXISTS public.mfa_backup_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    code_hash TEXT NOT NULL,
    used BOOLEAN NOT NULL DEFAULT FALSE,
    used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mfa_backup_codes_user ON public.mfa_backup_codes(user_id);
CREATE INDEX IF NOT EXISTS idx_mfa_backup_codes_used ON public.mfa_backup_codes(used);

ALTER TABLE public.mfa_backup_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Backup codes viewable by owner"
ON public.mfa_backup_codes FOR SELECT TO authenticated
USING ((select auth.uid()) = user_id);

CREATE POLICY "Backup codes manageable by owner"
ON public.mfa_backup_codes FOR ALL TO authenticated
USING ((select auth.uid()) = user_id)
WITH CHECK ((select auth.uid()) = user_id);

----------------------------------------------------
-- EMAIL OTP CHALLENGES TABLE
----------------------------------------------------
CREATE TABLE IF NOT EXISTS public.email_otp_challenges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    code_hash TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    used BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_email_otp_user ON public.email_otp_challenges(user_id);

ALTER TABLE public.email_otp_challenges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Email OTP challenges viewable by owner"
ON public.email_otp_challenges FOR SELECT TO authenticated
USING ((select auth.uid()) = user_id);

CREATE POLICY "Email OTP challenges manageable by owner"
ON public.email_otp_challenges FOR ALL TO authenticated
USING ((select auth.uid()) = user_id)
WITH CHECK ((select auth.uid()) = user_id);

----------------------------------------------------
-- USER MFA SETTINGS TABLE
----------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_mfa_settings (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email_otp_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    totp_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    preferred_method TEXT NOT NULL DEFAULT 'totp' CHECK (preferred_method IN ('totp', 'email', 'backup')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.user_mfa_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "User MFA settings viewable by owner"
ON public.user_mfa_settings FOR SELECT TO authenticated
USING ((select auth.uid()) = user_id);

CREATE POLICY "User MFA settings editable by owner"
ON public.user_mfa_settings FOR ALL TO authenticated
USING ((select auth.uid()) = user_id)
WITH CHECK ((select auth.uid()) = user_id);
