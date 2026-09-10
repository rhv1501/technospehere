'use client';

import { useState } from 'react';
import { Layers, Loader2, CheckCircle2 } from 'lucide-react';
import { submitVendorRegistration } from '@/actions/vendors';
import { toast } from 'sonner';

export function PublicVendorRegisterForm({ categories }: { categories: any[] }) {
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    company_name: '',
    contact_person: '',
    email: '',
    whatsapp_number: '',
    address: '',
    gst_number: '',
    notes: '',
    category_ids: [] as string[],
  });

  const handleCategoryToggle = (id: string) => {
    setFormData((prev) => {
      const exists = prev.category_ids.includes(id);
      const category_ids = exists
        ? prev.category_ids.filter((item) => item !== id)
        : [...prev.category_ids, id];
      return { ...prev, category_ids };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.company_name || !formData.contact_person || !formData.email || !formData.whatsapp_number) {
      toast.error('Please fill in all mandatory fields');
      return;
    }

    setLoading(true);
    const res = await submitVendorRegistration(formData);
    setLoading(false);

    if (res.success) {
      setSubmitted(true);
      toast.success('Registration submitted successfully');
    } else {
      toast.error(res.error || 'Failed to submit registration');
    }
  };

  if (submitted) {
    return (
      <div className="bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-8 text-center space-y-4 shadow-sm animate-fade-in">
        <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/50 flex items-center justify-center mx-auto">
          <CheckCircle2 className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Registration Submitted</h2>
        <p className="text-xs text-slate-600 dark:text-slate-300 max-w-md mx-auto leading-relaxed">
          Thank you for registering <strong className="text-slate-900 dark:text-slate-100">{formData.company_name}</strong>.
          Our procurement team will review your details shortly.
        </p>
        <div className="pt-2">
          <button
            onClick={() => {
              setSubmitted(false);
              setFormData({
                company_name: '',
                contact_person: '',
                email: '',
                whatsapp_number: '',
                address: '',
                gst_number: '',
                notes: '',
                category_ids: [],
              });
            }}
            className="px-4 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-medium transition-colors"
          >
            Submit Another Application
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-slate-800/80 rounded-2xl overflow-hidden shadow-sm">
      {/* Header */}
      <div className="bg-slate-50 dark:bg-[#0d1322] border-b border-slate-200/80 dark:border-slate-800/80 p-6">
        <div className="flex items-center space-x-3 mb-1">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100 tracking-tight">Vendor Partner Onboarding</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">TechnoSphere Procurement Portal</p>
          </div>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
          Complete the official vendor registration form to receive enterprise quotation requests.
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="p-6 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Company Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Apex Infotech Pvt Ltd"
              value={formData.company_name}
              onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-lg text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Contact Person <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Rajesh Kumar"
              value={formData.contact_person}
              onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-lg text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Official Email <span className="text-rose-500">*</span>
            </label>
            <input
              type="email"
              required
              placeholder="sales@company.com"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-lg text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              WhatsApp Number <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="+91 98765 43210"
              value={formData.whatsapp_number}
              onChange={(e) => setFormData({ ...formData, whatsapp_number: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-lg text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              GST Number (Optional)
            </label>
            <input
              type="text"
              placeholder="29ABCDE1234F1Z5"
              value={formData.gst_number}
              onChange={(e) => setFormData({ ...formData, gst_number: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-lg text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500 font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Office Address (Optional)
            </label>
            <input
              type="text"
              placeholder="City, State, Country"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-lg text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        {/* Product Categories */}
        <div>
          <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
            Select Supply Categories
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-slate-50 dark:bg-slate-900 p-3 rounded-lg border border-slate-200/80 dark:border-slate-800/80 max-h-48 overflow-y-auto">
            {categories.map((cat) => {
              const isChecked = formData.category_ids.includes(cat.id);
              return (
                <label
                  key={cat.id}
                  onClick={() => handleCategoryToggle(cat.id)}
                  className={`flex items-center space-x-2.5 p-2 rounded-md cursor-pointer text-xs font-medium transition-colors ${
                    isChecked
                      ? 'bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800/50 text-indigo-700 dark:text-indigo-300'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/50'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => {}}
                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>{cat.name}</span>
                </label>
              );
            })}
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
            Additional Partner Info / Notes
          </label>
          <textarea
            rows={3}
            placeholder="Describe your line of business, OEM authorized partnerships, etc..."
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-lg text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-lg text-xs transition-colors flex items-center justify-center space-x-2 disabled:opacity-50"
        >
          {loading && <Loader2 className="w-4 h-4 animate-spin" />}
          <span>Submit Vendor Registration</span>
        </button>
      </form>
    </div>
  );
}
