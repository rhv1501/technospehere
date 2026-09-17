'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Settings,
  Plus,
  Pencil,
  Trash2,
  Tag,
  Building2,
  FileText,
  Search,
  Loader2,
  Check,
  AlertTriangle,
  Sparkles,
  ExternalLink,
  ShieldCheck,
  DollarSign,
  Truck,
  Shield,
  Mail,
  Phone,
  Save,
  MessageSquare,
  Globe,
  Briefcase,
  Key,
  Copy,
  QrCode,
  ShieldAlert,
  CheckCircle2,
  KeyRound,
  Lock,
  Download,
  Send,
  LifeBuoy,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import { createCategory, updateCategory, deleteCategory } from '@/actions/categories';
import { updateSystemSettings, testSmtpConnection, SystemSettings } from '@/actions/settings';
import {
  getMfaSecurityOverview,
  sendEmailOtpVerificationCode,
  verifyAndEnableEmailOtp,
  disableEmailOtp,
  generateEmergencyBackupCodes,
} from '@/actions/mfa';
import { formatDate } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';

interface CategoryWithStats {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  vendorCount: number;
  leadCount: number;
}

interface SettingsPageClientProps {
  categories: CategoryWithStats[];
  initialSettings: SystemSettings;
}

export function SettingsPageClient({ categories, initialSettings }: SettingsPageClientProps) {
  const router = useRouter();
  const [activeSection, setActiveSection] = useState<'categories' | 'company' | 'dispatches' | 'smtp' | 'security'>('categories');
  const [searchTerm, setSearchTerm] = useState('');
  const [testSmtpLoading, setTestSmtpLoading] = useState(false);

  // System Settings state
  const [settings, setSettings] = useState<SystemSettings>(initialSettings);
  const [settingsLoading, setSettingsLoading] = useState(false);

  // MFA / TOTP 2FA State
  const [mfaStatusLoading, setMfaStatusLoading] = useState(true);
  const [isMfaEnabled, setIsMfaEnabled] = useState(false);
  const [isEmailOtpEnabled, setIsEmailOtpEnabled] = useState(false);
  const [isSmtpConfigured, setIsSmtpConfigured] = useState(false);
  const [backupCodesCount, setBackupCodesCount] = useState(0);
  const [totpFactor, setTotpFactor] = useState<any>(null);

  // Enroll TOTP Modal state
  const [showEnrollModal, setShowEnrollModal] = useState(false);
  const [enrollData, setEnrollData] = useState<{ factorId: string; secret: string; qrCode: string; uri: string } | null>(null);
  const [enrollCode, setEnrollCode] = useState('');
  const [enrollLoading, setEnrollLoading] = useState(false);
  const [copiedSecret, setCopiedSecret] = useState(false);

  // Disable TOTP Modal state
  const [showDisableModal, setShowDisableModal] = useState(false);
  const [disableCode, setDisableCode] = useState('');
  const [disableLoading, setDisableLoading] = useState(false);

  // Email OTP Modal state
  const [showEmailOtpModal, setShowEmailOtpModal] = useState(false);
  const [emailOtpCode, setEmailOtpCode] = useState('');
  const [emailOtpLoading, setEmailOtpLoading] = useState(false);

  // Backup Codes Modal state
  const [showBackupModal, setShowBackupModal] = useState(false);
  const [generatedBackupCodes, setGeneratedBackupCodes] = useState<string[]>([]);
  const [backupLoading, setBackupLoading] = useState(false);
  const [copiedBackupCodes, setCopiedBackupCodes] = useState(false);

  // Fetch MFA Status from Supabase & Backend
  const fetchMfaStatus = async () => {
    setMfaStatusLoading(true);
    try {
      const overview = await getMfaSecurityOverview();
      if (overview.success) {
        setIsMfaEnabled(Boolean(overview.isTotpEnabled));
        setIsEmailOtpEnabled(Boolean(overview.isEmailOtpEnabled));
        setIsSmtpConfigured(Boolean(overview.isSmtpConfigured));
        setBackupCodesCount(overview.backupCodesCount || 0);
      }

      const supabase = createClient();
      const { data: factorsData } = await supabase.auth.mfa.listFactors();
      if (factorsData) {
        const verifiedFactor = factorsData.totp.find((f) => (f.status as string) === 'verified');
        setTotpFactor(verifiedFactor || null);
      }
    } catch (err: any) {
      console.error('Error fetching MFA overview:', err);
    } finally {
      setMfaStatusLoading(false);
    }
  };

  useEffect(() => {
    fetchMfaStatus();
  }, []);

  // Email OTP Handlers
  const handleStartEmailOtpSetup = async () => {
    if (!isSmtpConfigured) {
      toast.error('SMTP configuration required before enabling Email 2FA.');
      setActiveSection('smtp');
      return;
    }

    setEmailOtpLoading(true);
    const res = await sendEmailOtpVerificationCode();
    setEmailOtpLoading(false);

    if (res.success) {
      setShowEmailOtpModal(true);
      setEmailOtpCode('');
      toast.success(res.message || 'Verification code sent to your email.');
    } else {
      if (res.requiresSmtp) {
        setActiveSection('smtp');
      }
      toast.error(res.error || 'Failed to send Email OTP.');
    }
  };

  const handleVerifyEmailOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailOtpCode.trim() || emailOtpCode.trim().length !== 6) {
      toast.error('Please enter the 6-digit verification code.');
      return;
    }

    setEmailOtpLoading(true);
    const res = await verifyAndEnableEmailOtp(emailOtpCode);
    setEmailOtpLoading(false);

    if (res.success) {
      toast.success(res.message || 'Email OTP 2FA Enabled Successfully!');
      setShowEmailOtpModal(false);
      setEmailOtpCode('');
      await fetchMfaStatus();
    } else {
      toast.error(res.error || 'Failed to verify Email OTP.');
    }
  };

  const handleDisableEmailOtp = async () => {
    setEmailOtpLoading(true);
    const res = await disableEmailOtp();
    setEmailOtpLoading(false);

    if (res.success) {
      toast.success('Email OTP 2FA Disabled.');
      await fetchMfaStatus();
    } else {
      toast.error(res.error || 'Failed to disable Email OTP.');
    }
  };

  // Backup Code Handlers
  const handleGenerateBackupCodes = async () => {
    setBackupLoading(true);
    const res = await generateEmergencyBackupCodes();
    setBackupLoading(false);

    if (res.success && res.codes) {
      setGeneratedBackupCodes(res.codes);
      setShowBackupModal(true);
      await fetchMfaStatus();
      toast.success('8 Emergency Backup Codes generated!');
    } else {
      toast.error(res.error || 'Failed to generate emergency backup codes.');
    }
  };

  const handleCopyAllBackupCodes = () => {
    if (generatedBackupCodes.length > 0) {
      navigator.clipboard.writeText(generatedBackupCodes.join('\n'));
      setCopiedBackupCodes(true);
      toast.success('All emergency backup codes copied to clipboard!');
      setTimeout(() => setCopiedBackupCodes(false), 2000);
    }
  };

  const handleDownloadBackupCodes = () => {
    if (generatedBackupCodes.length === 0) return;
    const content =
      `TECHNOSPHERE EMERGENCY BACKUP RECOVERY CODES\nGenerated: ${new Date().toLocaleString()}\n\n` +
      `Keep these 8 single-use recovery codes in a safe place.\nIf you lose your authenticator app, enter one of these codes on the login screen to recover access.\n\n` +
      generatedBackupCodes.map((c, i) => `${i + 1}. ${c}`).join('\n') +
      `\n\nNote: Each backup code can only be used ONCE.`;

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `technosphere-backup-codes-${Date.now()}.txt`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('Backup codes text file downloaded!');
  };

  const handleStartEnrollment = async () => {
    setEnrollLoading(true);
    try {
      const supabase = createClient();

      // Unenroll any existing unverified factors first
      const { data: existingFactors } = await supabase.auth.mfa.listFactors();
      const unverified = (existingFactors?.totp || []).filter((f) => (f.status as string) === 'unverified');
      for (const factor of unverified) {
        await supabase.auth.mfa.unenroll({ factorId: factor.id });
      }

      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
        issuer: 'TechnoSphere',
        friendlyName: 'Authenticator',
      });

      if (error) throw error;

      setEnrollData({
        factorId: data.id,
        secret: data.totp.secret,
        qrCode: data.totp.qr_code,
        uri: data.totp.uri,
      });
      setEnrollCode('');
      setShowEnrollModal(true);
    } catch (err: any) {
      toast.error(err.message || 'Failed to initialize TOTP 2FA setup');
    } finally {
      setEnrollLoading(false);
    }
  };

  const handleVerifyEnrollment = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = enrollCode.trim();
    if (!enrollData || cleanCode.length < 6) {
      toast.error('Please enter a valid 6-digit TOTP code');
      return;
    }

    setEnrollLoading(true);
    try {
      const supabase = createClient();
      const { data: challengeData, error: challengeErr } = await supabase.auth.mfa.challenge({
        factorId: enrollData.factorId,
      });
      if (challengeErr) throw challengeErr;

      const { error: verifyErr } = await supabase.auth.mfa.verify({
        factorId: enrollData.factorId,
        challengeId: challengeData.id,
        code: cleanCode,
      });
      if (verifyErr) throw verifyErr;

      toast.success('Two-Factor Authentication (TOTP) Enabled Successfully!');
      setShowEnrollModal(false);
      setEnrollData(null);
      setEnrollCode('');
      await fetchMfaStatus();
    } catch (err: any) {
      toast.error(err.message || 'Invalid authentication code. Please check your app and try again.');
    } finally {
      setEnrollLoading(false);
    }
  };

  const handleDisable2FA = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!totpFactor) return;

    setDisableLoading(true);
    try {
      const supabase = createClient();

      if (disableCode.trim().length === 6) {
        const { data: challengeData } = await supabase.auth.mfa.challenge({
          factorId: totpFactor.id,
        });
        if (challengeData) {
          await supabase.auth.mfa.verify({
            factorId: totpFactor.id,
            challengeId: challengeData.id,
            code: disableCode.trim(),
          });
        }
      }

      const { error: unenrollErr } = await supabase.auth.mfa.unenroll({
        factorId: totpFactor.id,
      });

      if (unenrollErr) throw unenrollErr;

      toast.success('Two-Factor Authentication Disabled');
      setShowDisableModal(false);
      setDisableCode('');
      await fetchMfaStatus();
    } catch (err: any) {
      toast.error(err.message || 'Failed to disable 2FA. Please verify your code.');
    } finally {
      setDisableLoading(false);
    }
  };

  const handleCopySecret = () => {
    if (enrollData?.secret) {
      navigator.clipboard.writeText(enrollData.secret);
      setCopiedSecret(true);
      toast.success('Secret key copied to clipboard!');
      setTimeout(() => setCopiedSecret(false), 2000);
    }
  };

  // Category Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<CategoryWithStats | null>(null);
  const [deletingCategory, setDeletingCategory] = useState<CategoryWithStats | null>(null);

  // Category Form state
  const [catFormData, setCatFormData] = useState({ name: '', description: '' });
  const [catLoading, setCatLoading] = useState(false);
  const [catDeleteLoading, setCatDeleteLoading] = useState(false);

  // Popular quick category preset suggestions
  const presetSuggestions = [
    'Lenovo Commercial',
    'HP Enterprise',
    'Dell Commercial',
    'Apple Business',
    'Cisco Networking',
    'Custom Software & Web',
  ];

  const filteredCategories = categories.filter(
    (c) =>
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.description && c.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleOpenAddModal = (initialName: string = '') => {
    setCatFormData({ name: initialName, description: '' });
    setShowAddModal(true);
  };

  const handleCreateCategorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = catFormData.name.trim();
    if (!cleanName) return;

    const isDuplicate = categories.some(
      (c) => c.name?.trim().toLowerCase() === cleanName.toLowerCase()
    );

    if (isDuplicate) {
      toast.error(`Category "${cleanName}" already exists. Duplicate category names are not allowed.`);
      return;
    }

    setCatLoading(true);
    const res = await createCategory({
      name: cleanName,
      description: catFormData.description,
    });
    setCatLoading(false);

    if (res.success) {
      toast.success(`Category "${cleanName}" created successfully!`);
      setShowAddModal(false);
      setCatFormData({ name: '', description: '' });
      router.refresh();
    } else {
      toast.error(res.error || 'Failed to create category');
    }
  };

  const handleUpdateCategorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = catFormData.name.trim();
    if (!editingCategory || !cleanName) return;

    const isDuplicate = categories.some(
      (c) => c.id !== editingCategory.id && c.name?.trim().toLowerCase() === cleanName.toLowerCase()
    );

    if (isDuplicate) {
      toast.error(`Category "${cleanName}" already exists. Duplicate category names are not allowed.`);
      return;
    }

    setCatLoading(true);
    const res = await updateCategory(editingCategory.id, {
      name: cleanName,
      description: catFormData.description,
    });
    setCatLoading(false);

    if (res.success) {
      toast.success(`Category updated to "${cleanName}"!`);
      setEditingCategory(null);
      setCatFormData({ name: '', description: '' });
      router.refresh();
    } else {
      toast.error(res.error || 'Failed to update category');
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deletingCategory) return;

    setCatDeleteLoading(true);
    const res = await deleteCategory(deletingCategory.id);
    setCatDeleteLoading(false);

    if (res.success) {
      toast.success(`Category "${deletingCategory.name}" deleted successfully.`);
      setDeletingCategory(null);
      router.refresh();
    } else {
      toast.error(res.error || 'Failed to delete category');
    }
  };

  const handleSaveSystemSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSettingsLoading(true);
    const res = await updateSystemSettings(settings);
    setSettingsLoading(false);

    if (res.success) {
      toast.success('System settings & configurations updated successfully!');
      router.refresh();
    } else {
      toast.error(res.error || 'Failed to save settings');
    }
  };

  const handleCopyLink = () => {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    navigator.clipboard.writeText(`${origin}/vendor-register`);
    toast.success('Public Vendor Registration Form link copied!');
  };

  const handleTestSmtpConnection = async () => {
    if (!settings.smtp_host?.trim() || !settings.smtp_port) {
      toast.error('Please enter SMTP Host and Port before testing connection.');
      return;
    }

    setTestSmtpLoading(true);
    const res = await testSmtpConnection({
      smtp_host: settings.smtp_host,
      smtp_port: settings.smtp_port,
      smtp_secure: settings.smtp_secure,
      smtp_user: settings.smtp_user,
      smtp_pass: settings.smtp_pass,
      smtp_from_email: settings.smtp_from_email,
    });
    setTestSmtpLoading(false);

    if (res.success) {
      toast.success(res.message || 'SMTP Connection Verified Successfully!');
    } else {
      toast.error(res.error || 'Failed to connect to SMTP server');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in pb-16">
      {/* Settings Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-[#111827] border border-slate-200/90 dark:border-slate-800/80 p-6 rounded-2xl shadow-sm dark:shadow-xl">
        <div>
          <div className="flex items-center space-x-2 text-xs font-extrabold text-indigo-600 dark:text-indigo-400 mb-1 uppercase tracking-wider">
            <Settings className="w-4 h-4" />
            <span>Enterprise System Settings</span>
          </div>
          <h1 className="text-xl lg:text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
            Configurable Control Panel
          </h1>
          <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">
            Configure categories, company profile, communication templates, and security settings.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={handleSaveSystemSettings}
            disabled={settingsLoading}
            className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs shadow-md shadow-indigo-600/30 flex items-center space-x-2 disabled:opacity-50 transition-all"
          >
            {settingsLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            <span>Save All Config Changes</span>
          </button>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center space-x-2 border-b border-slate-200 dark:border-slate-800 pb-3 overflow-x-auto">
        <button
          onClick={() => setActiveSection('categories')}
          className={`px-4 py-2.5 rounded-xl text-xs font-extrabold flex items-center space-x-2 border transition-all whitespace-nowrap ${
            activeSection === 'categories'
              ? 'bg-indigo-600 text-white dark:bg-indigo-600/30 dark:text-indigo-300 border-indigo-600 dark:border-indigo-500/50 shadow-md'
              : 'bg-white dark:bg-slate-900/60 text-slate-700 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/80 shadow-xs'
          }`}
        >
          <Tag className="w-4 h-4" />
          <span>Procurement Categories ({categories.length})</span>
        </button>

        <button
          onClick={() => setActiveSection('company')}
          className={`px-4 py-2.5 rounded-xl text-xs font-extrabold flex items-center space-x-2 border transition-all whitespace-nowrap ${
            activeSection === 'company'
              ? 'bg-indigo-600 text-white dark:bg-indigo-600/30 dark:text-indigo-300 border-indigo-600 dark:border-indigo-500/50 shadow-md'
              : 'bg-white dark:bg-slate-900/60 text-slate-700 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/80 shadow-xs'
          }`}
        >
          <Briefcase className="w-4 h-4" />
          <span>Company Profile & Info</span>
        </button>

        <button
          onClick={() => setActiveSection('dispatches')}
          className={`px-4 py-2.5 rounded-xl text-xs font-extrabold flex items-center space-x-2 border transition-all whitespace-nowrap ${
            activeSection === 'dispatches'
              ? 'bg-indigo-600 text-white dark:bg-indigo-600/30 dark:text-indigo-300 border-indigo-600 dark:border-indigo-500/50 shadow-md'
              : 'bg-white dark:bg-slate-900/60 text-slate-700 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/80 shadow-xs'
          }`}
        >
          <Mail className="w-4 h-4" />
          <span>Email & WhatsApp Dispatch Templates</span>
        </button>

        <button
          onClick={() => setActiveSection('smtp')}
          className={`px-4 py-2.5 rounded-xl text-xs font-extrabold flex items-center space-x-2 border transition-all whitespace-nowrap ${
            activeSection === 'smtp'
              ? 'bg-indigo-600 text-white dark:bg-indigo-600/30 dark:text-indigo-300 border-indigo-600 dark:border-indigo-500/50 shadow-md'
              : 'bg-white dark:bg-slate-900/60 text-slate-700 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/80 shadow-xs'
          }`}
        >
          <Globe className="w-4 h-4" />
          <span>SMTP Server Credentials</span>
        </button>

        <button
          onClick={() => setActiveSection('security')}
          className={`px-4 py-2.5 rounded-xl text-xs font-extrabold flex items-center space-x-2 border transition-all whitespace-nowrap ${
            activeSection === 'security'
              ? 'bg-indigo-600 text-white dark:bg-indigo-600/30 dark:text-indigo-300 border-indigo-600 dark:border-indigo-500/50 shadow-md'
              : 'bg-white dark:bg-slate-900/60 text-slate-700 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/80 shadow-xs'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          <span>Security & 2FA</span>
        </button>
      </div>

      {/* SECTION 1: PROCUREMENT CATEGORIES */}
      {activeSection === 'categories' && (
        <div className="space-y-6">
          {/* Quick Add Presets Section */}
          <div className="bg-gradient-to-r from-indigo-50 via-slate-50 to-emerald-50 dark:from-indigo-950/40 dark:via-slate-900/60 dark:to-emerald-950/40 border border-indigo-200/80 dark:border-indigo-500/20 p-5 rounded-2xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold text-indigo-900 dark:text-indigo-200 flex items-center space-x-2">
                <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <span>Recommended Category Presets</span>
              </span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Click chip to quick-add category</span>
            </div>

            <div className="flex flex-wrap gap-2">
              {presetSuggestions.map((preset) => {
                const exists = categories.some((c) => c.name.toLowerCase() === preset.toLowerCase());
                return (
                  <button
                    key={preset}
                    onClick={() => !exists && handleOpenAddModal(preset)}
                    disabled={exists}
                    className={`px-3 py-1.5 rounded-xl text-xs font-extrabold border transition-all flex items-center space-x-1.5 ${
                      exists
                        ? 'bg-emerald-100 dark:bg-emerald-950/80 border-emerald-300 dark:border-emerald-700 text-emerald-900 dark:text-emerald-300 opacity-80 cursor-default'
                        : 'bg-white dark:bg-slate-900 border-indigo-200 dark:border-slate-800 text-indigo-700 dark:text-indigo-300 hover:border-indigo-400 dark:hover:border-indigo-600 hover:shadow-xs'
                    }`}
                  >
                    <span>{preset}</span>
                    {exists ? <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> : <Plus className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Main Category Table */}
          <div className="bg-white dark:bg-[#111827] border border-slate-200/90 dark:border-slate-800/80 rounded-2xl p-6 space-y-4 shadow-sm dark:shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
              <div>
                <h3 className="font-extrabold text-slate-900 dark:text-slate-100 text-base flex items-center space-x-2">
                  <Tag className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  <span>Procurement Categories ({categories.length})</span>
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                  Categories are assigned to vendors during onboarding and linked to lead quotation requests.
                </p>
              </div>

              <div className="flex items-center space-x-3">
                <div className="relative min-w-[200px]">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="Search categories..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-slate-100 font-medium focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <button
                  onClick={() => handleOpenAddModal('')}
                  className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-extrabold shadow-md shadow-indigo-600/30 flex items-center space-x-1.5 whitespace-nowrap"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Category</span>
                </button>
              </div>
            </div>

            {/* Categories Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-100/90 dark:bg-[#0d1322] border-b border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-400 font-extrabold uppercase text-[11px]">
                  <tr>
                    <th className="px-5 py-3.5 min-w-[220px]">Category Name</th>
                    <th className="px-5 py-3.5 min-w-[240px]">Description</th>
                    <th className="px-5 py-3.5 min-w-[140px]">Assigned Vendors</th>
                    <th className="px-5 py-3.5 min-w-[140px]">Linked Leads</th>
                    <th className="px-5 py-3.5 min-w-[130px]">Created Date</th>
                    <th className="px-5 py-3.5 text-right min-w-[120px]">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60 text-slate-800 dark:text-slate-300">
                  {filteredCategories.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-5 py-12 text-center text-slate-500 font-medium">
                        No categories found matching "{searchTerm}".
                      </td>
                    </tr>
                  ) : (
                    filteredCategories.map((cat) => (
                      <tr key={cat.id} className="hover:bg-slate-50/90 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="px-5 py-4">
                          <div className="flex items-center space-x-2.5">
                            <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/80 border border-indigo-200 dark:border-indigo-500/30 flex items-center justify-center shrink-0 text-indigo-700 dark:text-indigo-400 font-extrabold text-xs">
                              <Tag className="w-3.5 h-3.5" />
                            </div>
                            <span className="font-extrabold text-slate-900 dark:text-slate-100 text-sm">
                              {cat.name}
                            </span>
                          </div>
                        </td>

                        <td className="px-5 py-4">
                          <p className="text-slate-600 dark:text-slate-400 text-xs font-medium truncate max-w-xs">
                            {cat.description || 'No description added'}
                          </p>
                        </td>

                        <td className="px-5 py-4">
                          <span className="px-2.5 py-1 bg-indigo-50 dark:bg-indigo-950/70 border border-indigo-200 dark:border-indigo-500/30 text-indigo-800 dark:text-indigo-300 rounded-lg text-xs font-extrabold flex items-center space-x-1 w-fit">
                            <Building2 className="w-3.5 h-3.5" />
                            <span>{cat.vendorCount} Vendors</span>
                          </span>
                        </td>

                        <td className="px-5 py-4">
                          <span className="px-2.5 py-1 bg-emerald-50 dark:bg-emerald-950/70 border border-emerald-200 dark:border-emerald-500/30 text-emerald-800 dark:text-emerald-300 rounded-lg text-xs font-extrabold flex items-center space-x-1 w-fit">
                            <FileText className="w-3.5 h-3.5" />
                            <span>{cat.leadCount} Leads</span>
                          </span>
                        </td>

                        <td className="px-5 py-4 text-slate-600 dark:text-slate-400 font-medium">
                          {formatDate(cat.created_at)}
                        </td>

                        <td className="px-5 py-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end space-x-2">
                            <button
                              onClick={() => {
                                setEditingCategory(cat);
                                setCatFormData({ name: cat.name, description: cat.description || '' });
                              }}
                              className="p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-amber-700 dark:hover:text-amber-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                              title="Edit Category"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>

                            <button
                              onClick={() => setDeletingCategory(cat)}
                              className="p-1.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/60 border border-rose-200 dark:border-rose-500/20 transition-colors"
                              title="Delete Category"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 2: COMPANY PROFILE & INFO */}
      {activeSection === 'company' && (
        <form onSubmit={handleSaveSystemSettings} className="bg-white dark:bg-[#111827] border border-slate-200/90 dark:border-slate-800/80 rounded-2xl p-6 space-y-6 shadow-sm dark:shadow-xl">
          <div className="border-b border-slate-200 dark:border-slate-800 pb-4">
            <h3 className="font-extrabold text-slate-900 dark:text-slate-100 text-base flex items-center space-x-2">
              <Briefcase className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span>Company & Procurement Organization Profile</span>
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">
              Information displayed on quotation requests, vendor communications, and portal headers.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs">
            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-extrabold mb-1.5">
                Company / Organization Name *
              </label>
              <input
                type="text"
                required
                value={settings.company_name}
                onChange={(e) => setSettings({ ...settings, company_name: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-slate-100 font-bold focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-extrabold mb-1.5">
                Official Procurement Email *
              </label>
              <input
                type="email"
                required
                value={settings.official_email}
                onChange={(e) => setSettings({ ...settings, official_email: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-slate-100 font-bold focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-extrabold mb-1.5">
                Official Phone / WhatsApp Number *
              </label>
              <input
                type="text"
                required
                value={settings.phone_number}
                onChange={(e) => setSettings({ ...settings, phone_number: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-slate-100 font-bold focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-extrabold mb-1.5">
                GSTIN / Tax Identification Number
              </label>
              <input
                type="text"
                value={settings.gstin_number}
                onChange={(e) => setSettings({ ...settings, gstin_number: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-slate-100 font-mono font-bold focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-slate-700 dark:text-slate-300 font-extrabold mb-1.5">
                Registered Office Address
              </label>
              <textarea
                rows={3}
                value={settings.office_address}
                onChange={(e) => setSettings({ ...settings, office_address: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-slate-100 font-medium focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-slate-200 dark:border-slate-800">
            <button
              type="submit"
              disabled={settingsLoading}
              className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs shadow-md shadow-indigo-600/30 flex items-center space-x-2 disabled:opacity-50 transition-all"
            >
              {settingsLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              <span>Save Company Profile</span>
            </button>
          </div>
        </form>
      )}

      {/* SECTION 4: EMAIL & WHATSAPP DISPATCH TEMPLATES */}
      {activeSection === 'dispatches' && (
        <form onSubmit={handleSaveSystemSettings} className="bg-white dark:bg-[#111827] border border-slate-200/90 dark:border-slate-800/80 rounded-2xl p-6 space-y-6 shadow-sm dark:shadow-xl">
          <div className="border-b border-slate-200 dark:border-slate-800 pb-4">
            <h3 className="font-extrabold text-slate-900 dark:text-slate-100 text-base flex items-center space-x-2">
              <Mail className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span>Quotation Dispatch Templates (Step 4)</span>
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">
              Configure subject prefixes, footer sign-off notes, and WhatsApp prefill headers.
            </p>
          </div>

          <div className="space-y-4 text-xs">
            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-extrabold mb-1.5">
                Email Subject Prefix
              </label>
              <input
                type="text"
                required
                value={settings.email_subject_prefix}
                onChange={(e) => setSettings({ ...settings, email_subject_prefix: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-slate-100 font-bold focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-extrabold mb-1.5">
                Quotation Email Footer Note / Instructions
              </label>
              <textarea
                rows={3}
                value={settings.email_footer_note}
                onChange={(e) => setSettings({ ...settings, email_footer_note: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-slate-100 font-medium focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-extrabold mb-1.5">
                WhatsApp Web Message Header
              </label>
              <input
                type="text"
                required
                value={settings.whatsapp_header}
                onChange={(e) => setSettings({ ...settings, whatsapp_header: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-slate-100 font-bold focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-slate-200 dark:border-slate-800">
            <button
              type="submit"
              disabled={settingsLoading}
              className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs shadow-md shadow-indigo-600/30 flex items-center space-x-2 disabled:opacity-50 transition-all"
            >
              {settingsLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              <span>Save Template Config</span>
            </button>
          </div>
        </form>
      )}

      {/* SECTION 5: SMTP SERVER CONFIGURATION */}
      {activeSection === 'smtp' && (
        <form onSubmit={handleSaveSystemSettings} className="bg-white dark:bg-[#111827] border border-slate-200/90 dark:border-slate-800/80 rounded-2xl p-6 space-y-6 shadow-sm dark:shadow-xl">
          <div className="border-b border-slate-200 dark:border-slate-800 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h3 className="font-extrabold text-slate-900 dark:text-slate-100 text-base flex items-center space-x-2">
                <Globe className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <span>SMTP Outgoing Mail Server Settings</span>
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                Configure your custom SMTP mail host to send quotation emails and automated notifications directly to vendors.
              </p>
            </div>

            <button
              type="button"
              onClick={handleTestSmtpConnection}
              disabled={testSmtpLoading}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-indigo-700 dark:text-indigo-300 font-extrabold text-xs border border-indigo-200 dark:border-indigo-500/30 flex items-center space-x-2 shrink-0 transition-all"
            >
              {testSmtpLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />}
              <span>Test Connection</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs">
            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-extrabold mb-1.5">
                SMTP Host / Server Address *
              </label>
              <input
                type="text"
                placeholder="e.g. smtp.gmail.com or smtp.mailtrap.io"
                value={settings.smtp_host || ''}
                onChange={(e) => setSettings({ ...settings, smtp_host: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-slate-100 font-mono font-bold focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-extrabold mb-1.5">
                SMTP Port *
              </label>
              <input
                type="number"
                placeholder="587 or 465"
                value={settings.smtp_port || 587}
                onChange={(e) => setSettings({ ...settings, smtp_port: Number(e.target.value) })}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-slate-100 font-mono font-bold focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-extrabold mb-1.5">
                Security Protocol
              </label>
              <select
                value={settings.smtp_secure ? 'tls' : 'starttls'}
                onChange={(e) => setSettings({ ...settings, smtp_secure: e.target.value === 'tls' })}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-slate-100 font-bold focus:outline-none focus:border-indigo-500"
              >
                <option value="starttls">STARTTLS / Port 587 (Standard Recommended)</option>
                <option value="tls">SSL / TLS / Port 465</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-extrabold mb-1.5">
                Sender Name (From Name)
              </label>
              <input
                type="text"
                placeholder="e.g. Procurement Team | BizzGrow"
                value={settings.smtp_from_name || ''}
                onChange={(e) => setSettings({ ...settings, smtp_from_name: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-slate-100 font-bold focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-extrabold mb-1.5">
                SMTP Auth Username / Email
              </label>
              <input
                type="text"
                placeholder="e.g. procurement@bizzgrow.com"
                value={settings.smtp_user || ''}
                onChange={(e) => setSettings({ ...settings, smtp_user: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-slate-100 font-bold focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-extrabold mb-1.5">
                SMTP Auth Password / App Password
              </label>
              <input
                type="password"
                placeholder="••••••••••••••••"
                value={settings.smtp_pass || ''}
                onChange={(e) => setSettings({ ...settings, smtp_pass: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-slate-100 font-mono font-bold focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-slate-700 dark:text-slate-300 font-extrabold mb-1.5">
                Sender Email Address (From Email)
              </label>
              <input
                type="email"
                placeholder="e.g. procurement@bizzgrow.com"
                value={settings.smtp_from_email || ''}
                onChange={(e) => setSettings({ ...settings, smtp_from_email: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-slate-100 font-bold focus:outline-none focus:border-indigo-500"
              />
              <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                Must match your SMTP server authorized sender address.
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-800">
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="smtp_enabled"
                checked={settings.smtp_enabled ?? true}
                onChange={(e) => setSettings({ ...settings, smtp_enabled: e.target.checked })}
                className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 dark:bg-slate-900 dark:border-slate-800"
              />
              <label htmlFor="smtp_enabled" className="text-xs font-extrabold text-slate-800 dark:text-slate-200">
                Enable Outgoing Email Dispatches
              </label>
            </div>

            <button
              type="submit"
              disabled={settingsLoading}
              className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs shadow-md shadow-indigo-600/30 flex items-center space-x-2 disabled:opacity-50 transition-all"
            >
              {settingsLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              <span>Save SMTP Settings</span>
            </button>
          </div>
        </form>
      )}

      {/* SECTION 6: SECURITY & 2FA CONFIGURATION */}
      {activeSection === 'security' && (
        <div className="space-y-6">
          {/* Main 2FA Overview Banner */}
          <div className="bg-white dark:bg-[#111827] border border-slate-200/90 dark:border-slate-800/80 rounded-2xl p-6 space-y-2 shadow-sm dark:shadow-xl">
            <div className="flex items-center space-x-2 text-xs font-extrabold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
              <ShieldCheck className="w-4 h-4" />
              <span>Multi-Factor Authentication (MFA) Control Panel</span>
            </div>
            <h2 className="text-xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
              Enterprise Multi-Layer Account Protection
            </h2>
            <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">
              Configure authenticator apps, email OTP verification, and single-use emergency recovery codes. Users can select their preferred verification method on login.
            </p>
          </div>

          {/* CARD 1: TOTP AUTHENTICATOR APP */}
          <div className="bg-white dark:bg-[#111827] border border-slate-200/90 dark:border-slate-800/80 rounded-2xl p-6 space-y-4 shadow-sm dark:shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="font-extrabold text-slate-900 dark:text-slate-100 text-base flex items-center space-x-2">
                <QrCode className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                <span>1. Authenticator App (TOTP 2FA)</span>
              </h3>
              <span
                className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase ${
                  isMfaEnabled
                    ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
                }`}
              >
                {isMfaEnabled ? 'Active' : 'Disabled'}
              </span>
            </div>

            {mfaStatusLoading ? (
              <div className="flex items-center py-6 text-slate-500">
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
                <span className="text-xs font-semibold">Checking TOTP Status...</span>
              </div>
            ) : isMfaEnabled ? (
              <div className="bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-500/30 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center space-x-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <div className="text-xs">
                    <p className="font-extrabold text-slate-900 dark:text-slate-100">
                      TOTP Authenticator App is Enforced
                    </p>
                    <p className="text-slate-600 dark:text-slate-400">
                      Secured with factor ({totpFactor?.friendly_name || 'Authenticator App'}).
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowDisableModal(true)}
                  className="px-4 py-2 bg-rose-50 dark:bg-rose-950/50 hover:bg-rose-100 dark:hover:bg-rose-900 text-rose-700 dark:text-rose-300 font-extrabold text-xs rounded-xl border border-rose-200 dark:border-rose-800 transition-all shrink-0 flex items-center space-x-1.5"
                >
                  <Lock className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                  <span>Disable TOTP</span>
                </button>
              </div>
            ) : (
              <div className="bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="text-xs space-y-1">
                  <p className="font-bold text-slate-900 dark:text-slate-100">
                    Use Google Authenticator, Authy, or 1Password.
                  </p>
                  <p className="text-slate-500 dark:text-slate-400">
                    Scan a QR code and enter a 6-digit TOTP key.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleStartEnrollment}
                  disabled={enrollLoading}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs rounded-xl shadow-md shadow-indigo-600/30 transition-all shrink-0 flex items-center space-x-1.5 disabled:opacity-50"
                >
                  {enrollLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <QrCode className="w-4 h-4" />}
                  <span>Enable TOTP 2FA</span>
                </button>
              </div>
            )}
          </div>

          {/* CARD 2: EMAIL OTP 2FA */}
          <div className="bg-white dark:bg-[#111827] border border-slate-200/90 dark:border-slate-800/80 rounded-2xl p-6 space-y-4 shadow-sm dark:shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="font-extrabold text-slate-900 dark:text-slate-100 text-base flex items-center space-x-2">
                <Mail className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                <span>2. Email OTP 2FA Verification</span>
              </h3>
              <span
                className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase ${
                  isEmailOtpEnabled
                    ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
                }`}
              >
                {isEmailOtpEnabled ? 'Active' : 'Disabled'}
              </span>
            </div>

            {!isSmtpConfigured ? (
              /* SMTP NOT CONFIGURED PROMPT */
              <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-500/30 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
                <div className="flex items-start space-x-3">
                  <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-extrabold text-amber-950 dark:text-amber-200">
                      SMTP Server Credentials Required
                    </p>
                    <p className="text-amber-800 dark:text-amber-300">
                      To enable Email OTP 2FA, please enter your SMTP server credentials under the SMTP tab first.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setActiveSection('smtp')}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white font-extrabold text-xs rounded-xl shadow-md shadow-amber-600/30 transition-all shrink-0 flex items-center space-x-1.5"
                >
                  <Globe className="w-4 h-4" />
                  <span>Configure SMTP Now</span>
                </button>
              </div>
            ) : isEmailOtpEnabled ? (
              /* EMAIL OTP ENABLED */
              <div className="bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-500/30 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center space-x-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <div className="text-xs">
                    <p className="font-extrabold text-slate-900 dark:text-slate-100">
                      Email OTP 2FA is Verified & Active
                    </p>
                    <p className="text-slate-600 dark:text-slate-400">
                      Dispatches a 6-digit verification code to your registered email on login.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleDisableEmailOtp}
                  disabled={emailOtpLoading}
                  className="px-4 py-2 bg-rose-50 dark:bg-rose-950/50 hover:bg-rose-100 dark:hover:bg-rose-900 text-rose-700 dark:text-rose-300 font-extrabold text-xs rounded-xl border border-rose-200 dark:border-rose-800 transition-all shrink-0 flex items-center space-x-1.5 disabled:opacity-50"
                >
                  {emailOtpLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
                  <span>Disable Email OTP</span>
                </button>
              </div>
            ) : (
              /* EMAIL OTP DISABLED */
              <div className="bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="text-xs space-y-1">
                  <p className="font-bold text-slate-900 dark:text-slate-100">
                    Receive a 6-Digit Code in Your Email Inbox
                  </p>
                  <p className="text-slate-500 dark:text-slate-400">
                    Requires a test verification code to confirm email delivery before activation.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleStartEmailOtpSetup}
                  disabled={emailOtpLoading}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs rounded-xl shadow-md shadow-indigo-600/30 transition-all shrink-0 flex items-center space-x-1.5 disabled:opacity-50"
                >
                  {emailOtpLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  <span>Enable Email OTP 2FA</span>
                </button>
              </div>
            )}
          </div>

          {/* CARD 3: EMERGENCY BACKUP RECOVERY CODES */}
          <div className="bg-white dark:bg-[#111827] border border-slate-200/90 dark:border-slate-800/80 rounded-2xl p-6 space-y-4 shadow-sm dark:shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="font-extrabold text-slate-900 dark:text-slate-100 text-base flex items-center space-x-2">
                <LifeBuoy className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                <span>3. Emergency Backup Recovery Codes</span>
              </h3>
              <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-indigo-100 dark:bg-indigo-950 text-indigo-800 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 font-mono">
                {backupCodesCount} Codes Available
              </span>
            </div>

            <div className="bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="text-xs space-y-1">
                <p className="font-bold text-slate-900 dark:text-slate-100">
                  Single-Use Recovery Codes for Account Access
                </p>
                <p className="text-slate-500 dark:text-slate-400">
                  If you lose your smartphone or authenticator app, enter one of these backup keys to log in.
                </p>
              </div>

              <button
                type="button"
                onClick={handleGenerateBackupCodes}
                disabled={backupLoading}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs rounded-xl shadow-md shadow-indigo-600/30 transition-all shrink-0 flex items-center space-x-1.5 disabled:opacity-50"
              >
                {backupLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                <span>{backupCodesCount > 0 ? 'Regenerate Backup Codes' : 'Generate Backup Codes'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ENABLE 2FA MODAL */}
      {showEnrollModal && enrollData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-md animate-fade-in">
          <div className="bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 max-w-lg w-full shadow-2xl space-y-5">
            <div className="flex items-center space-x-3 text-indigo-600 dark:text-indigo-400">
              <div className="p-3 bg-indigo-50 dark:bg-indigo-950/60 rounded-xl border border-indigo-200 dark:border-indigo-900">
                <QrCode className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-extrabold text-slate-900 dark:text-slate-100 text-base">
                  Setup Two-Factor Authentication
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  Scan the QR code below with your authenticator app.
                </p>
              </div>
            </div>

            <div className="space-y-4">
              {/* QR CODE & SECRET */}
              <div className="flex flex-col sm:flex-row items-center gap-4 p-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl">
                <div className="bg-white p-2 rounded-xl shadow-xs border border-slate-200 dark:border-slate-700 shrink-0">
                  <img
                    src={enrollData.qrCode}
                    alt="Authenticator QR Code"
                    className="w-36 h-36"
                  />
                </div>

                <div className="space-y-2 text-xs w-full">
                  <p className="font-extrabold text-slate-800 dark:text-slate-200">
                    Manual Entry Key:
                  </p>
                  <div className="p-2.5 bg-white dark:bg-slate-955 border border-slate-200 dark:border-slate-800 rounded-lg font-mono text-[11px] font-bold text-slate-900 dark:text-slate-100 break-all flex items-center justify-between">
                    <span>{enrollData.secret}</span>
                    <button
                      type="button"
                      onClick={handleCopySecret}
                      className="p-1 text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 ml-2 shrink-0"
                      title="Copy Secret Key"
                    >
                      {copiedSecret ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Issuer: <strong className="text-slate-700 dark:text-slate-300">TechnoSphere</strong>
                  </p>
                </div>
              </div>

              {/* VERIFICATION FORM */}
              <form onSubmit={handleVerifyEnrollment} className="space-y-4 text-xs">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1.5">
                    Enter 6-Digit Authenticator Code *
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    autoFocus
                    value={enrollCode}
                    onChange={(e) => setEnrollCode(e.target.value.replace(/\D/g, ''))}
                    placeholder="000000"
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-center text-lg font-mono tracking-[0.4em] text-slate-900 dark:text-slate-100 font-bold focus:outline-none focus:border-indigo-500"
                  />
                  <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                    Enter the code generated by your authenticator app to complete setup.
                  </p>
                </div>

                <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => {
                      setShowEnrollModal(false);
                      setEnrollData(null);
                    }}
                    className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 font-bold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={enrollLoading || enrollCode.length < 6}
                    className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold shadow-md shadow-indigo-600/30 flex items-center space-x-2 disabled:opacity-50 transition-all"
                  >
                    {enrollLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                    <span>Verify & Enable 2FA</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* DISABLE 2FA CONFIRMATION MODAL */}
      {showDisableModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-md animate-fade-in">
          <div className="bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center space-x-3 text-rose-600 dark:text-rose-400">
              <div className="p-3 bg-rose-50 dark:bg-rose-950/60 rounded-xl border border-rose-200 dark:border-rose-900">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-extrabold text-slate-900 dark:text-slate-100 text-base">
                  Disable Two-Factor Authentication
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  This will remove 2FA security from your account.
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
              Are you sure you want to disable TOTP 2FA? Your account will rely solely on password protection.
            </p>

            <form onSubmit={handleDisable2FA} className="space-y-4 text-xs pt-2">
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
                  6-Digit Authenticator Code (Optional Verification)
                </label>
                <input
                  type="text"
                  maxLength={6}
                  value={disableCode}
                  onChange={(e) => setDisableCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="000000"
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-center text-lg font-mono tracking-[0.4em] text-slate-900 dark:text-slate-100 font-bold focus:outline-none focus:border-rose-500"
                />
              </div>

              <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowDisableModal(false)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={disableLoading}
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-extrabold flex items-center space-x-2 shadow-md shadow-rose-600/30 disabled:opacity-50 transition-all"
                >
                  {disableLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
                  <span>Disable 2FA Now</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EMAIL OTP VERIFICATION MODAL */}
      {showEmailOtpModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-md animate-fade-in">
          <div className="bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center space-x-3 text-indigo-600 dark:text-indigo-400">
              <div className="p-3 bg-indigo-50 dark:bg-indigo-950/60 rounded-xl border border-indigo-200 dark:border-indigo-900">
                <Mail className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-extrabold text-slate-900 dark:text-slate-100 text-base">
                  Verify Email OTP Setup
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  Enter the 6-digit passcode dispatched to your email.
                </p>
              </div>
            </div>

            <form onSubmit={handleVerifyEmailOtpSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1.5">
                  6-Digit Verification Code *
                </label>
                <input
                  type="text"
                  required
                  maxLength={6}
                  autoFocus
                  value={emailOtpCode}
                  onChange={(e) => setEmailOtpCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="000000"
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-center text-lg font-mono tracking-[0.4em] text-slate-900 dark:text-slate-100 font-bold focus:outline-none focus:border-indigo-500"
                />
                <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                  Check your inbox for the code from TechnoSphere.
                </p>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowEmailOtpModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={emailOtpLoading || emailOtpCode.length < 6}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold shadow-md shadow-indigo-600/30 flex items-center space-x-2 disabled:opacity-50 transition-all"
                >
                  {emailOtpLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>Verify & Activate</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EMERGENCY BACKUP CODES DISPLAY MODAL */}
      {showBackupModal && generatedBackupCodes.length > 0 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-md animate-fade-in">
          <div className="bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 max-w-lg w-full shadow-2xl space-y-5">
            <div className="flex items-center space-x-3 text-indigo-600 dark:text-indigo-400">
              <div className="p-3 bg-indigo-50 dark:bg-indigo-950/60 rounded-xl border border-indigo-200 dark:border-indigo-900">
                <LifeBuoy className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-extrabold text-slate-900 dark:text-slate-100 text-base">
                  Emergency Recovery Backup Codes
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  Save these single-use recovery codes in a safe place.
                </p>
              </div>
            </div>

            <div className="p-4 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-500/30 rounded-xl text-xs text-amber-900 dark:text-amber-200 font-medium space-y-1">
              <p className="font-extrabold flex items-center space-x-1.5">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Important Safety Warning:</span>
              </p>
              <p className="text-[11px] text-amber-800 dark:text-amber-300">
                Each code can only be used <strong>ONCE</strong> to log in if you lose your phone or authenticator app. Store them securely.
              </p>
            </div>

            {/* CODES GRID */}
            <div className="grid grid-cols-2 gap-2 bg-slate-50 dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 font-mono text-xs font-black text-slate-900 dark:text-slate-100 text-center tracking-wider">
              {generatedBackupCodes.map((code, idx) => (
                <div key={idx} className="p-2 bg-white dark:bg-slate-955 border border-slate-200 dark:border-slate-800 rounded-lg">
                  {code}
                </div>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
              <div className="flex items-center space-x-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={handleCopyAllBackupCodes}
                  className="px-3.5 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-800 dark:text-slate-200 font-extrabold rounded-xl text-xs flex items-center justify-center space-x-1.5 flex-1 sm:flex-none border border-slate-200 dark:border-slate-700 transition-all"
                >
                  {copiedBackupCodes ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                  <span>{copiedBackupCodes ? 'Copied All!' : 'Copy All'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleDownloadBackupCodes}
                  className="px-3.5 py-2 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 text-indigo-700 dark:text-indigo-300 font-extrabold rounded-xl text-xs flex items-center justify-center space-x-1.5 flex-1 sm:flex-none border border-indigo-200 dark:border-indigo-800 transition-all"
                >
                  <Download className="w-4 h-4" />
                  <span>Download .txt</span>
                </button>
              </div>

              <button
                type="button"
                onClick={() => setShowBackupModal(false)}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold rounded-xl text-xs shadow-md shadow-indigo-600/30 w-full sm:w-auto"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CREATE CATEGORY MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-md animate-fade-in">
          <div className="bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center space-x-3 text-indigo-600 dark:text-indigo-400">
              <div className="p-3 bg-indigo-50 dark:bg-indigo-950/60 rounded-xl border border-indigo-200 dark:border-indigo-900">
                <Tag className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-slate-900 dark:text-slate-100 text-base">Add New Category</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">e.g. Lenovo Commercial, Networking, etc.</p>
              </div>
            </div>

            <form onSubmit={handleCreateCategorySubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">Category Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Lenovo Commercial"
                  value={catFormData.name}
                  onChange={(e) => setCatFormData({ ...catFormData, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-slate-100 font-semibold focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">Description</label>
                <textarea
                  rows={3}
                  placeholder="e.g. Commercial laptops, ThinkPad series, workstations, and enterprise hardware."
                  value={catFormData.description}
                  onChange={(e) => setCatFormData({ ...catFormData, description: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-slate-100 font-semibold focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={catLoading}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold shadow-md shadow-indigo-600/30 flex items-center space-x-2 disabled:opacity-50 transition-all"
                >
                  {catLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>Create Category</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT CATEGORY MODAL */}
      {editingCategory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-md animate-fade-in">
          <div className="bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center space-x-3 text-indigo-600 dark:text-indigo-400">
              <div className="p-3 bg-indigo-50 dark:bg-indigo-950/60 rounded-xl border border-indigo-200 dark:border-indigo-900">
                <Pencil className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-slate-900 dark:text-slate-100 text-base">Edit Category</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Update category name or description.</p>
              </div>
            </div>

            <form onSubmit={handleUpdateCategorySubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">Category Name *</label>
                <input
                  type="text"
                  required
                  value={catFormData.name}
                  onChange={(e) => setCatFormData({ ...catFormData, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-slate-100 font-semibold focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">Description</label>
                <textarea
                  rows={3}
                  value={catFormData.description}
                  onChange={(e) => setCatFormData({ ...catFormData, description: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-slate-100 font-semibold focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingCategory(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={catLoading}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold shadow-md shadow-indigo-600/30 flex items-center space-x-2 disabled:opacity-50 transition-all"
                >
                  {catLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>Save Changes</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CATEGORY CONFIRMATION MODAL */}
      {deletingCategory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-md animate-fade-in">
          <div className="bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center space-x-3 text-rose-600 dark:text-rose-400">
              <div className="p-3 bg-rose-50 dark:bg-rose-950/60 rounded-xl border border-rose-200 dark:border-rose-900">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-extrabold text-slate-900 dark:text-slate-100 text-base">Delete Category</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">This action cannot be undone.</p>
              </div>
            </div>

            <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
              Are you sure you want to delete category <strong className="text-indigo-600 dark:text-indigo-400">{deletingCategory.name}</strong>?
              {deletingCategory.leadCount > 0 ? (
                <span className="block mt-2 font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/60 p-2 rounded border border-rose-200 dark:border-rose-900">
                  ⚠️ Note: {deletingCategory.leadCount} lead(s) are currently assigned to this category.
                </span>
              ) : null}
            </p>

            <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setDeletingCategory(null)}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                disabled={catDeleteLoading}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-extrabold flex items-center space-x-2 shadow-md shadow-rose-600/30 disabled:opacity-50 transition-all"
              >
                {catDeleteLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                <span>Delete Category</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
