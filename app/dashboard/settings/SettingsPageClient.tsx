'use client';

import { useState } from 'react';
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
} from 'lucide-react';
import { createCategory, updateCategory, deleteCategory } from '@/actions/categories';
import { updateSystemSettings, testSmtpConnection, SystemSettings } from '@/actions/settings';
import { formatDate } from '@/lib/utils';
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
  const [activeSection, setActiveSection] = useState<'categories' | 'company' | 'presets' | 'dispatches' | 'smtp'>('categories');
  const [searchTerm, setSearchTerm] = useState('');
  const [testSmtpLoading, setTestSmtpLoading] = useState(false);

  // System Settings state
  const [settings, setSettings] = useState<SystemSettings>(initialSettings);
  const [settingsLoading, setSettingsLoading] = useState(false);

  // Category Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<CategoryWithStats | null>(null);
  const [deletingCategory, setDeletingCategory] = useState<CategoryWithStats | null>(null);

  // Category Form state
  const [catFormData, setCatFormData] = useState({ name: '', description: '' });
  const [catLoading, setCatLoading] = useState(false);
  const [catDeleteLoading, setCatDeleteLoading] = useState(false);

  // Presets editing temp states
  const [newDeliveryPreset, setNewDeliveryPreset] = useState('');
  const [newWarrantyPreset, setNewWarrantyPreset] = useState('');

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
    if (!catFormData.name.trim()) return;

    setCatLoading(true);
    const res = await createCategory({
      name: catFormData.name,
      description: catFormData.description,
    });
    setCatLoading(false);

    if (res.success) {
      toast.success(`Category "${catFormData.name.trim()}" created successfully!`);
      setShowAddModal(false);
      setCatFormData({ name: '', description: '' });
      router.refresh();
    } else {
      toast.error(res.error || 'Failed to create category');
    }
  };

  const handleUpdateCategorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCategory || !catFormData.name.trim()) return;

    setCatLoading(true);
    const res = await updateCategory(editingCategory.id, {
      name: catFormData.name,
      description: catFormData.description,
    });
    setCatLoading(false);

    if (res.success) {
      toast.success(`Category updated to "${catFormData.name.trim()}"!`);
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

  const handleAddDeliveryPreset = () => {
    if (!newDeliveryPreset.trim()) return;
    if (settings.delivery_terms_presets.includes(newDeliveryPreset.trim())) {
      toast.error('Preset already exists');
      return;
    }
    setSettings({
      ...settings,
      delivery_terms_presets: [...settings.delivery_terms_presets, newDeliveryPreset.trim()],
    });
    setNewDeliveryPreset('');
  };

  const handleRemoveDeliveryPreset = (item: string) => {
    setSettings({
      ...settings,
      delivery_terms_presets: settings.delivery_terms_presets.filter((p) => p !== item),
    });
  };

  const handleAddWarrantyPreset = () => {
    if (!newWarrantyPreset.trim()) return;
    if (settings.warranty_terms_presets.includes(newWarrantyPreset.trim())) {
      toast.error('Preset already exists');
      return;
    }
    setSettings({
      ...settings,
      warranty_terms_presets: [...settings.warranty_terms_presets, newWarrantyPreset.trim()],
    });
    setNewWarrantyPreset('');
  };

  const handleRemoveWarrantyPreset = (item: string) => {
    setSettings({
      ...settings,
      warranty_terms_presets: settings.warranty_terms_presets.filter((p) => p !== item),
    });
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
            Configure categories, company profile, tax slabs, delivery presets, warranty terms, and communication templates.
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
          onClick={() => setActiveSection('presets')}
          className={`px-4 py-2.5 rounded-xl text-xs font-extrabold flex items-center space-x-2 border transition-all whitespace-nowrap ${
            activeSection === 'presets'
              ? 'bg-indigo-600 text-white dark:bg-indigo-600/30 dark:text-indigo-300 border-indigo-600 dark:border-indigo-500/50 shadow-md'
              : 'bg-white dark:bg-slate-900/60 text-slate-700 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/80 shadow-xs'
          }`}
        >
          <Truck className="w-4 h-4" />
          <span>Tax, Delivery & Warranty Presets</span>
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

      {/* SECTION 3: TAX, DELIVERY & WARRANTY PRESETS */}
      {activeSection === 'presets' && (
        <form onSubmit={handleSaveSystemSettings} className="space-y-6">
          {/* Tax Slabs & Default GST */}
          <div className="bg-white dark:bg-[#111827] border border-slate-200/90 dark:border-slate-800/80 rounded-2xl p-6 space-y-4 shadow-sm dark:shadow-xl">
            <div className="border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="font-extrabold text-slate-900 dark:text-slate-100 text-base flex items-center space-x-2">
                <DollarSign className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>Taxation & Default GST Configuration</span>
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                Set default GST tax percentage applied to new quotation lead requirements.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-extrabold mb-1.5">
                  Default Lead GST Rate (%)
                </label>
                <input
                  type="number"
                  step="0.5"
                  required
                  value={settings.default_gst_rate}
                  onChange={(e) => setSettings({ ...settings, default_gst_rate: Number(e.target.value) })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-slate-100 font-bold focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-extrabold mb-1.5">
                  Standard Tax Slabs
                </label>
                <div className="flex items-center space-x-2 pt-1.5">
                  {settings.available_gst_slabs.map((slab) => (
                    <span
                      key={slab}
                      className="px-3 py-1.5 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-500/30 text-emerald-800 dark:text-emerald-300 font-mono font-extrabold rounded-lg"
                    >
                      {slab}%
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Delivery Terms Presets */}
          <div className="bg-white dark:bg-[#111827] border border-slate-200/90 dark:border-slate-800/80 rounded-2xl p-6 space-y-4 shadow-sm dark:shadow-xl">
            <div className="border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="font-extrabold text-slate-900 dark:text-slate-100 text-base flex items-center space-x-2">
                <Truck className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <span>Delivery & Shipping Terms Presets</span>
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                Standard delivery terms available for quick selection when creating or editing leads.
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="text"
                placeholder="e.g. Expedited Air Freight (24 Hours)"
                value={newDeliveryPreset}
                onChange={(e) => setNewDeliveryPreset(e.target.value)}
                className="flex-1 px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
              />
              <button
                type="button"
                onClick={handleAddDeliveryPreset}
                className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-extrabold shadow-md shadow-indigo-600/30 transition-all flex items-center space-x-1"
              >
                <Plus className="w-4 h-4" />
                <span>Add Preset</span>
              </button>
            </div>

            <div className="space-y-2 pt-2">
              {settings.delivery_terms_presets.map((item) => (
                <div
                  key={item}
                  className="p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl flex items-center justify-between text-xs font-bold text-slate-800 dark:text-slate-200"
                >
                  <span>• {item}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveDeliveryPreset(item)}
                    className="p-1 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Warranty Terms Presets */}
          <div className="bg-white dark:bg-[#111827] border border-slate-200/90 dark:border-slate-800/80 rounded-2xl p-6 space-y-4 shadow-sm dark:shadow-xl">
            <div className="border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="font-extrabold text-slate-900 dark:text-slate-100 text-base flex items-center space-x-2">
                <Shield className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <span>Standard Warranty Presets</span>
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                Preset warranty requirements offered in quotation forms.
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="text"
                placeholder="e.g. 3 Years Premier Onsite Support"
                value={newWarrantyPreset}
                onChange={(e) => setNewWarrantyPreset(e.target.value)}
                className="flex-1 px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
              />
              <button
                type="button"
                onClick={handleAddWarrantyPreset}
                className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-extrabold shadow-md shadow-indigo-600/30 transition-all flex items-center space-x-1"
              >
                <Plus className="w-4 h-4" />
                <span>Add Preset</span>
              </button>
            </div>

            <div className="space-y-2 pt-2">
              {settings.warranty_terms_presets.map((item) => (
                <div
                  key={item}
                  className="p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl flex items-center justify-between text-xs font-bold text-slate-800 dark:text-slate-200"
                >
                  <span>• {item}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveWarrantyPreset(item)}
                    className="p-1 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={settingsLoading}
              className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs shadow-md shadow-indigo-600/30 flex items-center space-x-2 disabled:opacity-50 transition-all"
            >
              {settingsLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              <span>Save Presets & Tax Config</span>
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
