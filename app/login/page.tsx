'use client';

import { useState, useEffect } from 'react';
import {
  Layers,
  Loader2,
  Eye,
  EyeOff,
  ShieldCheck,
  ArrowLeft,
  KeyRound,
  Mail,
  QrCode,
  LifeBuoy,
  Send,
} from 'lucide-react';
import { loginAdmin } from '@/actions/auth';
import { sendLoginEmailOtp, verifyLoginEmailOtp, verifyBackupCodeForLogin } from '@/actions/mfa';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { ThemeToggle } from '@/components/theme/ThemeToggle';

export default function LoginPage() {
  const [step, setStep] = useState<'password' | 'mfa'>('password');
  const [mfaMethod, setMfaMethod] = useState<'totp' | 'email' | 'backup'>('totp');
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('admin@admin.com');
  const [password, setPassword] = useState('admin');
  const [showPassword, setShowPassword] = useState(false);

  // 2FA inputs
  const [totpCode, setTotpCode] = useState('');
  const [emailOtpCode, setEmailOtpCode] = useState('');
  const [backupCode, setBackupCode] = useState('');
  const [mfaFactorId, setMfaFactorId] = useState<string | null>(null);
  const [emailOtpSent, setEmailOtpSent] = useState(false);
  const [sendingEmailOtp, setSendingEmailOtp] = useState(false);

  // Check if redirected due to required MFA
  useEffect(() => {
    async function checkMfaRequirement() {
      if (typeof window === 'undefined') return;
      const searchParams = new URLSearchParams(window.location.search);
      if (searchParams.get('mfa') === 'required') {
        const supabase = createClient();
        const { data: aalData } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
        if (aalData?.nextLevel === 'aal2' && aalData?.currentLevel !== 'aal2') {
          const { data: factorsData } = await supabase.auth.mfa.listFactors();
          const verifiedFactor = factorsData?.totp.find((f) => (f.status as string) === 'verified');
          if (verifiedFactor) {
            setMfaFactorId(verifiedFactor.id);
            setStep('mfa');
            toast.info('Two-Factor Authentication is required to access your dashboard.');
          }
        }
      }
    }
    checkMfaRequirement();
  }, []);

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append('email', email);
      formData.append('password', password);

      const res = await loginAdmin(formData);

      if (res?.success) {
        if (res.requiresMfa) {
          const supabase = createClient();
          const { data: factorsData } = await supabase.auth.mfa.listFactors();
          const verifiedFactor = factorsData?.totp.find((f) => (f.status as string) === 'verified');

          if (verifiedFactor) {
            setMfaFactorId(verifiedFactor.id);
          }

          setStep('mfa');
          setLoading(false);
          toast.info('Password verified. Please complete 2FA verification.');
          return;
        }

        toast.success('Signed in successfully');
        window.location.href = '/dashboard';
      } else {
        setLoading(false);
        toast.error(res?.error || 'Invalid credentials');
      }
    } catch (err: any) {
      setLoading(false);
      toast.error(err.message || 'Sign in failed');
    }
  };

  // 1. Submit TOTP Authenticator Code
  const handleTotpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = totpCode.trim();

    if (!cleanCode || cleanCode.length < 6) {
      toast.error('Please enter a valid 6-digit TOTP code');
      return;
    }

    setLoading(true);

    try {
      const supabase = createClient();
      let factorIdToUse = mfaFactorId;

      if (!factorIdToUse) {
        const { data: factorsData, error: listErr } = await supabase.auth.mfa.listFactors();
        if (listErr) throw listErr;
        const verifiedFactor = factorsData?.totp.find((f) => (f.status as string) === 'verified');
        if (!verifiedFactor) throw new Error('No verified TOTP factor found for account');
        factorIdToUse = verifiedFactor.id;
      }

      const { data: challengeData, error: challengeErr } = await supabase.auth.mfa.challenge({
        factorId: factorIdToUse,
      });

      if (challengeErr) throw challengeErr;

      const { error: verifyErr } = await supabase.auth.mfa.verify({
        factorId: factorIdToUse,
        challengeId: challengeData.id,
        code: cleanCode,
      });

      if (verifyErr) throw verifyErr;

      toast.success('2FA Verification Successful! Redirecting...');
      window.location.href = '/dashboard';
    } catch (err: any) {
      setLoading(false);
      toast.error(err.message || 'Invalid authentication code. Please try again.');
    }
  };

  // 2. Send & Verify Email OTP Code
  const handleSendEmailOtpCode = async () => {
    setSendingEmailOtp(true);
    const res = await sendLoginEmailOtp(email);
    setSendingEmailOtp(false);

    if (res.success) {
      setEmailOtpSent(true);
      toast.success(res.message || '6-Digit 2FA Code sent to your email.');
    } else {
      toast.error(res.error || 'Failed to send Email OTP.');
    }
  };

  const handleEmailOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailOtpCode.trim() || emailOtpCode.trim().length < 6) {
      toast.error('Please enter the 6-digit code sent to your email.');
      return;
    }

    setLoading(true);
    const res = await verifyLoginEmailOtp(email, emailOtpCode);

    if (res.success) {
      toast.success('Email 2FA Verification Successful!');
      window.location.href = '/dashboard';
    } else {
      setLoading(false);
      toast.error(res.error || 'Invalid or expired Email OTP code.');
    }
  };

  // 3. Verify Emergency Backup Code
  const handleBackupCodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!backupCode.trim()) {
      toast.error('Please enter your emergency backup code.');
      return;
    }

    setLoading(true);
    const res = await verifyBackupCodeForLogin(email, backupCode);

    if (res.success) {
      toast.success(
        `Emergency Backup Code Verified! (${res.remainingCount} backup code(s) remaining)`
      );
      window.location.href = '/dashboard';
    } else {
      setLoading(false);
      toast.error(res.error || 'Invalid emergency backup code.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0b0f19] text-slate-900 dark:text-slate-100 flex items-center justify-center p-4 relative transition-colors duration-200">
      {/* Top Right Theme Toggle */}
      <div className="absolute top-4 right-4 z-20">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-sm bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-8 space-y-6 shadow-sm dark:shadow-2xl">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white mx-auto font-bold shadow-xs">
            {step === 'mfa' ? <ShieldCheck className="w-5 h-5" /> : <Layers className="w-5 h-5" />}
          </div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            {step === 'mfa' ? 'Two-Factor Verification' : 'TechnoSphere Portal'}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
            {step === 'mfa'
              ? 'Select your preferred 2FA verification method'
              : 'Sign in to access your dashboard'}
          </p>
        </div>

        {step === 'password' ? (
          /* STEP 1: PASSWORD FORM */
          <form onSubmit={handlePasswordSubmit} className="space-y-4 text-xs">
            <div>
              <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Email Address
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@admin.com"
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500 font-medium"
              />
            </div>

            <div>
              <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-3.5 pr-10 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500 font-medium"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-lg text-xs transition-colors flex items-center justify-center space-x-2 disabled:opacity-50 shadow-md shadow-indigo-600/20"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>Sign In</span>
            </button>
          </form>
        ) : (
          /* STEP 2: MULTI-OPTION 2FA VERIFICATION FORM */
          <div className="space-y-4 text-xs">
            {/* 2FA Method Selector */}
            <div className="grid grid-cols-3 gap-1 p-1 bg-slate-100 dark:bg-slate-900 rounded-xl">
              <button
                type="button"
                onClick={() => setMfaMethod('totp')}
                className={`py-1.5 px-2 rounded-lg text-[11px] font-extrabold transition-all flex items-center justify-center space-x-1 ${
                  mfaMethod === 'totp'
                    ? 'bg-white dark:bg-indigo-600 text-indigo-600 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                <QrCode className="w-3.5 h-3.5" />
                <span>App</span>
              </button>

              <button
                type="button"
                onClick={() => setMfaMethod('email')}
                className={`py-1.5 px-2 rounded-lg text-[11px] font-extrabold transition-all flex items-center justify-center space-x-1 ${
                  mfaMethod === 'email'
                    ? 'bg-white dark:bg-indigo-600 text-indigo-600 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                <Mail className="w-3.5 h-3.5" />
                <span>Email</span>
              </button>

              <button
                type="button"
                onClick={() => setMfaMethod('backup')}
                className={`py-1.5 px-2 rounded-lg text-[11px] font-extrabold transition-all flex items-center justify-center space-x-1 ${
                  mfaMethod === 'backup'
                    ? 'bg-white dark:bg-indigo-600 text-indigo-600 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                <LifeBuoy className="w-3.5 h-3.5" />
                <span>Backup</span>
              </button>
            </div>

            {/* METHOD 1: TOTP AUTHENTICATOR APP */}
            {mfaMethod === 'totp' && (
              <form onSubmit={handleTotpSubmit} className="space-y-4">
                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1.5 flex items-center space-x-1">
                    <KeyRound className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                    <span>6-Digit Authenticator App Code</span>
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    autoFocus
                    value={totpCode}
                    onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ''))}
                    placeholder="000000"
                    className="w-full px-3.5 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-center text-xl font-mono tracking-[0.5em] text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500 font-bold"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading || totpCode.length < 6}
                  className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold rounded-xl text-xs transition-all flex items-center justify-center space-x-2 disabled:opacity-50 shadow-md shadow-indigo-600/30"
                >
                  {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>Verify App Code</span>
                </button>
              </form>
            )}

            {/* METHOD 2: EMAIL OTP */}
            {mfaMethod === 'email' && (
              <form onSubmit={handleEmailOtpSubmit} className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="font-medium text-slate-700 dark:text-slate-300 flex items-center space-x-1">
                      <Mail className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                      <span>Email OTP Code</span>
                    </label>
                    <button
                      type="button"
                      onClick={handleSendEmailOtpCode}
                      disabled={sendingEmailOtp}
                      className="text-[11px] font-extrabold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center space-x-1"
                    >
                      {sendingEmailOtp ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                      <span>{emailOtpSent ? 'Resend Email Code' : 'Send Code to Email'}</span>
                    </button>
                  </div>

                  <input
                    type="text"
                    required
                    maxLength={6}
                    autoFocus
                    value={emailOtpCode}
                    onChange={(e) => setEmailOtpCode(e.target.value.replace(/\D/g, ''))}
                    placeholder="000000"
                    className="w-full px-3.5 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-center text-xl font-mono tracking-[0.5em] text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500 font-bold"
                  />
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">
                    Click <strong>Send Code to Email</strong> to dispatch a 6-digit passcode to <strong className="text-slate-700 dark:text-slate-300">{email}</strong>.
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={loading || emailOtpCode.length < 6}
                  className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold rounded-xl text-xs transition-all flex items-center justify-center space-x-2 disabled:opacity-50 shadow-md shadow-indigo-600/30"
                >
                  {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>Verify Email Code</span>
                </button>
              </form>
            )}

            {/* METHOD 3: EMERGENCY BACKUP CODE */}
            {mfaMethod === 'backup' && (
              <form onSubmit={handleBackupCodeSubmit} className="space-y-4">
                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1.5 flex items-center space-x-1">
                    <LifeBuoy className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                    <span>Emergency Backup Code</span>
                  </label>
                  <input
                    type="text"
                    required
                    autoFocus
                    value={backupCode}
                    onChange={(e) => setBackupCode(e.target.value.toUpperCase())}
                    placeholder="e.g. A7X9-K2P4"
                    className="w-full px-3.5 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-center text-lg font-mono text-slate-900 dark:text-slate-100 focus:outline-none focus:border-amber-500 font-bold uppercase tracking-wider"
                  />
                  <p className="mt-1 text-[10px] text-slate-500 dark:text-slate-400">
                    Enter one of your 10-character emergency recovery keys generated during 2FA setup.
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={loading || backupCode.trim().length < 8}
                  className="w-full py-2.5 bg-amber-600 hover:bg-amber-500 text-white font-extrabold rounded-xl text-xs transition-all flex items-center justify-center space-x-2 disabled:opacity-50 shadow-md shadow-amber-600/30"
                >
                  {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>Verify Backup Code</span>
                </button>
              </form>
            )}

            <button
              type="button"
              onClick={() => {
                setStep('password');
                setTotpCode('');
                setEmailOtpCode('');
                setBackupCode('');
              }}
              className="w-full py-2 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 font-semibold text-xs flex items-center justify-center space-x-1.5 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Password Sign In</span>
            </button>
          </div>
        )}

        {/* Credentials Info */}
        <div className="p-3 bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800/80 rounded-xl text-[11px] text-slate-500 dark:text-slate-400 space-y-1">
          <p className="font-semibold text-slate-700 dark:text-slate-300 text-center">Default Credentials</p>
          <div className="flex justify-between font-mono text-[10px]">
            <span>Email: admin@admin.com</span>
            <span>Password: admin</span>
          </div>
        </div>
      </div>
    </div>
  );
}
