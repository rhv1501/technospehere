'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  FileText,
  Send,
  Upload,
  Trash2,
  Paperclip,
  CheckSquare,
  ExternalLink,
  Loader2,
  Mail,
  Phone,
  ArrowLeft,
  Pencil,
  X,
  Save,
  AlertTriangle,
  Calendar,
  Tag,
  DollarSign,
  Package,
  Building2,
  Shield,
} from 'lucide-react';
import {
  assignVendorsToLead,
  sendLeadToVendors,
  prepareWhatsAppMessage,
  uploadLeadAttachment,
  deleteLeadAttachment,
  updateLead,
  deleteLead,
} from '@/actions/leads';
import { formatDate, formatCurrency, formatFileSize, fileToBase64 } from '@/lib/utils';
import { parseLineItemsFromLead, cleanSpecifications, formatReadableSpecifications } from '@/lib/leadUtils';
import { toast } from 'sonner';

interface LeadDetailsViewProps {
  lead: any;
  categories: any[];
  allVendors: any[];
}

export function LeadDetailsView({ lead, categories, allVendors }: LeadDetailsViewProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'overview' | 'step3' | 'step4'>('overview');
  
  // Read-only by default state for Lead details
  const [isEditing, setIsEditing] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Form state for Lead Editing
  const [editFormData, setEditFormData] = useState({
    customer_name: lead.customer_name || '',
    lead_name: lead.lead_name || '',
    product_item: lead.product_item || '',
    quantity: lead.quantity || 1,
    category_id: lead.category_id || '',
    status: lead.status || 'draft',
    due_date: lead.due_date ? new Date(lead.due_date).toISOString().split('T')[0] : '',
    unit_price_estimate: lead.unit_price_estimate !== null && lead.unit_price_estimate !== undefined ? lead.unit_price_estimate : '',
    gst_rate: lead.gst_rate || 18,
    delivery_terms: lead.delivery_terms || '',
    warranty: lead.warranty || '',
    specifications: cleanSpecifications(lead.specifications),
    remarks: lead.remarks || '',
  });

  // Step 3 Vendors state
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>(
    lead.category_id || 'all'
  );
  const [vendorSearch, setVendorSearch] = useState<string>('');
  const initialSelectedVendorIds = (lead.lead_vendors || []).map((lv: any) => lv.vendor_id);
  const [selectedVendorIds, setSelectedVendorIds] = useState<string[]>(initialSelectedVendorIds);

  const [loading, setLoading] = useState(false);
  const [emailLoading, setEmailLoading] = useState(false);
  const [uploadLoading, setUploadLoading] = useState(false);

  // Template preview state
  const [templateCustomRemarks, setTemplateCustomRemarks] = useState(lead.remarks || '');

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';

  // Filter vendors based on Category and Search
  const matchingVendors = allVendors.filter((v) => {
    const matchesCat =
      selectedCategoryFilter === 'all' ||
      (v.categories && v.categories.some((c: any) => c.id === selectedCategoryFilter));

    const matchesSearch =
      !vendorSearch ||
      v.company_name.toLowerCase().includes(vendorSearch.toLowerCase()) ||
      v.contact_person.toLowerCase().includes(vendorSearch.toLowerCase()) ||
      v.email.toLowerCase().includes(vendorSearch.toLowerCase());

    return matchesCat && matchesSearch;
  });

  const handleVendorToggle = (vendor: any) => {
    if (vendor.status !== 'active') {
      toast.error(`Cannot select "${vendor.company_name}" because status is INACTIVE.`);
      return;
    }

    setSelectedVendorIds((prev) => {
      if (prev.includes(vendor.id)) {
        return prev.filter((id) => id !== vendor.id);
      } else {
        return [...prev, vendor.id];
      }
    });
  };

  const handleSaveVendorSelection = async () => {
    setLoading(true);
    const res = await assignVendorsToLead(lead.id, selectedVendorIds);
    setLoading(false);

    if (res.success) {
      toast.success(`Updated vendor selection (${selectedVendorIds.length} vendors assigned)`);
      setActiveTab('step4');
    } else {
      toast.error(res.error || 'Failed to assign vendors');
    }
  };

  const handleSendEmails = async () => {
    if (!selectedVendorIds || selectedVendorIds.length === 0) {
      toast.error('No vendors selected. Please complete Step 3 vendor selection first.');
      return;
    }

    setEmailLoading(true);
    const res = await sendLeadToVendors(lead.id, selectedVendorIds);
    setEmailLoading(false);

    if (res.success) {
      toast.success(`Quotation request successfully emailed to ${res.count} vendors!`);
    } else {
      toast.error(res.error || 'Failed to send emails');
    }
  };

  const handlePrepareWhatsApp = async (vendorId: string, companyName: string) => {
    const res = await prepareWhatsAppMessage(lead.id, vendorId);
    if (res.success && res.whatsappUrl) {
      toast.info(`WhatsApp Web message prefilled for ${companyName}`);
      window.open(res.whatsappUrl, '_blank');
    } else {
      toast.error(res.error || 'Failed to open WhatsApp Web');
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;

    setUploadLoading(true);
    let successCount = 0;

    for (let i = 0; i < e.target.files.length; i++) {
      const file = e.target.files[i];
      try {
        const base64Data = await fileToBase64(file);
        const res = await uploadLeadAttachment({
          leadId: lead.id,
          fileName: file.name,
          fileType: file.type || 'application/octet-stream',
          fileSize: file.size,
          base64Data,
        });

        if (res.success) {
          successCount++;
        } else {
          toast.error(`Upload error for "${file.name}": ${res.error}`);
        }
      } catch (err: any) {
        toast.error(`Failed to process "${file.name}": ${err.message}`);
      }
    }

    setUploadLoading(false);
    if (successCount > 0) {
      toast.success(`${successCount} attachment(s) uploaded successfully!`);
      router.refresh();
    }
  };

  const handleDeleteFile = async (attId: string, filePath: string) => {
    const res = await deleteLeadAttachment(attId, filePath, lead.id);
    if (res.success) {
      toast.info('Attachment deleted');
    } else {
      toast.error(res.error || 'Failed to delete attachment');
    }
  };

  const handleSaveLeadEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveLoading(true);

    const res = await updateLead(lead.id, {
      customer_name: editFormData.customer_name,
      lead_name: editFormData.lead_name,
      product_item: editFormData.product_item,
      quantity: Number(editFormData.quantity),
      category_id: editFormData.category_id || undefined,
      status: editFormData.status as any,
      due_date: editFormData.due_date || undefined,
      unit_price_estimate: editFormData.unit_price_estimate ? Number(editFormData.unit_price_estimate) : undefined,
      gst_rate: editFormData.gst_rate ? Number(editFormData.gst_rate) : 18,
      delivery_terms: editFormData.delivery_terms,
      warranty: editFormData.warranty,
      specifications: editFormData.specifications,
      remarks: editFormData.remarks,
    });

    setSaveLoading(false);

    if (res.success) {
      toast.success('Lead updated successfully!');
      setIsEditing(false);
      router.refresh();
    } else {
      toast.error(res.error || 'Failed to update lead');
    }
  };

  const handleCancelEdit = () => {
    setEditFormData({
      customer_name: lead.customer_name || '',
      lead_name: lead.lead_name || '',
      product_item: lead.product_item || '',
      quantity: lead.quantity || 1,
      category_id: lead.category_id || '',
      status: lead.status || 'draft',
      due_date: lead.due_date ? new Date(lead.due_date).toISOString().split('T')[0] : '',
      unit_price_estimate: lead.unit_price_estimate !== null && lead.unit_price_estimate !== undefined ? lead.unit_price_estimate : '',
      gst_rate: lead.gst_rate || 18,
      delivery_terms: lead.delivery_terms || '',
      warranty: lead.warranty || '',
      specifications: cleanSpecifications(lead.specifications),
      remarks: lead.remarks || '',
    });
    setIsEditing(false);
  };

  const handleDeleteLeadConfirm = async () => {
    setDeleteLoading(true);
    const res = await deleteLead(lead.id);
    setDeleteLoading(false);

    if (res.success) {
      toast.success(`Lead ${lead.lead_number} deleted successfully`);
      router.push('/dashboard/leads');
    } else {
      toast.error(res.error || 'Failed to delete lead');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Lead Header Card */}
      <div className="bg-white dark:bg-[#111827] border border-slate-200/90 dark:border-slate-800/80 rounded-2xl p-6 shadow-sm dark:shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800/80 pb-5">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <Link
                href="/dashboard/leads"
                className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 shadow-xs transition-colors"
                title="Back to Leads"
              >
                <ArrowLeft className="w-4 h-4" />
              </Link>
              <span className="font-mono text-indigo-700 dark:text-indigo-400 font-extrabold text-xs bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-500/30 px-2.5 py-1 rounded-md">
                {lead.lead_number}
              </span>
              <span
                className={`px-3 py-1 rounded-full text-xs font-extrabold capitalize border ${
                  lead.status === 'sent'
                    ? 'bg-indigo-50 dark:bg-indigo-500/15 text-indigo-800 dark:text-indigo-300 border-indigo-200 dark:border-indigo-500/30'
                    : lead.status === 'ready_to_send'
                    ? 'bg-amber-50 dark:bg-amber-500/15 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-500/30'
                    : lead.status === 'quoted' || lead.status === 'completed'
                    ? 'bg-emerald-50 dark:bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-500/30'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                }`}
              >
                Status: {lead.status.replace(/_/g, ' ')}
              </span>

              {isEditing ? (
                <span className="px-2.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/80 text-amber-900 dark:text-amber-300 text-[11px] font-black border border-amber-300 dark:border-amber-700 animate-pulse">
                  Editing Mode Active
                </span>
              ) : (
                <span className="px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 text-[11px] font-bold border border-slate-200 dark:border-slate-800">
                  Read Only
                </span>
              )}
            </div>

            <h1 className="text-xl lg:text-2xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
              {lead.customer_name}
            </h1>
            <p className="text-xs text-slate-600 dark:text-slate-400 font-semibold flex items-center gap-2">
              <span>{lead.lead_name}</span>
              {lead.categories?.name && (
                <>
                  <span>•</span>
                  <span className="text-indigo-600 dark:text-indigo-400 font-bold">{lead.categories.name}</span>
                </>
              )}
            </p>
          </div>

          {/* Action Buttons & Quick Metrics */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            {/* Quick Metrics */}
            <div className="flex items-center space-x-4 bg-slate-50 dark:bg-slate-900/80 p-3 rounded-xl border border-slate-200 dark:border-slate-800 text-xs">
              <div>
                <span className="text-slate-500 dark:text-slate-400 block font-bold">Product</span>
                <span className="font-extrabold text-slate-900 dark:text-slate-200">{lead.product_item}</span>
              </div>
              <div className="h-6 w-px bg-slate-200 dark:bg-slate-800" />
              <div>
                <span className="text-slate-500 dark:text-slate-400 block font-bold">Quantity</span>
                <span className="font-black text-indigo-700 dark:text-indigo-400 text-sm">{lead.quantity}</span>
              </div>
              <div className="h-6 w-px bg-slate-200 dark:bg-slate-800" />
              <div>
                <span className="text-slate-500 dark:text-slate-400 block font-bold">Vendors Assigned</span>
                <span className="font-black text-emerald-700 dark:text-emerald-400 text-sm">
                  {selectedVendorIds.length} Selected
                </span>
              </div>
            </div>

            {/* Edit / Delete Buttons */}
            <div className="flex items-center space-x-2 shrink-0">
              {!isEditing ? (
                <button
                  onClick={() => setIsEditing(true)}
                  className="px-3.5 py-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/80 border border-indigo-200 dark:border-indigo-500/30 text-indigo-700 dark:text-indigo-300 font-extrabold text-xs flex items-center space-x-1.5 transition-colors shadow-xs"
                >
                  <Pencil className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                  <span>Edit Lead</span>
                </button>
              ) : (
                <button
                  onClick={handleCancelEdit}
                  className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-extrabold text-xs flex items-center space-x-1 transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Cancel Edit</span>
                </button>
              )}

              <button
                onClick={() => setShowDeleteModal(true)}
                className="px-3.5 py-2 rounded-xl bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-100 dark:hover:bg-rose-900/80 border border-rose-200 dark:border-rose-500/30 text-rose-700 dark:text-rose-300 font-extrabold text-xs flex items-center space-x-1.5 transition-colors shadow-xs"
                title="Delete Lead"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                <span>Delete Lead</span>
              </button>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center space-x-2 pt-4 overflow-x-auto">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all whitespace-nowrap flex items-center space-x-2 ${
              activeTab === 'overview'
                ? 'bg-indigo-50 dark:bg-indigo-600/20 text-indigo-800 dark:text-indigo-300 border-indigo-300 dark:border-indigo-500/50 shadow-sm'
                : 'bg-slate-50 dark:bg-slate-900/50 text-slate-700 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Lead Specifications & Attachments</span>
          </button>

          <button
            onClick={() => setActiveTab('step3')}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center space-x-2 border transition-all whitespace-nowrap ${
              activeTab === 'step3'
                ? 'bg-indigo-50 dark:bg-indigo-600/20 text-indigo-800 dark:text-indigo-300 border-indigo-300 dark:border-indigo-500/50 shadow-sm'
                : 'bg-slate-50 dark:bg-slate-900/50 text-slate-700 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <span className="w-5 h-5 rounded-full bg-indigo-600 text-white dark:bg-indigo-600/40 dark:text-indigo-200 text-[10px] font-black flex items-center justify-center">
              3
            </span>
            <span>Step 3 — Select Vendors by Category</span>
          </button>

          <button
            onClick={() => setActiveTab('step4')}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center space-x-2 border transition-all whitespace-nowrap ${
              activeTab === 'step4'
                ? 'bg-indigo-50 dark:bg-indigo-600/20 text-indigo-800 dark:text-indigo-300 border-indigo-300 dark:border-indigo-500/50 shadow-sm'
                : 'bg-slate-50 dark:bg-slate-900/50 text-slate-700 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <span className="w-5 h-5 rounded-full bg-indigo-600 text-white dark:bg-indigo-600/40 dark:text-indigo-200 text-[10px] font-black flex items-center justify-center">
              4
            </span>
            <span>Step 4 — Prepare & Send Lead</span>
          </button>
        </div>
      </div>

      {/* TAB 1: LEAD SPECIFICATIONS & ATTACHMENTS (DEFAULT READ ONLY WITH INLINE EDIT) */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white dark:bg-[#111827] border border-slate-200/90 dark:border-slate-800/80 rounded-2xl p-6 space-y-6 shadow-sm dark:shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
              <div>
                <h3 className="font-extrabold text-slate-900 dark:text-slate-100 text-base flex items-center space-x-2">
                  <span>Full Specifications & Terms</span>
                  {isEditing && (
                    <span className="text-xs text-amber-700 dark:text-amber-400 font-bold bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded border border-amber-200 dark:border-amber-800">
                      Editing Form
                    </span>
                  )}
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                  {isEditing
                    ? 'Update lead parameters below and click Save Changes.'
                    : 'Read-only view. Click "Edit Lead" or the toggle button to make changes.'}
                </p>
              </div>

              {!isEditing ? (
                <button
                  onClick={() => setIsEditing(true)}
                  className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs shadow-md shadow-indigo-600/20 flex items-center space-x-1.5 transition-all"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  <span>Edit Lead Details</span>
                </button>
              ) : (
                <div className="flex items-center space-x-2">
                  <button
                    onClick={handleCancelEdit}
                    className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 font-bold text-xs"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>

            {/* READ ONLY MODE */}
            {!isEditing ? (
              <div className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 bg-slate-50 dark:bg-slate-900/80 p-4 rounded-xl border border-slate-200 dark:border-slate-800 text-xs">
                  <div>
                    <span className="text-slate-500 dark:text-slate-400 block font-bold">Customer Name</span>
                    <span className="font-extrabold text-slate-900 dark:text-slate-100 text-sm">{lead.customer_name}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 dark:text-slate-400 block font-bold">PO / Lead Title</span>
                    <span className="font-extrabold text-slate-900 dark:text-slate-200">{lead.lead_name}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 dark:text-slate-400 block font-bold">Category</span>
                    <span className="text-slate-900 dark:text-slate-200 font-extrabold">
                      {lead.categories?.name || 'Unassigned'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 dark:text-slate-400 block font-bold">Required Due Date</span>
                    <span className="text-slate-900 dark:text-slate-300 font-bold">{formatDate(lead.due_date)}</span>
                  </div>
                </div>

                {/* Multi Line-Items Breakdown Table */}
                {(() => {
                  const items = parseLineItemsFromLead(lead);
                  const subtotal = items.reduce(
                    (acc, it) => acc + (it.quantity || 0) * (it.unit_price_estimate || 0),
                    0
                  );
                  const gstRate = lead.gst_rate || 18;
                  const gstVal = subtotal * (gstRate / 100);
                  const totalVal = subtotal + gstVal;

                  return (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center space-x-2">
                          <Package className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                          <span>Procurement Line Items Breakdown ({items.length} Item{items.length > 1 ? 's' : ''})</span>
                        </h4>
                        <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                          Total Units: <strong className="text-indigo-600 dark:text-indigo-400">{lead.quantity}</strong>
                        </span>
                      </div>

                      <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="bg-slate-100/80 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                              <th className="py-2.5 px-3.5 w-12 text-center">#</th>
                              <th className="py-2.5 px-3.5">Product / Item Description</th>
                              <th className="py-2.5 px-3.5 w-20 text-center">Qty</th>
                              <th className="py-2.5 px-3.5 w-32 text-right">Est. Unit Price</th>
                              <th className="py-2.5 px-3.5 w-36 text-right">Line Subtotal</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200 dark:divide-slate-800/80 text-xs">
                            {items.map((it, idx) => {
                              const lineSub = (it.quantity || 0) * (it.unit_price_estimate || 0);

                              return (
                                <tr key={it.id || idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/40 transition-colors">
                                  <td className="py-3 px-3.5 text-center font-mono font-bold text-slate-400">
                                    {idx + 1}
                                  </td>
                                  <td className="py-3 px-3.5">
                                    <div className="font-extrabold text-slate-900 dark:text-slate-100">
                                      {it.product_item || 'Procurement Item'}
                                    </div>
                                    {it.specifications && (
                                      <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 font-medium leading-tight">
                                        {it.specifications}
                                      </div>
                                    )}
                                  </td>
                                  <td className="py-3 px-3.5 text-center font-bold text-indigo-600 dark:text-indigo-400">
                                    {it.quantity}
                                  </td>
                                  <td className="py-3 px-3.5 text-right font-mono font-semibold text-slate-700 dark:text-slate-300">
                                    {it.unit_price_estimate ? `₹${it.unit_price_estimate.toLocaleString('en-IN')}` : '—'}
                                  </td>
                                  <td className="py-3 px-3.5 text-right font-mono font-bold text-slate-900 dark:text-slate-100">
                                    {lineSub > 0 ? `₹${lineSub.toLocaleString('en-IN')}` : '—'}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                          {subtotal > 0 && (
                            <tfoot className="bg-slate-50 dark:bg-slate-900/90 border-t border-slate-200 dark:border-slate-800 text-xs">
                              <tr>
                                <td colSpan={4} className="py-2 px-3.5 text-right font-bold text-slate-600 dark:text-slate-400">
                                  Subtotal:
                                </td>
                                <td className="py-2 px-3.5 text-right font-mono font-bold text-slate-900 dark:text-slate-100">
                                  ₹{subtotal.toLocaleString('en-IN')}
                                </td>
                              </tr>
                              <tr>
                                <td colSpan={4} className="py-2 px-3.5 text-right font-bold text-slate-600 dark:text-slate-400">
                                  GST ({gstRate}%):
                                </td>
                                <td className="py-2 px-3.5 text-right font-mono font-semibold text-slate-600 dark:text-slate-400">
                                  ₹{gstVal.toLocaleString('en-IN')}
                                </td>
                              </tr>
                              <tr className="border-t border-slate-200 dark:border-slate-800">
                                <td colSpan={4} className="py-2.5 px-3.5 text-right font-extrabold text-slate-900 dark:text-slate-100">
                                  Grand Total Estimated:
                                </td>
                                <td className="py-2.5 px-3.5 text-right font-mono font-extrabold text-emerald-600 dark:text-emerald-400 text-sm">
                                  ₹{totalVal.toLocaleString('en-IN')}
                                </td>
                              </tr>
                            </tfoot>
                          )}
                        </table>
                      </div>
                    </div>
                  );
                })()}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-slate-700 dark:text-slate-400 font-bold block mb-1">Delivery Terms</span>
                    <div className="bg-slate-50 dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-300 font-semibold">
                      {lead.delivery_terms || 'Standard shipping'}
                    </div>
                  </div>
                  <div>
                    <span className="text-slate-700 dark:text-slate-400 font-bold block mb-1">Warranty Required</span>
                    <div className="bg-slate-50 dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-300 font-semibold">
                      {lead.warranty || '1 Year Standard Warranty'}
                    </div>
                  </div>
                </div>

                <div>
                  <span className="text-slate-700 dark:text-slate-400 text-xs font-bold block mb-1.5">
                    Remarks & Special Notes
                  </span>
                  <div className="bg-slate-50 dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800 text-xs text-slate-800 dark:text-slate-300 font-medium">
                    {lead.remarks || 'No remarks added.'}
                  </div>
                </div>
              </div>
            ) : (
              /* EDITING MODE FORM */
              <form onSubmit={handleSaveLeadEdit} className="space-y-6 animate-fade-in">
                {/* Basic Identification */}
                <div className="space-y-4">
                  <div className="flex items-center space-x-2 pb-2 border-b border-slate-200 dark:border-slate-800">
                    <Building2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                      1. Customer & Product Details
                    </h4>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                    <div>
                      <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1.5">
                        Customer Name <span className="text-rose-500 font-black">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={editFormData.customer_name}
                        onChange={(e) => setEditFormData({ ...editFormData, customer_name: e.target.value })}
                        className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-slate-100 font-semibold focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1.5">
                        PO / Lead Title <span className="text-rose-500 font-black">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={editFormData.lead_name}
                        onChange={(e) => setEditFormData({ ...editFormData, lead_name: e.target.value })}
                        className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-slate-100 font-semibold focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1.5">
                        Product / Item Required <span className="text-rose-500 font-black">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={editFormData.product_item}
                        onChange={(e) => setEditFormData({ ...editFormData, product_item: e.target.value })}
                        className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-slate-100 font-semibold focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1.5">
                        Category
                      </label>
                      <select
                        value={editFormData.category_id}
                        onChange={(e) => setEditFormData({ ...editFormData, category_id: e.target.value })}
                        className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-slate-100 font-semibold focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all cursor-pointer"
                      >
                        <option value="">Unassigned</option>
                        {categories.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Quantities & Financials */}
                <div className="space-y-4">
                  <div className="flex items-center space-x-2 pb-2 border-b border-slate-200 dark:border-slate-800">
                    <DollarSign className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                      2. Quantities, Status & Commercials
                    </h4>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
                    <div>
                      <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1.5">
                        Quantity <span className="text-rose-500 font-black">*</span>
                      </label>
                      <input
                        type="number"
                        min="1"
                        required
                        value={editFormData.quantity}
                        onChange={(e) => setEditFormData({ ...editFormData, quantity: Number(e.target.value) })}
                        className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-indigo-700 dark:text-indigo-400 font-extrabold focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1.5">
                        Status Workflow
                      </label>
                      <select
                        value={editFormData.status}
                        onChange={(e) => setEditFormData({ ...editFormData, status: e.target.value as any })}
                        className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-slate-100 font-bold capitalize focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all cursor-pointer"
                      >
                        <option value="draft">Draft</option>
                        <option value="ready_to_send">Ready to Send</option>
                        <option value="sent">Sent</option>
                        <option value="quoted">Quoted</option>
                        <option value="completed">Completed</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1.5">
                        Required Due Date
                      </label>
                      <input
                        type="date"
                        value={editFormData.due_date}
                        onChange={(e) => setEditFormData({ ...editFormData, due_date: e.target.value })}
                        className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-slate-100 font-semibold focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all cursor-pointer"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1.5">
                        Unit Price Estimate (₹)
                      </label>
                      <input
                        type="number"
                        placeholder="e.g. 50000"
                        value={editFormData.unit_price_estimate}
                        onChange={(e) => setEditFormData({ ...editFormData, unit_price_estimate: e.target.value })}
                        className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-slate-100 font-semibold focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1.5">
                        Target GST Rate (%)
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        value={editFormData.gst_rate}
                        onChange={(e) => setEditFormData({ ...editFormData, gst_rate: Number(e.target.value) })}
                        className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-slate-100 font-semibold focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
                      />
                    </div>
                  </div>
                </div>

                {/* Terms & Specs */}
                <div className="space-y-4">
                  <div className="flex items-center space-x-2 pb-2 border-b border-slate-200 dark:border-slate-800">
                    <Shield className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                      3. Specifications & Terms
                    </h4>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                    <div>
                      <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1.5">
                        Delivery & Shipping Terms
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Doorstep Delivery within 7 days"
                        value={editFormData.delivery_terms}
                        onChange={(e) => setEditFormData({ ...editFormData, delivery_terms: e.target.value })}
                        className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-slate-100 font-semibold focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1.5">
                        Warranty Requirements
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. 1 Year Manufacturer Warranty"
                        value={editFormData.warranty}
                        onChange={(e) => setEditFormData({ ...editFormData, warranty: e.target.value })}
                        className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-slate-100 font-semibold focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1.5 text-xs">
                      Technical Specifications
                    </label>
                    <textarea
                      rows={3}
                      value={editFormData.specifications}
                      onChange={(e) => setEditFormData({ ...editFormData, specifications: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-slate-100 font-medium text-xs focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all leading-relaxed"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1.5 text-xs">
                      Remarks / Special Notes
                    </label>
                    <textarea
                      rows={2}
                      value={editFormData.remarks}
                      onChange={(e) => setEditFormData({ ...editFormData, remarks: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-slate-100 font-medium text-xs focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all leading-relaxed"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-200 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={handleCancelEdit}
                    className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 font-bold text-xs transition-colors"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={saveLoading}
                    className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs shadow-md shadow-indigo-600/30 flex items-center space-x-2 disabled:opacity-50 transition-all hover:scale-[1.01]"
                  >
                    {saveLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    <span>Save Changes</span>
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Right Attachments Upload & List */}
          <div className="bg-white dark:bg-[#111827] border border-slate-200/90 dark:border-slate-800/80 rounded-2xl p-6 space-y-4 shadow-sm dark:shadow-xl">
            <h3 className="font-extrabold text-slate-900 dark:text-slate-100 text-sm flex items-center justify-between">
              <span>Attachments ({lead.lead_attachments ? lead.lead_attachments.length : 0})</span>
            </h3>

            <div className="border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl p-4 bg-slate-50 dark:bg-slate-900/60 text-center hover:border-indigo-400 transition-colors">
              <input
                type="file"
                multiple
                id="tab-file-upload"
                onChange={handleFileUpload}
                className="hidden"
              />
              <label htmlFor="tab-file-upload" className="cursor-pointer flex flex-col items-center">
                {uploadLoading ? (
                  <Loader2 className="w-5 h-5 text-indigo-600 dark:text-indigo-400 animate-spin mb-1" />
                ) : (
                  <Upload className="w-5 h-5 text-indigo-600 dark:text-indigo-400 mb-1" />
                )}
                <span className="text-xs font-bold text-slate-900 dark:text-slate-200">
                  {uploadLoading ? 'Uploading File...' : 'Upload New Attachment'}
                </span>
              </label>
            </div>

            <div className="space-y-2 max-h-64 overflow-y-auto">
              {lead.lead_attachments && lead.lead_attachments.length > 0 ? (
                lead.lead_attachments.map((att: any) => (
                  <div
                    key={att.id}
                    className="p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl flex items-center justify-between text-xs"
                  >
                    <div className="truncate max-w-[180px]">
                      <a
                        href={`${supabaseUrl}/storage/v1/object/public/lead-attachments/${att.file_path}`}
                        target="_blank"
                        rel="noreferrer"
                        className="font-extrabold text-indigo-700 dark:text-indigo-300 hover:underline flex items-center space-x-1"
                      >
                        <Paperclip className="w-3.5 h-3.5 shrink-0 text-indigo-600 dark:text-indigo-400" />
                        <span className="truncate">{att.file_name}</span>
                      </a>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-mono font-semibold">
                        {formatFileSize(att.file_size)}
                      </span>
                    </div>

                    <button
                      onClick={() => handleDeleteFile(att.id, att.file_path)}
                      className="p-1 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors"
                      title="Delete File"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))
              ) : (
                <div className="text-xs text-slate-500 dark:text-slate-400 text-center py-4 font-medium">No files uploaded yet</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: STEP 3 - SELECT VENDORS BY CATEGORY */}
      {activeTab === 'step3' && (
        <div className="bg-white dark:bg-[#111827] border border-slate-200/90 dark:border-slate-800/80 rounded-2xl p-6 space-y-6 shadow-sm dark:shadow-xl">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
            <div>
              <h3 className="font-extrabold text-slate-900 dark:text-slate-100 text-base">Step 3: Select Vendors by Category</h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                Filter vendors by category. Only <strong className="text-emerald-700 dark:text-emerald-400">Active</strong> vendors can be selected for quotation dispatch.
              </p>
            </div>

            <div className="flex items-center space-x-3">
              <select
                value={selectedCategoryFilter}
                onChange={(e) => setSelectedCategoryFilter(e.target.value)}
                className="px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-slate-200 font-bold focus:outline-none focus:border-indigo-500"
              >
                <option value="all">All Categories</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>

              <input
                type="text"
                placeholder="Search matching vendors..."
                value={vendorSearch}
                onChange={(e) => setVendorSearch(e.target.value)}
                className="px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-slate-200 placeholder-slate-500 dark:placeholder-slate-400 font-semibold focus:outline-none focus:border-indigo-500"
              />

              <button
                onClick={handleSaveVendorSelection}
                disabled={loading}
                className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs shadow-md shadow-indigo-600/30 flex items-center space-x-2 disabled:opacity-50 transition-all"
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                <span>Save & Continue to Step 4 →</span>
              </button>
            </div>
          </div>

          {/* Vendors Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {matchingVendors.length === 0 ? (
              <div className="col-span-full py-12 text-center text-slate-500 dark:text-slate-400 text-xs font-semibold">
                No vendors found for category filter. Add vendors under Vendor Database first.
              </div>
            ) : (
              matchingVendors.map((vendor) => {
                const isSelected = selectedVendorIds.includes(vendor.id);
                const isActive = vendor.status === 'active';

                return (
                  <div
                    key={vendor.id}
                    onClick={() => handleVendorToggle(vendor)}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer relative ${
                      !isActive
                        ? 'bg-slate-50 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800 opacity-60 cursor-not-allowed'
                        : isSelected
                        ? 'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-400 dark:border-indigo-500 shadow-sm'
                        : 'bg-white dark:bg-slate-900/80 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-3">
                        <div
                          className={`w-5 h-5 rounded border flex items-center justify-center shrink-0 ${
                            isSelected
                              ? 'bg-indigo-600 border-indigo-500 text-white'
                              : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-950'
                          }`}
                        >
                          {isSelected && <CheckSquare className="w-3.5 h-3.5" />}
                        </div>
                        <div>
                          <h4 className="font-extrabold text-slate-900 dark:text-slate-100 text-xs truncate max-w-[180px]">
                            {vendor.company_name}
                          </h4>
                          <p className="text-[11px] text-slate-600 dark:text-slate-400 font-semibold">{vendor.contact_person}</p>
                        </div>
                      </div>

                      <span
                        className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wider border ${
                          isActive
                            ? 'bg-emerald-50 dark:bg-emerald-500/15 text-emerald-800 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/30'
                            : 'bg-rose-50 dark:bg-rose-500/15 text-rose-800 dark:text-rose-400 border-rose-200 dark:border-rose-500/30'
                        }`}
                      >
                        {vendor.status}
                      </span>
                    </div>

                    <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-800/80 space-y-1 text-[11px]">
                      <div className="flex items-center space-x-1 text-slate-700 dark:text-slate-400 font-medium">
                        <Mail className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
                        <span className="truncate">{vendor.email}</span>
                      </div>
                      <div className="flex items-center space-x-1 text-emerald-700 dark:text-emerald-400 font-bold">
                        <Phone className="w-3 h-3" />
                        <span>{vendor.whatsapp_number}</span>
                      </div>
                    </div>

                    {!isActive && (
                      <div className="mt-2 text-[10px] text-rose-700 dark:text-rose-400 font-extrabold bg-rose-50 dark:bg-rose-950/60 p-1.5 rounded border border-rose-200 dark:border-rose-500/30 text-center">
                        Inactive Vendor — Cannot Select
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* TAB 3: STEP 4 - PREPARE & SEND LEAD */}
      {activeTab === 'step4' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left 2 Cols: Live Quotation Request Template */}
          <div className="lg:col-span-2 bg-white dark:bg-[#111827] border border-slate-200/90 dark:border-slate-800/80 rounded-2xl p-6 space-y-4 shadow-sm dark:shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div>
                <h3 className="font-extrabold text-slate-900 dark:text-slate-100 text-base">Step 4: Quotation Request Template</h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                  Automatically generated request. Review details before sending.
                </p>
              </div>
              <span className="px-2.5 py-1 rounded-md bg-indigo-50 dark:bg-indigo-950 text-indigo-800 dark:text-indigo-300 font-mono text-xs border border-indigo-200 dark:border-indigo-500/30 font-bold">
                {lead.lead_number}
              </span>
            </div>

            {/* Generated Email Document Preview */}
            <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-4 font-mono text-xs text-slate-900 dark:text-slate-200 leading-relaxed shadow-inner">
              <div className="border-b border-slate-200 dark:border-slate-800 pb-3 text-indigo-800 dark:text-indigo-300 font-extrabold text-sm">
                SUBJECT: Request for Quotation — {lead.lead_number} ({lead.product_item})
              </div>

              <div>
                <p className="text-slate-700 dark:text-slate-400 mb-2 font-sans font-bold">Dear Vendor Partner,</p>
                <p className="font-sans font-medium text-slate-800 dark:text-slate-300">We request your lowest quotation for the following product requirement:</p>
              </div>

              <div className="bg-white dark:bg-slate-900/90 p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1.5 font-sans shadow-xs">
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-slate-500 dark:text-slate-400 block font-bold">Lead ID:</span>
                    <span className="font-mono text-indigo-700 dark:text-indigo-300 font-bold">{lead.lead_number}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 dark:text-slate-400 block font-bold">Client Ref:</span>
                    <span className="text-slate-900 dark:text-slate-200 font-bold">{lead.lead_name}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 dark:text-slate-400 block font-bold">Product / Item:</span>
                    <span className="text-slate-900 dark:text-slate-100 font-extrabold">{lead.product_item}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 dark:text-slate-400 block font-bold">Quantity:</span>
                    <span className="text-indigo-700 dark:text-indigo-400 font-extrabold">{lead.quantity} units</span>
                  </div>
                  <div>
                    <span className="text-slate-500 dark:text-slate-400 block font-bold">Required Due Date:</span>
                    <span className="text-slate-900 dark:text-slate-200 font-bold">{formatDate(lead.due_date)}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 dark:text-slate-400 block font-bold">Target GST:</span>
                    <span className="text-slate-900 dark:text-slate-200 font-bold">{lead.gst_rate || 18}%</span>
                  </div>
                </div>
              </div>

              <div>
                <span className="text-slate-700 dark:text-slate-400 block font-bold mb-1">TECHNICAL SPECIFICATIONS & LINE ITEMS:</span>
                <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800 font-sans text-slate-800 dark:text-slate-300 font-medium whitespace-pre-line leading-relaxed">
                  {formatReadableSpecifications(lead)}
                </div>
              </div>

              <div>
                <span className="text-slate-700 dark:text-slate-400 block font-bold mb-1">COMMERCIAL & WARRANTY TERMS:</span>
                <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800 font-sans text-slate-800 dark:text-slate-300 space-y-1 text-[11px] font-medium">
                  <p>• Delivery Terms: {lead.delivery_terms || 'Standard shipping'}</p>
                  <p>• Warranty Required: {lead.warranty || '1 Year'}</p>
                  {lead.unit_price_estimate && (
                    <p>• Indicative Target Price: {formatCurrency(lead.unit_price_estimate)}</p>
                  )}
                </div>
              </div>

              {lead.lead_attachments && lead.lead_attachments.length > 0 && (
                <div>
                  <span className="text-slate-700 dark:text-slate-400 block font-bold mb-1">ATTACHED SPECIFICATION FILES:</span>
                  <div className="space-y-1 font-sans">
                    {lead.lead_attachments.map((att: any) => (
                      <a
                        key={att.id}
                        href={`${supabaseUrl}/storage/v1/object/public/lead-attachments/${att.file_path}`}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center space-x-2 text-indigo-700 dark:text-indigo-400 hover:underline text-xs font-bold"
                      >
                        <Paperclip className="w-3.5 h-3.5" />
                        <span>{att.file_name}</span>
                        <ExternalLink className="w-3 h-3 text-slate-500" />
                      </a>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <span className="text-slate-700 dark:text-slate-400 block font-bold mb-1">REMARKS & SPECIAL NOTES:</span>
                <textarea
                  rows={2}
                  value={templateCustomRemarks}
                  onChange={(e) => setTemplateCustomRemarks(e.target.value)}
                  placeholder="Enter remarks..."
                  className="w-full bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 font-sans text-xs text-slate-900 dark:text-slate-200 font-semibold focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="pt-2 text-slate-600 dark:text-slate-400 text-[11px] font-sans font-medium">
                Please email your official quotation with price breakdown and lead time to sales@technosphere.in
              </div>
            </div>
          </div>

          {/* Right Col: Selected Vendors & Dispatch Actions */}
          <div className="space-y-6">
            <div className="bg-white dark:bg-[#111827] border border-slate-200/90 dark:border-slate-800/80 rounded-2xl p-6 space-y-4 shadow-sm dark:shadow-xl">
              <h3 className="font-extrabold text-slate-900 dark:text-slate-100 text-sm flex items-center justify-between">
                <span>Selected Vendors ({selectedVendorIds.length})</span>
                <button
                  onClick={() => setActiveTab('step3')}
                  className="text-xs text-indigo-700 dark:text-indigo-400 font-bold hover:underline"
                >
                  Edit Vendors
                </button>
              </h3>

              {/* Vendor List */}
              <div className="space-y-3 max-h-60 overflow-y-auto">
                {selectedVendorIds.length === 0 ? (
                  <div className="text-xs text-amber-800 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 p-3 rounded-xl border border-amber-200 dark:border-amber-500/20 font-bold">
                    No vendors selected yet. Go back to Step 3 to select active vendors.
                  </div>
                ) : (
                  selectedVendorIds.map((vId) => {
                    const vendor = allVendors.find((v) => v.id === vId);
                    const leadVendorObj = (lead.lead_vendors || []).find(
                      (lv: any) => lv.vendor_id === vId
                    );

                    if (!vendor) return null;

                    return (
                      <div
                        key={vId}
                        className="p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl space-y-2 text-xs"
                      >
                        <div className="flex items-center justify-between font-extrabold text-slate-900 dark:text-slate-100">
                          <span className="truncate">{vendor.company_name}</span>
                          <span className="text-slate-600 dark:text-slate-400 font-semibold text-[11px]">
                            {vendor.contact_person}
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-indigo-700 dark:text-indigo-300 truncate font-bold">{vendor.email}</span>
                          <span className="text-emerald-700 dark:text-emerald-400 font-extrabold">{vendor.whatsapp_number}</span>
                        </div>

                        {/* Status Badges */}
                        <div className="flex items-center space-x-2 pt-1 border-t border-slate-200 dark:border-slate-800 text-[10px]">
                          <span
                            className={`px-2 py-0.5 rounded font-extrabold ${
                              leadVendorObj?.email_sent
                                ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300'
                                : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-400'
                            }`}
                          >
                            {leadVendorObj?.email_sent ? 'Email Sent' : 'Email Pending'}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded font-extrabold ${
                              leadVendorObj?.whatsapp_prepared
                                ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300'
                                : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-400'
                            }`}
                          >
                            {leadVendorObj?.whatsapp_prepared ? 'WA Prepared' : 'WA Pending'}
                          </span>
                        </div>

                        {/* WhatsApp Web Deep-Link Button */}
                        <button
                          onClick={() => handlePrepareWhatsApp(vendor.id, vendor.company_name)}
                          className="w-full py-1.5 px-3 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/80 border border-emerald-200 dark:border-emerald-500/30 text-emerald-800 dark:text-emerald-300 rounded-lg font-extrabold flex items-center justify-center space-x-1.5 transition-colors shadow-xs"
                        >
                          <Phone className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400" />
                          <span>Send via WhatsApp Web</span>
                        </button>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Main Email Dispatch Action */}
              <button
                onClick={handleSendEmails}
                disabled={emailLoading || selectedVendorIds.length === 0}
                className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-extrabold text-xs shadow-lg shadow-indigo-600/30 flex items-center justify-center space-x-2 disabled:opacity-50 transition-all hover:scale-[1.01] active:scale-[0.99]"
              >
                {emailLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
                <span>Dispatch Quotation Email to Vendors</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE LEAD CONFIRMATION MODAL */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center space-x-3 text-rose-600 dark:text-rose-400">
              <div className="p-3 bg-rose-50 dark:bg-rose-950/60 rounded-xl border border-rose-200 dark:border-rose-900">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-extrabold text-slate-900 dark:text-slate-100 text-base">Delete Lead</h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">This action cannot be undone.</p>
              </div>
            </div>

            <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
              Are you sure you want to permanently delete lead{' '}
              <strong className="font-mono text-indigo-700 dark:text-indigo-400">{lead.lead_number}</strong> (
              {lead.customer_name} - {lead.product_item})? All associated attachments, vendor assignments, and message logs will be permanently deleted.
            </p>

            <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-extrabold transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteLeadConfirm}
                disabled={deleteLoading}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-extrabold flex items-center space-x-2 shadow-md shadow-rose-600/30 disabled:opacity-50 transition-all"
              >
                {deleteLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
                <span>Delete Lead Permanently</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

