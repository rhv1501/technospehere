'use client';

import { useState, useEffect } from 'react';
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
  Download,
  Eye,
  FileCheck,
  ListOrdered,
  Plus,
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
import { formatDate, formatCurrency, formatFileSize, fileToBase64, extractPrNumber, formatPrReference } from '@/lib/utils';
import {
  parseLineItemsFromLead,
  cleanSpecifications,
  formatReadableSpecifications,
  cleanProductTitle,
  formatLineItemsSummaryText,
  formatLineItemsToPayload,
  LeadLineItem,
} from '@/lib/leadUtils';
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
    lead_name: extractPrNumber(lead.lead_name),
    category_id: lead.category_id || '',
    status: lead.status || 'draft',
    remarks: cleanSpecifications(lead.remarks) || cleanSpecifications(lead.specifications),
  });

  const [lineItems, setLineItems] = useState<LeadLineItem[]>(() => parseLineItemsFromLead(lead));

  // Step 3 Vendors state
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>(
    lead.category_id || 'all'
  );
  const [vendorSearch, setVendorSearch] = useState<string>('');
  const initialSelectedVendorIds = (lead.lead_vendors || []).map((lv: any) => lv.vendor_id);
  const [selectedVendorIds, setSelectedVendorIds] = useState<string[]>(initialSelectedVendorIds);

  // Auto-check vendors for lead's category if none previously selected
  useEffect(() => {
    if (initialSelectedVendorIds.length === 0 && lead?.category_id && allVendors.length > 0) {
      const catActiveIds = allVendors
        .filter((v) => v.status === 'active' && v.categories?.some((c: any) => c.id === lead.category_id))
        .map((v) => v.id);
      if (catActiveIds.length > 0) {
        setSelectedVendorIds(catActiveIds);
      }
    }
  }, [lead?.category_id, allVendors]);

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

  const handleCategoryFilterChange = (catId: string) => {
    setSelectedCategoryFilter(catId);
    if (catId !== 'all') {
      const catActiveIds = allVendors
        .filter((v) => v.status === 'active' && v.categories?.some((c: any) => c.id === catId))
        .map((v) => v.id);
      if (catActiveIds.length > 0) {
        setSelectedVendorIds((prev) => Array.from(new Set([...prev, ...catActiveIds])));
        toast.info(`Auto-selected ${catActiveIds.length} active vendor(s) in category`);
      }
    }
  };

  const handleSelectAllCategoryVendors = () => {
    const targetCatId = selectedCategoryFilter;
    const catActiveVendors = allVendors.filter((v) => {
      const isCatMatch =
        targetCatId === 'all' || (v.categories && v.categories.some((c: any) => c.id === targetCatId));
      return isCatMatch && v.status === 'active';
    });

    const activeVendorIds = catActiveVendors.map((v) => v.id);
    setSelectedVendorIds((prev) => Array.from(new Set([...prev, ...activeVendorIds])));
    toast.success(`Selected ${activeVendorIds.length} active vendor(s)`);
  };

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

  const handleAddLineItem = () => {
    const newItem: LeadLineItem = {
      id: `item_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      product_item: '',
      quantity: 1,
      specifications: '',
    };
    setLineItems((prev) => [...prev, newItem]);
  };

  const handleRemoveLineItem = (index: number) => {
    if (lineItems.length <= 1) {
      toast.error('At least one line item is required.');
      return;
    }
    setLineItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpdateLineItem = (index: number, field: keyof LeadLineItem, value: any) => {
    setLineItems((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const handleSaveLeadEdit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!editFormData.customer_name?.trim() || !editFormData.lead_name?.trim()) {
      toast.error('Please enter Customer Name and Lead/PO Reference Number');
      return;
    }

    const invalidItems = lineItems.filter((it) => !it.product_item?.trim() || !it.quantity || it.quantity < 1);
    if (invalidItems.length > 0) {
      toast.error('Please ensure all line items have a valid product name and quantity.');
      return;
    }

    setSaveLoading(true);

    const payloadFields = formatLineItemsToPayload(lineItems, editFormData.remarks);

    const res = await updateLead(lead.id, {
      customer_name: editFormData.customer_name.trim(),
      lead_name: formatPrReference(editFormData.lead_name),
      product_item: payloadFields.product_item,
      quantity: payloadFields.quantity,
      unit_price_estimate: payloadFields.unit_price_estimate,
      specifications: payloadFields.specifications,
      category_id: editFormData.category_id || undefined,
      status: editFormData.status as any,
      remarks: editFormData.remarks,
    });

    setSaveLoading(false);

    if (res.success) {
      toast.success('RFQ updated successfully!');
      setIsEditing(false);
      router.refresh();
    } else {
      toast.error(res.error || 'Failed to update RFQ');
    }
  };

  const handleCancelEdit = () => {
    setEditFormData({
      customer_name: lead.customer_name || '',
      lead_name: extractPrNumber(lead.lead_name),
      category_id: lead.category_id || '',
      status: lead.status || 'draft',
      remarks: cleanSpecifications(lead.remarks) || cleanSpecifications(lead.specifications),
    });
    setLineItems(parseLineItemsFromLead(lead));
    setIsEditing(false);
  };

  const handleDeleteLeadConfirm = async () => {
    setDeleteLoading(true);
    const res = await deleteLead(lead.id);
    setDeleteLoading(false);

    if (res.success) {
      toast.success(`RFQ ${lead.lead_number} deleted successfully`);
      router.push('/dashboard/leads');
    } else {
      toast.error(res.error || 'Failed to delete RFQ');
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
                title="Back to RFQs"
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
                <span className="font-extrabold text-slate-900 dark:text-slate-200">{cleanProductTitle(lead.product_item)}</span>
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

            {/* Edit / Delete / PDF Download Buttons */}
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <a
                href={`/api/leads/${lead.id}/pdf?download=1`}
                target="_blank"
                rel="noreferrer"
                className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs flex items-center space-x-1.5 transition-all shadow-md shadow-indigo-600/20 hover:scale-[1.02] active:scale-[0.98]"
                title="Download official RFQ PDF"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download RFQ PDF</span>
              </a>

              <a
                href={`/api/leads/${lead.id}/pdf`}
                target="_blank"
                rel="noreferrer"
                className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-extrabold text-xs flex items-center space-x-1.5 transition-colors shadow-xs"
                title="Preview RFQ PDF document in browser"
              >
                <Eye className="w-3.5 h-3.5 text-slate-500" />
                <span>Preview</span>
              </a>

              {!isEditing ? (
                <button
                  onClick={() => setIsEditing(true)}
                  className="px-3.5 py-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/80 border border-indigo-200 dark:border-indigo-500/30 text-indigo-700 dark:text-indigo-300 font-extrabold text-xs flex items-center space-x-1.5 transition-colors shadow-xs"
                >
                  <Pencil className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                  <span>Edit RFQ</span>
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
                title="Delete RFQ"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                <span>Delete</span>
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
            <span>RFQ Specifications & Attachments</span>
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
            <span>Step 4 — Prepare & Send RFQ</span>
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
                    ? 'Update RFQ parameters below and click Save Changes.'
                    : 'Read-only view. Click "Edit RFQ" or the toggle button to make changes.'}
                </p>
              </div>

              {!isEditing ? (
                <button
                  onClick={() => setIsEditing(true)}
                  className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs shadow-md shadow-indigo-600/20 flex items-center space-x-1.5 transition-all"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  <span>Edit RFQ Details</span>
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
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-50 dark:bg-slate-900/80 p-4 rounded-xl border border-slate-200 dark:border-slate-800 text-xs">
                  <div>
                    <span className="text-slate-500 dark:text-slate-400 block font-bold">Customer Name</span>
                    <span className="font-extrabold text-slate-900 dark:text-slate-100 text-sm">{lead.customer_name}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 dark:text-slate-400 block font-bold">PO / RFQ Title</span>
                    <span className="font-extrabold text-slate-900 dark:text-slate-200">{lead.lead_name}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 dark:text-slate-400 block font-bold">Category</span>
                    <span className="text-slate-900 dark:text-slate-200 font-extrabold">
                      {lead.categories?.name || 'Unassigned'}
                    </span>
                  </div>
                </div>

                {/* Multi Line-Items Breakdown Table */}
                {(() => {
                  const items = parseLineItemsFromLead(lead);
                  const subtotal = items.reduce(
                    (acc, it) => acc + (it.quantity || 0) * (it.unit_price_estimate || 0),
                    0
                  );
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
                              <th className="py-2.5 px-3.5">Product / Item Description & Specifications</th>
                              <th className="py-2.5 px-3.5 w-24 text-right">Qty</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200 dark:divide-slate-800/80 text-xs">
                            {items.map((it, idx) => (
                              <tr key={it.id || idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/40 transition-colors">
                                <td className="py-3 px-3.5 text-center font-mono font-bold text-slate-400">
                                  {idx + 1}
                                </td>
                                <td className="py-3 px-3.5">
                                  <div className="font-extrabold text-slate-900 dark:text-slate-100">
                                    {it.product_item || 'Procurement Item'}
                                  </div>
                                  {it.specifications && (
                                    <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 font-medium whitespace-pre-line leading-relaxed">
                                      {it.specifications}
                                    </div>
                                  )}
                                </td>
                                <td className="py-3 px-3.5 text-right font-bold text-indigo-600 dark:text-indigo-400">
                                  {it.quantity} {it.quantity > 1 ? 'units' : 'unit'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                })()}

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
                {/* 1. Customer & RFQ Identification */}
                <div className="space-y-4">
                  <div className="flex items-center space-x-2 pb-2 border-b border-slate-200 dark:border-slate-800">
                    <Building2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                      1. Customer & RFQ Identification
                    </h4>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                    <div>
                      <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1.5">
                        Customer / Client Name <span className="text-rose-500 font-black">*</span>
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
                        PO / RFQ Reference Number <span className="text-rose-500 font-black">*</span>
                      </label>
                      <div className="flex rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/20 shadow-2xs">
                        <span className="inline-flex items-center px-3.5 bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 font-mono font-bold text-xs border-r border-slate-200 dark:border-slate-800 select-none shrink-0">
                          PR-
                        </span>
                        <input
                          type="text"
                          required
                          placeholder="e.g. 10023"
                          value={editFormData.lead_name}
                          onChange={(e) => setEditFormData({ ...editFormData, lead_name: extractPrNumber(e.target.value) })}
                          className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-semibold focus:outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1.5">
                        Product Category
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

                    <div>
                      <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1.5">
                        Workflow Status
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
                  </div>
                </div>

                {/* 2. Procurement Line Items Dynamic Editor */}
                <div className="bg-slate-50/70 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800/80 rounded-xl p-4 space-y-4">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
                    <div className="flex items-center space-x-2">
                      <ListOrdered className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                      <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                        2. Procurement Line Items ({lineItems.length})
                      </h4>
                    </div>

                    <button
                      type="button"
                      onClick={handleAddLineItem}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 shadow-sm shadow-indigo-600/30 flex items-center space-x-1.5 transition-all active:scale-[0.98]"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Line Item</span>
                    </button>
                  </div>

                  <div className="space-y-3.5">
                    {lineItems.map((item, idx) => (
                      <div
                        key={item.id || idx}
                        className="p-3.5 sm:p-4 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800/90 rounded-xl space-y-3 relative group shadow-xs transition-all"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <span className="w-5 h-5 rounded-md bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 font-mono text-[10px] font-bold flex items-center justify-center border border-indigo-200 dark:border-indigo-800/50">
                              #{idx + 1}
                            </span>
                            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                              Line Item #{idx + 1}
                            </span>
                          </div>

                          {lineItems.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveLineItem(idx)}
                              className="p-1 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg transition-colors"
                              title="Remove item"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 text-xs">
                          <div className="sm:col-span-8">
                            <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                              Product / Item Description <span className="text-rose-500">*</span>
                            </label>
                            <input
                              type="text"
                              required
                              placeholder="e.g. HP ProBook 450 G10"
                              value={item.product_item || ''}
                              onChange={(e) => handleUpdateLineItem(idx, 'product_item', e.target.value)}
                              className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-semibold text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-indigo-500"
                            />
                          </div>

                          <div className="sm:col-span-4">
                            <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                              Quantity <span className="text-rose-500">*</span>
                            </label>
                            <input
                              type="number"
                              min={1}
                              required
                              value={item.quantity}
                              onChange={(e) =>
                                handleUpdateLineItem(idx, 'quantity', parseInt(e.target.value) || 1)
                              }
                              className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-bold text-indigo-600 dark:text-indigo-400 focus:outline-none focus:border-indigo-500"
                            />
                          </div>

                          <div className="sm:col-span-12">
                            <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                              Description & Technical Specifications
                            </label>
                            <textarea
                              rows={3}
                              placeholder={`e.g.\ni5 11th Gen Processor\n16GB DDR4 RAM\n512GB NVMe SSD...`}
                              value={item.specifications || ''}
                              onChange={(e) => handleUpdateLineItem(idx, 'specifications', e.target.value)}
                              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-medium text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:border-indigo-500 leading-relaxed resize-y"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 3. Remarks & Special Notes */}
                <div className="space-y-4">
                  <div className="flex items-center space-x-2 pb-2 border-b border-slate-200 dark:border-slate-800">
                    <Shield className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                      3. Remarks & Special Notes
                    </h4>
                  </div>

                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1.5 text-xs">
                      General Remarks / Special Terms
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

            <div className="flex flex-col sm:flex-row items-center gap-2.5">
              <select
                value={selectedCategoryFilter}
                onChange={(e) => handleCategoryFilterChange(e.target.value)}
                className="px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-slate-200 font-bold focus:outline-none focus:border-indigo-500 cursor-pointer"
              >
                <option value="all">All Categories</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={handleSelectAllCategoryVendors}
                className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition-colors whitespace-nowrap"
              >
                Select All Category Vendors
              </button>

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
                className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs shadow-md shadow-indigo-600/30 flex items-center space-x-2 disabled:opacity-50 transition-all whitespace-nowrap"
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
                SUBJECT: Request for Quotation — {lead.lead_number} ({cleanProductTitle(lead.product_item)})
              </div>

              <div>
                <p className="text-slate-700 dark:text-slate-400 mb-2 font-sans font-bold">Dear Vendor Partner,</p>
                <p className="font-sans font-medium text-slate-800 dark:text-slate-300">We request your lowest quotation for the following product requirement:</p>
              </div>

              <div className="bg-white dark:bg-slate-900/90 p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1.5 font-sans shadow-xs">
                <div className="grid grid-cols-1 gap-2 text-xs">
                  <div>
                    <span className="text-slate-500 dark:text-slate-400 block font-bold">RFQ Reference ID:</span>
                    <span className="font-mono text-indigo-700 dark:text-indigo-300 font-bold">{lead.lead_number}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-slate-500 dark:text-slate-400 block font-bold mb-0.5">Product / Requirement Breakdown:</span>
                    <div className="text-slate-900 dark:text-slate-100 font-extrabold whitespace-pre-line text-xs">
                      {formatLineItemsSummaryText(lead)}
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <span className="text-slate-700 dark:text-slate-400 block font-bold mb-1">TECHNICAL SPECIFICATIONS & LINE ITEMS:</span>
                <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800 font-sans text-slate-800 dark:text-slate-300 font-medium whitespace-pre-line leading-relaxed">
                  {formatReadableSpecifications(lead)}
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

              {/* RFQ PDF DOCUMENT BANNER */}
              <div className="p-4 bg-indigo-50/80 dark:bg-indigo-950/40 rounded-xl border border-indigo-200/80 dark:border-indigo-500/30 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <FileCheck className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                    <div>
                      <h4 className="font-extrabold text-xs text-indigo-950 dark:text-indigo-200">
                        Official RFQ PDF Attachment
                      </h4>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 shrink-0">
                    <a
                      href={`/api/leads/${lead.id}/pdf`}
                      target="_blank"
                      rel="noreferrer"
                      className="px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-500/30 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/50 rounded-lg text-xs font-bold flex items-center space-x-1 transition-colors shadow-xs"
                    >
                      <Eye className="w-3 h-3" />
                      <span>Preview</span>
                    </a>
                    <a
                      href={`/api/leads/${lead.id}/pdf?download=1`}
                      target="_blank"
                      rel="noreferrer"
                      className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold flex items-center space-x-1 transition-all shadow-sm"
                    >
                      <Download className="w-3 h-3" />
                      <span>Download PDF</span>
                    </a>
                  </div>
                </div>
              </div>

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
                <h3 className="font-extrabold text-slate-900 dark:text-slate-100 text-base">Delete RFQ</h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">This action cannot be undone.</p>
              </div>
            </div>

            <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
              Are you sure you want to permanently delete RFQ{' '}
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
                <span>Delete RFQ Permanently</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

