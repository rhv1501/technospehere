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
  RotateCcw,
  SquareX,
  Trophy,
  Award,
  Lock,
  CheckCircle2,
  IndianRupee,
  CreditCard,
  UserCheck,
  Calculator,
  Undo2,
  Check,
  XCircle,
} from 'lucide-react';
import {
  assignVendorsToLead,
  sendLeadToVendors,
  prepareWhatsAppMessage,
  uploadLeadAttachment,
  deleteLeadAttachment,
  updateLead,
  deleteLead,
  closeAndAwardRfq,
  reopenLead,
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
  EndUserDetails,
  formatEndUserDetailsToComment,
  parseEndUserDetailsFromLead,
  isLeadWon,
  isLeadLost,
  isLeadClosed,
} from '@/lib/leadUtils';
import { toast } from 'sonner';

interface LeadDetailsViewProps {
  lead: any;
  categories: any[];
  allVendors: any[];
}

export function LeadDetailsView({ lead, categories, allVendors }: LeadDetailsViewProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'overview' | 'step3' | 'step4' | 'step5'>('overview');
  
  // Read-only by default state for Lead details
  const [isEditing, setIsEditing] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Form state for Lead Editing
  const initialEndUser = parseEndUserDetailsFromLead(lead);
  const [showEndUserDetails, setShowEndUserDetails] = useState(!!initialEndUser);
  const [endUserFormData, setEndUserFormData] = useState<EndUserDetails>({
    company_name: initialEndUser?.company_name || '',
    address: initialEndUser?.address || '',
    contact_number: initialEndUser?.contact_number || '',
    email: initialEndUser?.email || '',
    website: initialEndUser?.website || '',
    phone_number: initialEndUser?.phone_number || '',
  });

  const [editFormData, setEditFormData] = useState({
    customer_name: lead.customer_name || '',
    lead_name: extractPrNumber(lead.lead_name),
    category_id: lead.category_id || '',
    status: lead.status || 'draft',
    expected_credit: lead.expected_credit || '',
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
  const [lastSelectedVendorIds, setLastSelectedVendorIds] = useState<string[] | null>(null);

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
  const [templateCustomRemarks, setTemplateCustomRemarks] = useState(cleanSpecifications(lead.remarks) || '');

  // Step 5 RFQ Closure & Winner Selection state
  const isWon = isLeadWon(lead);
  const isLost = isLeadLost(lead);
  const isClosed = isLeadClosed(lead);

  const [closureOutcome, setClosureOutcome] = useState<'win' | 'lost'>(
    isLost ? 'lost' : 'win'
  );
  const [selectedWinnerVendorId, setSelectedWinnerVendorId] = useState<string>(lead.winning_vendor_id || '');
  const [lossReason, setLossReason] = useState<string>(
    lead.loss_reason || 'Client dropped / cancelled requirement'
  );
  const [customLossReason, setCustomLossReason] = useState<string>('');
  const [closureNotes, setClosureNotes] = useState<string>(lead.closure_notes || '');
  const [closeLoading, setCloseLoading] = useState<boolean>(false);
  const [isModifyingClosure, setIsModifyingClosure] = useState<boolean>(false);

  // Line-item prices map (id -> unit price)
  const [itemPrices, setItemPrices] = useState<Record<string, number | string>>(() => {
    const initPrices: Record<string, number | string> = {};
    const parsed = parseLineItemsFromLead(lead);
    parsed.forEach((it) => {
      if (it.winning_unit_price != null) {
        initPrices[it.id] = it.winning_unit_price;
      } else if (it.unit_price_estimate != null) {
        initPrices[it.id] = it.unit_price_estimate;
      } else {
        initPrices[it.id] = '';
      }
    });
    return initPrices;
  });

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

  const handleUncheckAllCategoryVendors = () => {
    if (selectedVendorIds.length === 0) {
      toast.info('No vendors are currently selected.');
      return;
    }
    const previous = [...selectedVendorIds];
    setLastSelectedVendorIds(previous);
    setSelectedVendorIds([]);
    toast.info(`Unchecked all ${previous.length} vendor(s)`, {
      action: {
        label: 'Undo',
        onClick: () => {
          setSelectedVendorIds(previous);
          setLastSelectedVendorIds(null);
          toast.success(`Restored ${previous.length} vendor selection(s)`);
        },
      },
    });
  };

  const handleUndoUncheck = () => {
    if (!lastSelectedVendorIds || lastSelectedVendorIds.length === 0) {
      toast.info('Nothing to undo.');
      return;
    }
    const restored = [...lastSelectedVendorIds];
    setSelectedVendorIds(restored);
    setLastSelectedVendorIds(null);
    toast.success(`Restored ${restored.length} vendor selection(s)`);
  };

  const winningVendor =
    lead.winning_vendor ||
    (lead.winning_vendor_id ? allVendors.find((v) => v.id === lead.winning_vendor_id) : null) ||
    (lead.winning_vendor_id && lead.lead_vendors
      ? lead.lead_vendors.map((lv: any) => lv.vendors).find((v: any) => v && v.id === lead.winning_vendor_id)
      : null) ||
    (lead.winning_vendor_id
      ? { id: lead.winning_vendor_id, company_name: 'Awarded Vendor', contact_person: 'N/A', email: 'N/A', whatsapp_number: 'N/A' }
      : null);
  const assignedVendorsList = (lead.lead_vendors || [])
    .map((lv: any) => lv.vendors || allVendors.find((v) => v.id === lv.vendor_id))
    .filter(Boolean);

  const handleItemPriceChange = (itemId: string, val: string) => {
    setItemPrices((prev) => ({
      ...prev,
      [itemId]: val === '' ? '' : Math.max(0, Number(val)),
    }));
  };

  const calculatedItemsTotal = lineItems.reduce((acc, item) => {
    const p = Number(itemPrices[item.id]);
    if (!isNaN(p) && p > 0) {
      return acc + (Number(item.quantity) || 1) * p;
    }
    return acc;
  }, 0);

  const handleSelectWinnerClick = (vendor: any) => {
    setSelectedWinnerVendorId(vendor.id);
    toast.success(`Selected ${vendor.company_name} as winning vendor!`);
  };

  const handleCloseRfqWin = async () => {
    if (!selectedWinnerVendorId) {
      toast.error('Please select the winning vendor to award this purchase order.');
      return;
    }

    setCloseLoading(true);

    const itemPricing = lineItems.map((it) => {
      const uPrice = Number(itemPrices[it.id]) || 0;
      return {
        id: it.id,
        product_item: it.product_item,
        quantity: Number(it.quantity) || 1,
        winning_unit_price: uPrice,
        winning_total: uPrice * (Number(it.quantity) || 1),
      };
    });

    const res = await closeAndAwardRfq({
      leadId: lead.id,
      outcome: 'win',
      winningVendorId: selectedWinnerVendorId,
      winningAmount: calculatedItemsTotal,
      closureNotes: closureNotes,
      itemPricing: itemPricing,
      status: 'completed',
    });

    setCloseLoading(false);

    if (res.success) {
      toast.success('RFQ successfully closed and awarded as WON!');
      setIsModifyingClosure(false);
      router.refresh();
    } else {
      toast.error(res.error || 'Failed to close RFQ as Won');
    }
  };

  const handleCloseRfqLost = async () => {
    const finalReason = lossReason === 'Other' ? (customLossReason.trim() || 'Other') : lossReason;

    setCloseLoading(true);

    const res = await closeAndAwardRfq({
      leadId: lead.id,
      outcome: 'lost',
      winningVendorId: null,
      winningAmount: null,
      lossReason: finalReason,
      closureNotes: closureNotes,
      status: 'cancelled',
    });

    setCloseLoading(false);

    if (res.success) {
      toast.success('RFQ marked as Closed - Lost');
      setIsModifyingClosure(false);
      router.refresh();
    } else {
      toast.error(res.error || 'Failed to mark RFQ as Lost');
    }
  };

  const handleReopenRfq = async () => {
    if (!confirm('Are you sure you want to reopen this RFQ? It will return to active draft status.')) {
      return;
    }

    setCloseLoading(true);
    const res = await reopenLead(lead.id);
    setCloseLoading(false);

    if (res.success) {
      toast.success('RFQ has been reopened as active draft');
      setIsModifyingClosure(false);
      router.refresh();
    } else {
      toast.error(res.error || 'Failed to reopen RFQ');
    }
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
      toast.error('Please enter Customer Name and Lead/PR Reference Number');
      return;
    }

    const invalidItems = lineItems.filter((it) => !it.product_item?.trim() || !it.quantity || it.quantity < 1);
    if (invalidItems.length > 0) {
      toast.error('Please ensure all line items have a valid product name and quantity.');
      return;
    }

    setSaveLoading(true);

    const endUserComment = showEndUserDetails ? formatEndUserDetailsToComment(endUserFormData) : '';
    const cleanRemarksText = cleanSpecifications(editFormData.remarks);
    const finalRemarks = endUserComment ? `${cleanRemarksText}\n${endUserComment}`.trim() : cleanRemarksText;

    const payloadFields = formatLineItemsToPayload(lineItems, finalRemarks);

    const res = await updateLead(lead.id, {
      customer_name: editFormData.customer_name.trim(),
      lead_name: formatPrReference(editFormData.lead_name),
      product_item: payloadFields.product_item,
      quantity: payloadFields.quantity,
      unit_price_estimate: payloadFields.unit_price_estimate,
      specifications: payloadFields.specifications,
      category_id: editFormData.category_id || undefined,
      status: editFormData.status as any,
      expected_credit: editFormData.expected_credit,
      remarks: finalRemarks,
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
    const initialEndUser = parseEndUserDetailsFromLead(lead);
    setShowEndUserDetails(!!initialEndUser);
    setEndUserFormData({
      company_name: initialEndUser?.company_name || '',
      address: initialEndUser?.address || '',
      contact_number: initialEndUser?.contact_number || '',
      email: initialEndUser?.email || '',
      website: initialEndUser?.website || '',
      phone_number: initialEndUser?.phone_number || '',
    });
    setEditFormData({
      customer_name: lead.customer_name || '',
      lead_name: extractPrNumber(lead.lead_name),
      category_id: lead.category_id || '',
      status: lead.status || 'draft',
      expected_credit: lead.expected_credit || '',
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
              {isWon ? (
                <span className="px-3 py-1 rounded-full bg-gradient-to-r from-amber-100 to-amber-200 dark:from-amber-950 dark:to-amber-900/80 text-amber-900 dark:text-amber-300 text-xs font-black border border-amber-300 dark:border-amber-700 flex items-center space-x-1.5 shadow-xs">
                  <Trophy className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                  <span>Awarded: {winningVendor?.company_name || 'Awarded'}</span>
                </span>
              ) : isLost ? (
                <span className="px-3 py-1 rounded-full bg-rose-50 dark:bg-rose-950/80 text-rose-800 dark:text-rose-300 text-xs font-black border border-rose-300 dark:border-rose-700 flex items-center space-x-1.5 shadow-xs">
                  <XCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
                  <span>Closed - Lost{lead.loss_reason ? `: ${lead.loss_reason}` : ''}</span>
                </span>
              ) : (
                <span
                  className={`px-3 py-1 rounded-full text-xs font-extrabold capitalize border ${
                    lead.status === 'sent'
                      ? 'bg-indigo-50 dark:bg-indigo-500/15 text-indigo-800 dark:text-indigo-300 border-indigo-200 dark:border-indigo-500/30'
                      : lead.status === 'ready_to_send'
                      ? 'bg-amber-50 dark:bg-amber-500/15 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-500/30'
                      : lead.status === 'quoted'
                      ? 'bg-emerald-50 dark:bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-500/30'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                  }`}
                >
                  Status: {lead.status.replace(/_/g, ' ')}
                </span>
              )}

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

          <button
            onClick={() => setActiveTab('step5')}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center space-x-2 border transition-all whitespace-nowrap ${
              activeTab === 'step5'
                ? 'bg-amber-50 dark:bg-amber-600/20 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-500/50 shadow-sm'
                : 'bg-slate-50 dark:bg-slate-900/50 text-slate-700 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <span className="w-5 h-5 rounded-full bg-amber-500 text-white dark:bg-amber-600/50 dark:text-amber-100 text-[10px] font-black flex items-center justify-center">
              5
            </span>
            <span>Step 5 — Close RFQ (Win / Lost)</span>
          </button>
        </div>
      </div>

      {/* TAB 1: LEAD SPECIFICATIONS & ATTACHMENTS (DEFAULT READ ONLY WITH INLINE EDIT) */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {isWon && (
            <div className="lg:col-span-3 p-5 bg-gradient-to-r from-amber-50 via-emerald-50 to-indigo-50 dark:from-amber-950/40 dark:via-emerald-950/40 dark:to-indigo-950/40 border-2 border-amber-300/80 dark:border-amber-600/50 rounded-2xl shadow-sm flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center space-x-3">
                <div className="p-3 bg-amber-500 text-white rounded-xl shadow-xs">
                  <Trophy className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-xs font-black uppercase tracking-wider text-amber-900 dark:text-amber-300">
                    RFQ Closed & Awarded (Won)
                  </div>
                  <div className="text-base font-black text-slate-900 dark:text-slate-100 mt-0.5">
                    {winningVendor?.company_name || 'Awarded Vendor'}{' '}
                    {winningVendor?.contact_person && (
                      <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                        ({winningVendor.contact_person})
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-4">
                {lead.winning_amount && (
                  <div className="text-right">
                    <div className="text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Winning Amount
                    </div>
                    <div className="text-lg font-black text-emerald-700 dark:text-emerald-400">
                      ₹{Number(lead.winning_amount).toLocaleString('en-IN')}
                    </div>
                  </div>
                )}

                <button
                  onClick={() => setActiveTab('step5')}
                  className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold transition-all shadow-xs flex items-center space-x-1"
                >
                  <Trophy className="w-3.5 h-3.5" />
                  <span>View Award Details</span>
                </button>
              </div>
            </div>
          )}

          {isLost && (
            <div className="lg:col-span-3 p-5 bg-gradient-to-r from-rose-50 via-slate-50 to-amber-50 dark:from-rose-950/40 dark:via-slate-900/40 dark:to-amber-950/40 border-2 border-rose-300/80 dark:border-rose-700/60 rounded-2xl shadow-sm flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center space-x-3">
                <div className="p-3 bg-rose-600 text-white rounded-xl shadow-xs">
                  <XCircle className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-xs font-black uppercase tracking-wider text-rose-900 dark:text-rose-300">
                    RFQ Closed as Lost
                  </div>
                  <div className="text-base font-black text-slate-900 dark:text-slate-100 mt-0.5">
                    Reason: {lead.loss_reason || 'Client cancelled requirement'}
                  </div>
                  {lead.closure_notes && (
                    <div className="text-xs text-slate-600 dark:text-slate-400 mt-0.5 font-medium">
                      {lead.closure_notes}
                    </div>
                  )}
                </div>
              </div>

              <button
                onClick={() => setActiveTab('step5')}
                className="px-3.5 py-2 rounded-xl bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 text-white text-xs font-bold transition-all shadow-xs flex items-center space-x-1"
              >
                <span>View Closure Details</span>
              </button>
            </div>
          )}

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

                {/* Read-Only End User Details if available */}
                {(() => {
                  const endUser = parseEndUserDetailsFromLead(lead);
                  if (!endUser) return null;
                  return (
                    <div className="bg-slate-50/80 dark:bg-slate-900/60 p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2.5">
                      <div className="flex items-center space-x-2 border-b border-slate-200/80 dark:border-slate-800 pb-2">
                        <UserCheck className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                        <span className="text-xs font-extrabold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                          End User Information
                        </span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                        {endUser.company_name && (
                          <div>
                            <span className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold block">Company Name</span>
                            <span className="font-bold text-slate-900 dark:text-slate-100">{endUser.company_name}</span>
                          </div>
                        )}
                        {endUser.contact_number && (
                          <div>
                            <span className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold block">Contact Number</span>
                            <span className="font-semibold text-slate-800 dark:text-slate-200">{endUser.contact_number}</span>
                          </div>
                        )}
                        {endUser.phone_number && (
                          <div>
                            <span className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold block">Phone Number</span>
                            <span className="font-semibold text-slate-800 dark:text-slate-200">{endUser.phone_number}</span>
                          </div>
                        )}
                        {endUser.email && (
                          <div>
                            <span className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold block">Email ID</span>
                            <span className="font-semibold text-slate-800 dark:text-slate-200">{endUser.email}</span>
                          </div>
                        )}
                        {endUser.website && (
                          <div>
                            <span className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold block">Website</span>
                            <a href={endUser.website.startsWith('http') ? endUser.website : `https://${endUser.website}`} target="_blank" rel="noopener noreferrer" className="font-semibold text-indigo-600 dark:text-indigo-400 hover:underline">
                              {endUser.website}
                            </a>
                          </div>
                        )}
                        {endUser.address && (
                          <div className="sm:col-span-2 md:col-span-3">
                            <span className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold block">Address</span>
                            <span className="font-medium text-slate-800 dark:text-slate-200 leading-relaxed">{endUser.address}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })()}

                {lead.expected_credit && (
                  <div>
                    <span className="text-slate-700 dark:text-slate-400 text-xs font-bold block mb-1.5">
                      Expected Credit Terms
                    </span>
                    <div className="bg-emerald-50/70 dark:bg-emerald-950/40 p-3 rounded-xl border border-emerald-200 dark:border-emerald-800/60 text-xs text-emerald-900 dark:text-emerald-200 font-bold flex items-center space-x-2">
                      <CreditCard className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      <span>{lead.expected_credit}</span>
                    </div>
                  </div>
                )}

                <div>
                  <span className="text-slate-700 dark:text-slate-400 text-xs font-bold block mb-1.5">
                    Remarks & Special Notes
                  </span>
                  <div className="bg-slate-50 dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800 text-xs text-slate-800 dark:text-slate-300 font-medium">
                    {cleanSpecifications(lead.remarks) || 'No remarks added.'}
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

                    {/* Checkbox: Add end user details */}
                    <div className="pt-3 border-t border-slate-200/80 dark:border-slate-800/80 space-y-3">
                      <label className="inline-flex items-center space-x-2.5 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={showEndUserDetails}
                          onChange={(e) => {
                            const checked = e.target.checked;
                            setShowEndUserDetails(checked);
                            if (checked && !endUserFormData.company_name && editFormData.customer_name) {
                              setEndUserFormData((prev) => ({
                                ...prev,
                                company_name: editFormData.customer_name,
                              }));
                            }
                          }}
                          className="w-4 h-4 rounded border-slate-300 dark:border-slate-700 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                        />
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                          Add end user details
                        </span>
                      </label>

                      {/* End User Details Form Grid */}
                      {showEndUserDetails && (
                        <div className="p-4 bg-white dark:bg-slate-950 border border-indigo-200 dark:border-indigo-800/60 rounded-xl space-y-3 shadow-2xs animate-fade-in">
                          <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800/80">
                            <div className="flex items-center space-x-2 text-indigo-600 dark:text-indigo-400">
                              <UserCheck className="w-4 h-4" />
                              <span className="text-xs font-bold uppercase tracking-wider">
                                End User Information
                              </span>
                            </div>
                            <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                              Prefilled from available data
                            </span>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                            <div>
                              <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                Company Name
                              </label>
                              <input
                                type="text"
                                placeholder="End User Company Name"
                                value={endUserFormData.company_name || ''}
                                onChange={(e) =>
                                  setEndUserFormData({ ...endUserFormData, company_name: e.target.value })
                                }
                                className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-semibold text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-indigo-500"
                              />
                            </div>

                            <div>
                              <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                Contact Number
                              </label>
                              <input
                                type="text"
                                placeholder="e.g. +91 98765 43210"
                                value={endUserFormData.contact_number || ''}
                                onChange={(e) =>
                                  setEndUserFormData({ ...endUserFormData, contact_number: e.target.value })
                                }
                                className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-medium text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-indigo-500"
                              />
                            </div>

                            <div>
                              <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                Phone Number
                              </label>
                              <input
                                type="text"
                                placeholder="e.g. 080 1234 5678"
                                value={endUserFormData.phone_number || ''}
                                onChange={(e) =>
                                  setEndUserFormData({ ...endUserFormData, phone_number: e.target.value })
                                }
                                className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-medium text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-indigo-500"
                              />
                            </div>

                            <div>
                              <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                Email ID
                              </label>
                              <input
                                type="email"
                                placeholder="enduser@company.com"
                                value={endUserFormData.email || ''}
                                onChange={(e) =>
                                  setEndUserFormData({ ...endUserFormData, email: e.target.value })
                                }
                                className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-medium text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-indigo-500"
                              />
                            </div>

                            <div>
                              <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                Website
                              </label>
                              <input
                                type="text"
                                placeholder="https://www.endusercompany.com"
                                value={endUserFormData.website || ''}
                                onChange={(e) =>
                                  setEndUserFormData({ ...endUserFormData, website: e.target.value })
                                }
                                className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-medium text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-indigo-500"
                              />
                            </div>

                            <div className="sm:col-span-2 md:col-span-3">
                              <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                Address
                              </label>
                              <input
                                type="text"
                                placeholder="Full End User Address"
                                value={endUserFormData.address || ''}
                                onChange={(e) =>
                                  setEndUserFormData({ ...endUserFormData, address: e.target.value })
                                }
                                className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-medium text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-indigo-500"
                              />
                            </div>
                          </div>
                        </div>
                      )}
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
                      Expected Credit Terms (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 30 Days Credit, Net 45"
                      value={editFormData.expected_credit || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, expected_credit: e.target.value })}
                      className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-slate-100 font-medium text-xs focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all mb-3"
                    />
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

            <div className="flex flex-wrap items-center gap-2.5">
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
                className="px-3 py-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900 text-indigo-700 dark:text-indigo-300 border border-indigo-200/80 dark:border-indigo-800/60 text-xs font-bold transition-colors whitespace-nowrap flex items-center space-x-1.5"
              >
                <CheckSquare className="w-3.5 h-3.5" />
                <span>Select All Category Vendors</span>
              </button>

              <button
                type="button"
                onClick={handleUncheckAllCategoryVendors}
                disabled={selectedVendorIds.length === 0}
                className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-slate-700 hover:text-rose-700 dark:text-slate-300 dark:hover:text-rose-300 border border-slate-200 dark:border-slate-700 text-xs font-bold transition-colors whitespace-nowrap disabled:opacity-40 disabled:pointer-events-none flex items-center space-x-1.5"
              >
                <SquareX className="w-3.5 h-3.5 text-rose-500" />
                <span>Uncheck All ({selectedVendorIds.length})</span>
              </button>

              {lastSelectedVendorIds && lastSelectedVendorIds.length > 0 && (
                <button
                  type="button"
                  onClick={handleUndoUncheck}
                  className="px-3 py-2 rounded-xl bg-amber-50 dark:bg-amber-950/50 hover:bg-amber-100 dark:hover:bg-amber-900 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700 text-xs font-extrabold transition-all whitespace-nowrap flex items-center space-x-1.5 shadow-sm animate-pulse"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                  <span>Undo Uncheck ({lastSelectedVendorIds.length})</span>
                </button>
              )}

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

              {lead.expected_credit && (
                <div>
                  <span className="text-slate-700 dark:text-slate-400 block font-bold mb-1">EXPECTED CREDIT TERMS:</span>
                  <div className="bg-emerald-50 dark:bg-emerald-950/40 p-2.5 rounded-xl border border-emerald-200 dark:border-emerald-800/60 font-sans text-xs text-emerald-900 dark:text-emerald-200 font-bold">
                    {lead.expected_credit}
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

              {/* Proceed to Step 5 Button */}
              <div className="pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setActiveTab('step5')}
                  className="w-full py-3 bg-amber-50 dark:bg-amber-950/60 hover:bg-amber-100 dark:hover:bg-amber-900 border border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-200 rounded-xl font-extrabold text-xs flex items-center justify-center space-x-2 transition-all shadow-xs"
                >
                  <Trophy className="w-4 h-4 text-amber-600" />
                  <span>Proceed to Step 5: Close RFQ & Award Winner →</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: STEP 5 — CLOSE RFQ (WIN / LOST) */}
      {activeTab === 'step5' && (
        <div className="space-y-6 animate-fade-in">
          {/* Step Header Banner */}
          <div className="bg-white dark:bg-[#111827] border border-slate-200/90 dark:border-slate-800/80 rounded-2xl p-6 space-y-4 shadow-sm dark:shadow-xl">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
              <div>
                <h3 className="text-base font-extrabold text-slate-900 dark:text-slate-100 flex items-center space-x-2">
                  <Trophy className="w-5 h-5 text-amber-500" />
                  <span>Step 5 — RFQ Closure & Purchase Order Award</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1">
                  Close this procurement requirement by awarding the Purchase Order to a winning supplier with negotiated item-level pricing, or mark as Lost.
                </p>
              </div>

              <div className="flex items-center space-x-2">
                {isWon ? (
                  <span className="px-3 py-1.5 rounded-xl bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 text-xs font-black flex items-center space-x-1.5 shadow-xs">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span>CLOSED & AWARDED (WON)</span>
                  </span>
                ) : isLost ? (
                  <span className="px-3 py-1.5 rounded-xl bg-rose-100 dark:bg-rose-950/80 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-700 text-xs font-black flex items-center space-x-1.5 shadow-xs">
                    <XCircle className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                    <span>CLOSED AS LOST</span>
                  </span>
                ) : (
                  <span className="px-3 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 text-xs font-extrabold flex items-center space-x-1.5">
                    <Lock className="w-3.5 h-3.5 text-amber-600" />
                    <span>Active: {(lead.status || 'draft').toUpperCase()}</span>
                  </span>
                )}
              </div>
            </div>

            {/* IF ALREADY CLOSED AND NOT EDITING/MODIFYING: SHOW SUMMARY & ITEM BREAKDOWN */}
            {isClosed && !isModifyingClosure ? (
              <div className="space-y-6">
                {/* Won Executive Summary */}
                {isWon && (
                  <div className="bg-gradient-to-r from-amber-50 via-emerald-50 to-indigo-50 dark:from-amber-950/30 dark:via-emerald-950/30 dark:to-indigo-950/30 border-2 border-amber-300/80 dark:border-amber-600/50 rounded-2xl p-6 space-y-5 shadow-md">
                    <div className="flex items-center justify-between flex-wrap gap-4">
                      <div className="flex items-center space-x-3">
                        <span className="p-3 rounded-xl bg-amber-500 text-white font-black text-xl shadow-sm">
                          🏆
                        </span>
                        <div>
                          <div className="text-xs font-extrabold uppercase tracking-wider text-amber-900 dark:text-amber-300">
                            Purchase Order Awarded (Won)
                          </div>
                          <div className="text-xl font-black text-slate-900 dark:text-slate-100 mt-0.5">
                            {winningVendor?.company_name || 'Awarded Vendor'}
                          </div>
                        </div>
                      </div>

                      <div className="text-right bg-white/80 dark:bg-slate-900/80 px-4 py-2.5 rounded-xl border border-amber-200 dark:border-amber-800">
                        <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                          Final Agreed PO Amount
                        </div>
                        <div className="text-2xl font-black text-emerald-700 dark:text-emerald-400">
                          ₹{Number(lead.winning_amount || calculatedItemsTotal || 0).toLocaleString('en-IN')}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-slate-200/80 dark:border-slate-800/80 text-xs font-medium">
                      <div>
                        <span className="text-slate-500 dark:text-slate-400 block text-[11px] font-bold">Contact Person</span>
                        <span className="text-slate-900 dark:text-slate-200 font-bold">{winningVendor?.contact_person || 'N/A'}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 dark:text-slate-400 block text-[11px] font-bold">Email & WhatsApp</span>
                        <span className="text-slate-900 dark:text-slate-200 font-bold">
                          {winningVendor?.email || 'N/A'} {winningVendor?.whatsapp_number ? `• ${winningVendor.whatsapp_number}` : ''}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 dark:text-slate-400 block text-[11px] font-bold">Award Date</span>
                        <span className="text-slate-900 dark:text-slate-200 font-bold">{lead.closed_at ? formatDate(lead.closed_at) : 'N/A'}</span>
                      </div>
                    </div>

                    {lead.closure_notes && (
                      <div className="pt-2 border-t border-slate-200/80 dark:border-slate-800/80 text-xs text-slate-700 dark:text-slate-300 font-medium">
                        <strong className="text-slate-900 dark:text-slate-100">Closure Notes:</strong> {lead.closure_notes}
                      </div>
                    )}

                    {/* Itemized Price Breakdown Table */}
                    <div className="pt-3 border-t border-slate-200/80 dark:border-slate-800/80 space-y-3">
                      <div className="flex items-center space-x-2">
                        <Calculator className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                        <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-900 dark:text-slate-100">
                          Awarded Line-Item Price Breakdown
                        </h4>
                      </div>

                      <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827]">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-slate-50 dark:bg-[#0d1322] border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-semibold text-[11px]">
                            <tr>
                              <th className="px-3.5 py-2.5 w-12 text-center">#</th>
                              <th className="px-3.5 py-2.5">Item Description & Specifications</th>
                              <th className="px-3.5 py-2.5 text-center w-24">Quantity</th>
                              <th className="px-3.5 py-2.5 text-right w-36">Agreed Unit Price (₹)</th>
                              <th className="px-3.5 py-2.5 text-right w-36">Total Amount (₹)</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                            {lineItems.map((item, idx) => {
                              const uPrice = item.winning_unit_price != null ? item.winning_unit_price : (Number(itemPrices[item.id]) || 0);
                              const total = item.winning_total != null ? item.winning_total : (uPrice * (Number(item.quantity) || 1));

                              return (
                                <tr key={item.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                                  <td className="px-3.5 py-2.5 text-center text-slate-400 font-mono text-[11px]">
                                    {idx + 1}
                                  </td>
                                  <td className="px-3.5 py-2.5">
                                    <div className="font-bold text-slate-900 dark:text-slate-100">
                                      {item.product_item}
                                    </div>
                                    {item.specifications && (
                                      <div className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5">
                                        {item.specifications}
                                      </div>
                                    )}
                                  </td>
                                  <td className="px-3.5 py-2.5 text-center font-bold text-slate-800 dark:text-slate-200">
                                    {item.quantity}
                                  </td>
                                  <td className="px-3.5 py-2.5 text-right font-mono font-bold text-slate-900 dark:text-slate-100">
                                    ₹{Number(uPrice).toLocaleString('en-IN')}
                                  </td>
                                  <td className="px-3.5 py-2.5 text-right font-mono font-black text-emerald-700 dark:text-emerald-400">
                                    ₹{Number(total).toLocaleString('en-IN')}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                          <tfoot className="bg-slate-50/80 dark:bg-slate-900/80 border-t border-slate-200 dark:border-slate-800">
                            <tr>
                              <td colSpan={4} className="px-3.5 py-2.5 text-right font-extrabold text-slate-700 dark:text-slate-300 uppercase tracking-wider text-[11px]">
                                Total Purchase Order Value:
                              </td>
                              <td className="px-3.5 py-2.5 text-right font-mono font-black text-emerald-700 dark:text-emerald-400 text-sm">
                                ₹{Number(lead.winning_amount || calculatedItemsTotal || 0).toLocaleString('en-IN')}
                              </td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    </div>

                    {/* Action Controls */}
                    <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-200/80 dark:border-slate-800/80">
                      <button
                        type="button"
                        onClick={handleReopenRfq}
                        disabled={closeLoading}
                        className="px-4 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-colors"
                      >
                        <Undo2 className="w-3.5 h-3.5" />
                        <span>Reopen RFQ</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsModifyingClosure(true)}
                        className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-extrabold flex items-center space-x-1.5 shadow-sm transition-all"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                        <span>Modify Award Details</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Lost Executive Summary */}
                {isLost && (
                  <div className="bg-gradient-to-r from-rose-50 via-slate-50 to-amber-50 dark:from-rose-950/40 dark:via-slate-900/40 dark:to-amber-950/40 border-2 border-rose-300/80 dark:border-rose-700/60 rounded-2xl p-6 space-y-4 shadow-md">
                    <div className="flex items-center space-x-3">
                      <div className="p-3 bg-rose-600 text-white rounded-xl shadow-xs">
                        <XCircle className="w-6 h-6" />
                      </div>
                      <div>
                        <div className="text-xs font-black uppercase tracking-wider text-rose-900 dark:text-rose-300">
                          RFQ Closed as Lost
                        </div>
                        <div className="text-lg font-black text-slate-900 dark:text-slate-100 mt-0.5">
                          Reason: {lead.loss_reason || 'Client dropped / cancelled requirement'}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-slate-200/80 dark:border-slate-800/80 text-xs font-medium">
                      <div>
                        <span className="text-slate-500 dark:text-slate-400 block text-[11px] font-bold">Closure Date</span>
                        <span className="text-slate-900 dark:text-slate-200 font-bold">{lead.closed_at ? formatDate(lead.closed_at) : 'N/A'}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 dark:text-slate-400 block text-[11px] font-bold">Status</span>
                        <span className="text-rose-700 dark:text-rose-400 font-extrabold">Cancelled / Closed Lost</span>
                      </div>
                    </div>

                    {lead.closure_notes && (
                      <div className="pt-2 border-t border-slate-200/80 dark:border-slate-800/80 text-xs text-slate-700 dark:text-slate-300 font-medium">
                        <strong className="text-slate-900 dark:text-slate-100">Context Notes:</strong> {lead.closure_notes}
                      </div>
                    )}

                    {/* Action Controls */}
                    <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-200/80 dark:border-slate-800/80">
                      <button
                        type="button"
                        onClick={handleReopenRfq}
                        disabled={closeLoading}
                        className="px-4 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-colors"
                      >
                        <Undo2 className="w-3.5 h-3.5" />
                        <span>Reopen RFQ</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsModifyingClosure(true)}
                        className="px-4 py-2 bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 text-white rounded-xl text-xs font-extrabold flex items-center space-x-1.5 shadow-sm transition-all"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                        <span>Modify Loss Details</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* CLOSURE FORM: DUAL PATHWAY SELECTOR (WIN VS LOST) */
              <div className="space-y-6">
                {isModifyingClosure && (
                  <div className="flex items-center justify-between p-3.5 bg-amber-50 dark:bg-amber-950/50 border border-amber-300 dark:border-amber-700 rounded-xl text-xs text-amber-900 dark:text-amber-200 font-bold">
                    <div className="flex items-center space-x-2">
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                      <span>Modifying existing closure details for this RFQ.</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsModifyingClosure(false)}
                      className="px-2.5 py-1 bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-700 rounded-lg text-[11px] hover:bg-amber-100 transition-colors"
                    >
                      Cancel Modification
                    </button>
                  </div>
                )}

                {/* DUAL PATHWAY SELECTOR CARDS */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Card 1: Win & Award PO */}
                  <div
                    onClick={() => setClosureOutcome('win')}
                    className={`cursor-pointer p-5 rounded-2xl border-2 transition-all space-y-2 relative ${
                      closureOutcome === 'win'
                        ? 'bg-amber-50/80 dark:bg-amber-950/40 border-amber-500 dark:border-amber-500 shadow-md ring-2 ring-amber-500/20'
                        : 'bg-white dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className={`p-2.5 rounded-xl font-bold ${closureOutcome === 'win' ? 'bg-amber-500 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'}`}>
                          <Trophy className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="font-extrabold text-sm text-slate-900 dark:text-slate-100">
                            Option 1: Win & Award PO
                          </h4>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400">
                            Award to winning vendor with itemized unit pricing
                          </p>
                        </div>
                      </div>

                      {closureOutcome === 'win' && (
                        <span className="p-1 rounded-full bg-amber-500 text-white">
                          <Check className="w-3.5 h-3.5" />
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Card 2: Mark as Lost */}
                  <div
                    onClick={() => setClosureOutcome('lost')}
                    className={`cursor-pointer p-5 rounded-2xl border-2 transition-all space-y-2 relative ${
                      closureOutcome === 'lost'
                        ? 'bg-rose-50/80 dark:bg-rose-950/40 border-rose-500 dark:border-rose-500 shadow-md ring-2 ring-rose-500/20'
                        : 'bg-white dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className={`p-2.5 rounded-xl font-bold ${closureOutcome === 'lost' ? 'bg-rose-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'}`}>
                          <XCircle className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="font-extrabold text-sm text-slate-900 dark:text-slate-100">
                            Option 2: Mark as Lost
                          </h4>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400">
                            Requirement dropped, out of budget, or competitor won
                          </p>
                        </div>
                      </div>

                      {closureOutcome === 'lost' && (
                        <span className="p-1 rounded-full bg-rose-600 text-white">
                          <Check className="w-3.5 h-3.5" />
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* FLOW A: WIN & AWARD PATHWAY */}
                {closureOutcome === 'win' && (
                  <div className="space-y-6 pt-2">
                    {/* Section 1: Winning Vendor Selection */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-900 dark:text-slate-100 flex items-center space-x-2">
                          <Award className="w-4 h-4 text-amber-500" />
                          <span>1. Select Winning Vendor ({assignedVendorsList.length} assigned)</span>
                        </h4>
                        {selectedWinnerVendorId && (
                          <span className="text-xs font-bold text-amber-700 dark:text-amber-400">
                            Selected: {allVendors.find((v) => v.id === selectedWinnerVendorId)?.company_name}
                          </span>
                        )}
                      </div>

                      {assignedVendorsList.length === 0 ? (
                        <div className="p-4 text-center text-xs font-medium text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                          No vendors were assigned. Choose any active vendor using the dropdown below.
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                          {assignedVendorsList.map((vendor: any) => {
                            const isSelected = selectedWinnerVendorId === vendor.id;
                            const lvObj = (lead.lead_vendors || []).find((lv: any) => lv.vendor_id === vendor.id);

                            return (
                              <div
                                key={vendor.id}
                                onClick={() => handleSelectWinnerClick(vendor)}
                                className={`cursor-pointer p-4 rounded-xl border transition-all space-y-2 ${
                                  isSelected
                                    ? 'bg-amber-50 dark:bg-amber-950/50 border-amber-400 dark:border-amber-600 shadow-md ring-2 ring-amber-500/20'
                                    : 'bg-white dark:bg-[#111827] border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                                }`}
                              >
                                <div className="flex items-start justify-between">
                                  <div>
                                    <h5 className="font-extrabold text-xs text-slate-900 dark:text-slate-100">
                                      {vendor.company_name}
                                    </h5>
                                    <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                                      {vendor.contact_person}
                                    </div>
                                  </div>
                                  {isSelected && (
                                    <span className="px-2 py-0.5 rounded bg-amber-500 text-white font-black text-[9px] uppercase tracking-wider">
                                      Winner 🏆
                                    </span>
                                  )}
                                </div>

                                <div className="text-[11px] text-slate-600 dark:text-slate-400 truncate">
                                  {vendor.email} {vendor.whatsapp_number ? `• ${vendor.whatsapp_number}` : ''}
                                </div>

                                <div className="flex items-center space-x-1.5 pt-1 text-[9px]">
                                  <span className={`px-1.5 py-0.5 rounded font-bold ${lvObj?.email_sent ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-slate-100 text-slate-500'}`}>
                                    {lvObj?.email_sent ? 'Email Sent' : 'Email Pending'}
                                  </span>
                                  <span className={`px-1.5 py-0.5 rounded font-bold ${lvObj?.whatsapp_prepared ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-slate-100 text-slate-500'}`}>
                                    {lvObj?.whatsapp_prepared ? 'WA Ready' : 'WA Pending'}
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* Dropdown for any other vendor */}
                      <div className="pt-2">
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                          Or select any registered vendor:
                        </label>
                        <select
                          value={selectedWinnerVendorId}
                          onChange={(e) => setSelectedWinnerVendorId(e.target.value)}
                          className="w-full sm:w-80 px-3 py-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500 cursor-pointer"
                        >
                          <option value="">-- Select Winner from Directory --</option>
                          {allVendors.map((v) => (
                            <option key={v.id} value={v.id}>
                              {v.company_name} ({v.contact_person})
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Section 2: Line-Item Unit Price Negotiation Table */}
                    <div className="space-y-3 pt-4 border-t border-slate-200 dark:border-slate-800">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                          <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-900 dark:text-slate-100 flex items-center space-x-2">
                            <Calculator className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                            <span>2. Enter Agreed Unit Prices for Line Items ({lineItems.length})</span>
                          </h4>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400">
                            Enter the negotiated price per unit. Total PO amount is automatically calculated from item pricing.
                          </p>
                        </div>

                        {/* Live Total Badge */}
                        <div className="bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-700/80 px-4 py-2 rounded-xl text-right shrink-0">
                          <span className="text-[10px] uppercase font-bold text-emerald-800 dark:text-emerald-300 block">
                            Calculated Final PO Amount:
                          </span>
                          <span className="text-base font-black text-emerald-700 dark:text-emerald-400 font-mono">
                            ₹{calculatedItemsTotal.toLocaleString('en-IN')}
                          </span>
                        </div>
                      </div>

                      <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827]">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-slate-50 dark:bg-[#0d1322] border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-semibold text-[11px]">
                            <tr>
                              <th className="px-3.5 py-2.5 w-10 text-center">#</th>
                              <th className="px-3.5 py-2.5">Item Description & Specs</th>
                              <th className="px-3.5 py-2.5 text-center w-20">Qty</th>
                              <th className="px-3.5 py-2.5 text-right w-28">Est. Unit (₹)</th>
                              <th className="px-3.5 py-2.5 text-right w-44">Agreed Unit Price (₹)</th>
                              <th className="px-3.5 py-2.5 text-right w-36">Line Total (₹)</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                            {lineItems.map((item, idx) => {
                              const qty = Number(item.quantity) || 1;
                              const currentVal = itemPrices[item.id] !== undefined ? itemPrices[item.id] : '';
                              const numericPrice = Number(currentVal) || 0;
                              const lineTotal = numericPrice * qty;

                              return (
                                <tr key={item.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                                  <td className="px-3.5 py-2.5 text-center text-slate-400 font-mono text-[11px]">
                                    {idx + 1}
                                  </td>
                                  <td className="px-3.5 py-2.5">
                                    <div className="font-bold text-slate-900 dark:text-slate-100">
                                      {item.product_item}
                                    </div>
                                    {item.specifications && (
                                      <div className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5">
                                        {item.specifications}
                                      </div>
                                    )}
                                  </td>
                                  <td className="px-3.5 py-2.5 text-center font-bold text-slate-800 dark:text-slate-200">
                                    {qty}
                                  </td>
                                  <td className="px-3.5 py-2.5 text-right font-mono text-slate-400 text-[11px]">
                                    {item.unit_price_estimate != null ? `₹${Number(item.unit_price_estimate).toLocaleString('en-IN')}` : '—'}
                                  </td>
                                  <td className="px-3.5 py-2.5 text-right">
                                    <div className="relative inline-block w-full max-w-[150px]">
                                      <IndianRupee className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                                      <input
                                        type="number"
                                        min="0"
                                        step="any"
                                        placeholder="Unit Price"
                                        value={currentVal}
                                        onChange={(e) => handleItemPriceChange(item.id, e.target.value)}
                                        className="w-full pl-7 pr-2 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold text-right text-slate-900 dark:text-slate-100 focus:outline-none focus:border-emerald-500 focus:bg-white dark:focus:bg-slate-950 font-mono"
                                      />
                                    </div>
                                  </td>
                                  <td className="px-3.5 py-2.5 text-right font-mono font-black text-emerald-700 dark:text-emerald-400">
                                    ₹{lineTotal.toLocaleString('en-IN')}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                          <tfoot className="bg-slate-50/80 dark:bg-slate-900/80 border-t border-slate-200 dark:border-slate-800">
                            <tr>
                              <td colSpan={5} className="px-3.5 py-3 text-right font-extrabold text-slate-700 dark:text-slate-300 uppercase tracking-wider text-xs">
                                Grand Total (Calculated PO Value):
                              </td>
                              <td className="px-3.5 py-3 text-right font-mono font-black text-emerald-700 dark:text-emerald-400 text-sm">
                                ₹{calculatedItemsTotal.toLocaleString('en-IN')}
                              </td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    </div>

                    {/* Section 3: Closure Notes */}
                    <div className="space-y-2 pt-4 border-t border-slate-200 dark:border-slate-800">
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                        3. Closure Notes & Negotiation Terms
                      </label>
                      <textarea
                        rows={3}
                        placeholder="e.g. Vendor agreed to 30-day credit, 7-day delivery timeline, and 1-year standard OEM warranty..."
                        value={closureNotes}
                        onChange={(e) => setClosureNotes(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-medium text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500 leading-relaxed"
                      />
                    </div>

                    {/* Section 4: Award Submit Button */}
                    <div className="pt-2">
                      <button
                        type="button"
                        onClick={handleCloseRfqWin}
                        disabled={closeLoading || !selectedWinnerVendorId}
                        className="w-full py-3.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-extrabold text-xs shadow-lg shadow-amber-500/30 flex items-center justify-center space-x-2 disabled:opacity-50 transition-all hover:scale-[1.005] active:scale-[0.995] cursor-pointer"
                      >
                        {closeLoading ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Trophy className="w-4 h-4" />
                        )}
                        <span>🏆 Close RFQ & Award Purchase Order (₹{calculatedItemsTotal.toLocaleString('en-IN')})</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* FLOW B: LOST PATHWAY */}
                {closureOutcome === 'lost' && (
                  <div className="space-y-6 pt-2">
                    <div className="space-y-4 bg-rose-50/40 dark:bg-rose-950/20 p-5 rounded-2xl border border-rose-200/80 dark:border-rose-900/60">
                      <div>
                        <h4 className="text-xs font-extrabold uppercase tracking-wider text-rose-900 dark:text-rose-300 flex items-center space-x-2">
                          <XCircle className="w-4 h-4 text-rose-600" />
                          <span>1. Primary Reason for RFQ Loss</span>
                        </h4>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                          Capture structured loss intelligence to improve vendor sourcing and pricing accuracy.
                        </p>
                      </div>

                      <div className="space-y-3">
                        <select
                          value={lossReason}
                          onChange={(e) => setLossReason(e.target.value)}
                          className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-950 border border-rose-200 dark:border-rose-900/80 rounded-xl text-xs font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:border-rose-500 cursor-pointer"
                        >
                          <option value="Client dropped / cancelled requirement">Client dropped / cancelled requirement</option>
                          <option value="Price too high / outside client budget">Price too high / outside client budget</option>
                          <option value="Lost to competitor / alternative vendor">Lost to competitor / alternative vendor</option>
                          <option value="Delivery timeline too long">Delivery timeline too long</option>
                          <option value="Technical specifications could not be met">Technical specifications could not be met</option>
                          <option value="Vendor unable to supply requested quantity">Vendor unable to supply requested quantity</option>
                          <option value="Other">Other (Custom reason)</option>
                        </select>

                        {lossReason === 'Other' && (
                          <input
                            type="text"
                            placeholder="Specify custom loss reason..."
                            value={customLossReason}
                            onChange={(e) => setCustomLossReason(e.target.value)}
                            className="w-full px-3.5 py-2 bg-white dark:bg-slate-950 border border-rose-200 dark:border-rose-900/80 rounded-xl text-xs font-medium text-slate-900 dark:text-slate-100 focus:outline-none focus:border-rose-500"
                          />
                        )}
                      </div>

                      <div className="space-y-2 pt-2 border-t border-rose-200/60 dark:border-rose-900/40">
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                          2. Loss Context & Notes
                        </label>
                        <textarea
                          rows={3}
                          placeholder="Provide details on client feedback, competitor pricing if known, or internal learnings..."
                          value={closureNotes}
                          onChange={(e) => setClosureNotes(e.target.value)}
                          className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-rose-200 dark:border-rose-900/80 rounded-xl text-xs font-medium text-slate-900 dark:text-slate-100 focus:outline-none focus:border-rose-500 leading-relaxed"
                        />
                      </div>

                      {/* Lost Submit Button */}
                      <button
                        type="button"
                        onClick={handleCloseRfqLost}
                        disabled={closeLoading}
                        className="w-full py-3.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-extrabold text-xs shadow-lg shadow-rose-600/30 flex items-center justify-center space-x-2 disabled:opacity-50 transition-all hover:scale-[1.005] active:scale-[0.995] cursor-pointer"
                      >
                        {closeLoading ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <XCircle className="w-4 h-4" />
                        )}
                        <span>❌ Close RFQ as Lost</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
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

